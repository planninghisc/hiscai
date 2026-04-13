import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function validateCronSecret(req: Request) {
  return req.headers.get('x-cron-secret') === process.env.CRON_SECRET
}

function getWeekdays(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cur = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate   + 'T00:00:00')
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) {
      dates.push(cur.toISOString().split('T')[0])
    }
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 10000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchYahooRange(symbol: string, from: string, to: string): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    const fromTs = Math.floor(new Date(from + 'T00:00:00Z').getTime() / 1000)
    const toTs   = Math.floor(new Date(to   + 'T23:59:59Z').getTime() / 1000)
    const url    = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${fromTs}&period2=${toTs}`
    const res    = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 10000)
    const data   = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) {
      console.log(`야후 ${symbol}: 결과 없음`)
      return map
    }
    const timestamps: number[] = result.timestamp ?? []
    const closes: number[]     = result.indicators?.quote?.[0]?.close ?? []

    // 야후는 UTC 기준 타임스탬프 → KST 날짜로 변환 필요
    timestamps.forEach((ts, i) => {
      if (closes[i] != null) {
        // KST = UTC+9 → 타임스탬프에 9시간 더해서 날짜 추출
        const kstDate = new Date((ts + 9 * 3600) * 1000)
        const d = kstDate.toISOString().split('T')[0]
        map.set(d, Math.round(closes[i] * 100) / 100)
      }
    })
    console.log(`야후 ${symbol}: ${map.size}개 수집, 샘플: ${JSON.stringify([...map.entries()].slice(0, 2))}`)
  } catch (e) {
    console.error(`야후 ${symbol} 오류:`, e)
  }
  return map
}

export async function POST(req: Request) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body      = await req.json().catch(() => ({}))
    const kst       = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const todayStr  = kst.toISOString().split('T')[0]
    const startDate = body.start ?? new Date(kst.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate   = body.end   ?? todayStr

    console.log(`백필 시작: ${startDate} ~ ${endDate}`)

    const dates = getWeekdays(startDate, endDate)
    console.log(`평일 날짜 수: ${dates.length}개`)
    console.log(`날짜 샘플:`, dates.slice(0, 3), '...', dates.slice(-3))

    // 야후에서 전부 수집 (네이버 대신 ^KS11, ^KQ11 사용)
    const [kospiMap, kosdaqMap, fxMap, snpMap, nasdaqMap, wtiMap, vixMap] = await Promise.all([
      fetchYahooRange('^KS11',  startDate, endDate),  // KOSPI
      fetchYahooRange('^KQ11',  startDate, endDate),  // KOSDAQ
      fetchYahooRange('KRW=X',  startDate, endDate),  // 환율
      fetchYahooRange('^GSPC',  startDate, endDate),  // S&P500
      fetchYahooRange('^IXIC',  startDate, endDate),  // NASDAQ
      fetchYahooRange('CL=F',   startDate, endDate),  // WTI
      fetchYahooRange('^VIX',   startDate, endDate),  // VIX
    ])

    // 날짜 매칭 디버깅
    console.log(`KOSPI 샘플 날짜:`, [...kospiMap.keys()].slice(0, 3))
    console.log(`S&P500 샘플 날짜:`, [...snpMap.keys()].slice(0, 3))
    console.log(`dates 샘플:`, dates.slice(0, 3))

    // 필터: dates 기준으로 하나라도 데이터 있으면 포함
    const records = dates
      .filter(d => snpMap.has(d) || kospiMap.has(d) || nasdaqMap.has(d))
      .map(d => ({
        target_date: d,
        kospi:           kospiMap.get(d)  ?? 0,
        kosdaq:          kosdaqMap.get(d) ?? 0,
        usd_krw:         fxMap.get(d)     ?? 0,
        snp500:          snpMap.get(d)    ?? 0,
        nasdaq:          nasdaqMap.get(d) ?? 0,
        wti_oil:         wtiMap.get(d)    ?? 0,
        vix:             vixMap.get(d)    ?? 0,
      }))

    console.log(`upsert 대상: ${records.length}개`)
    if (records.length > 0) {
      console.log(`첫 번째 레코드:`, records[0])
    }

    let upserted = 0
    for (let i = 0; i < records.length; i += 20) {
      const chunk = records.slice(i, i + 20)
      const { error } = await supabase
        .from('market_indicators')
        .upsert(chunk, { onConflict: 'target_date' })
      if (error) {
        console.error(`청크 ${i}~${i + 20} 오류:`, error.message)
      } else {
        upserted += chunk.length
        console.log(`청크 ${i}~${i + chunk.length} 완료`)
      }
    }

    return NextResponse.json({
      success:  true,
      range:    `${startDate} ~ ${endDate}`,
      total:    dates.length,
      upserted,
      missing:  dates.length - records.length,
    })

  } catch (error: any) {
    console.error('백필 오류:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  const envCheck = {
    supabaseUrl:        !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    cronSecret:         !!process.env.CRON_SECRET,
  }

  let naverTest = null
  try {
    const res  = await fetch('https://m.stock.naver.com/api/index/KOSPI/price?pageIndex=1&pageSize=3')
    const data = await res.json()
    naverTest  = JSON.stringify(data).slice(0, 300)
  } catch (e: any) {
    naverTest = `오류: ${e.message}`
  }

  let yahooKospiTest = null
  try {
    const res  = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EKS11?interval=1d&range=5d', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const data   = await res.json()
    const ts     = data?.chart?.result?.[0]?.timestamp ?? []
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    const sample = ts.slice(0, 3).map((t: number, i: number) => ({
      utc:  new Date(t * 1000).toISOString().split('T')[0],
      kst:  new Date((t + 9 * 3600) * 1000).toISOString().split('T')[0],
      close: closes[i]
    }))
    yahooKospiTest = sample
  } catch (e: any) {
    yahooKospiTest = `오류: ${e.message}`
  }

  let supabaseTest = null
  try {
    const { data, error } = await supabase
      .from('market_indicators')
      .select('target_date')
      .order('target_date', { ascending: false })
      .limit(3)
    supabaseTest = error ? `오류: ${error.message}` : `최근 날짜: ${data?.map(d => d.target_date).join(', ')}`
  } catch (e: any) {
    supabaseTest = `오류: ${e.message}`
  }

  return NextResponse.json({ envCheck, naverTest, yahooKospiTest, supabaseTest })
}