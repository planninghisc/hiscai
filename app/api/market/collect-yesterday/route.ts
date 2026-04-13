import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function validateCronSecret(req: Request) {
  return req.headers.get('x-cron-secret') === process.env.CRON_SECRET
}

async function fetchNaverIndex(indexCode: string): Promise<number> {
  try {
    const res  = await fetch(
      `https://m.stock.naver.com/api/index/${indexCode}/price?pageIndex=1&pageSize=2`,
      { cache: 'no-store' }
    )
    const data  = await res.json()
    const items: any[] = Array.isArray(data) ? data : (data.result ?? [])
    const item  = items[1] ?? items[0]
    return parseFloat(String(item?.closePrice ?? '0').replace(/,/g, ''))
  } catch {
    return 0
  }
}

async function fetchNaverSupplyByDate(indexCode: string, targetDate: string): Promise<{ foreign: number; inst: number }> {
  try {
    const res  = await fetch(
      `https://m.stock.naver.com/api/index/${indexCode}/investorTrade?pageIndex=1&pageSize=5`,
      { cache: 'no-store' }
    )
    const data  = await res.json()
    console.log('수급 원본:', JSON.stringify(data).slice(0, 500))
    const items: any[] = Array.isArray(data) ? data : (data.result ?? [])
    const item  = items.find((d: any) =>
      (d.localTradedAt ?? d.date ?? '').startsWith(targetDate)
    ) ?? items[1] ?? items[0]
    const foreign = Number(item?.foreignNetBuy ?? item?.frgNetBuyAmt ?? 0)
    const inst    = Number(item?.orgNetBuy     ?? item?.orgNetBuyAmt  ?? 0)
    return { foreign, inst }
  } catch {
    return { foreign: 0, inst: 0 }
  }
}

async function fetchYahoo(symbol: string): Promise<number | null> {
  try {
    const res  = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`,
      {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    )
    const data   = await res.json()
    const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    const valid  = closes.filter((c: number) => c != null)
    return valid.length > 0 ? Math.round(valid[valid.length - 1] * 100) / 100 : null
  } catch {
    return null
  }
}

async function fetchFx(): Promise<number> {
  try {
    const res  = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/KRW%3DX?interval=1d&range=2d',
      {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    )
    const data   = await res.json()
    const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    const valid  = closes.filter((c: number) => c != null)
    return valid.length > 0 ? Math.round(valid[valid.length - 1] * 100) / 100 : 0
  } catch {
    return 0
  }
}

export async function POST(req: Request) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
    kst.setDate(kst.getDate() - 1)
    while (kst.getDay() === 0 || kst.getDay() === 6) {
      kst.setDate(kst.getDate() - 1)
    }
    const targetDate = kst.toISOString().split('T')[0]

    console.log(`전일 데이터 수집: ${targetDate}`)

    const [kospi, kosdaq, usd_krw, supply] = await Promise.all([
      fetchNaverIndex('KOSPI'),
      fetchNaverIndex('KOSDAQ'),
      fetchFx(),
      fetchNaverSupplyByDate('KOSPI', targetDate),
    ])

    const [snp500, nasdaq, wti_oil, vix] = await Promise.all([
      fetchYahoo('^GSPC'),
      fetchYahoo('^IXIC'),
      fetchYahoo('CL=F'),
      fetchYahoo('^VIX'),
    ])

    const payload = {
      target_date:     targetDate,
      kospi,
      kosdaq,
      usd_krw,
      foreign_net_buy: supply.foreign,
      inst_net_buy:    supply.inst,
      snp500:          snp500  ?? 0,
      nasdaq:          nasdaq  ?? 0,
      wti_oil:         wti_oil ?? 0,
      vix:             vix     ?? 0,
    }

    console.log('저장할 전일 데이터:', payload)

    const { error } = await supabase
      .from('market_indicators')
      .upsert(payload, { onConflict: 'target_date' })

    if (error) throw error

    return NextResponse.json({ success: true, date: targetDate, data: payload })

  } catch (error: any) {
    console.error('전일 데이터 수집 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}