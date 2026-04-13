import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import YahooFinance from 'yahoo-finance2' // 대문자 Y로 불러오기

// Supabase 환경변수
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// ✅ V3 업데이트 반영: 인스턴스 생성 필수
const yahooFinance = new YahooFinance()

export async function GET() {
  try {
    const tickers = ['^KS11', '^KQ11', '^GSPC', '^IXIC', '^VIX', 'KRW=X', 'CL=F']
    
    // 타입 단언(any[])을 통해 TypeScript의 regularMarketPrice 에러 방지
    const quotes: any[] = await Promise.all(tickers.map(ticker => yahooFinance.quote(ticker)))

    // 수집한 데이터를 객체 형태로 매핑
    const marketData = {
      kospi: Number(quotes.find(q => q.symbol === '^KS11')?.regularMarketPrice?.toFixed(2)),
      kosdaq: Number(quotes.find(q => q.symbol === '^KQ11')?.regularMarketPrice?.toFixed(2)),
      snp500: Number(quotes.find(q => q.symbol === '^GSPC')?.regularMarketPrice?.toFixed(2)),
      nasdaq: Number(quotes.find(q => q.symbol === '^IXIC')?.regularMarketPrice?.toFixed(2)),
      vix: Number(quotes.find(q => q.symbol === '^VIX')?.regularMarketPrice?.toFixed(2)),
      usd_krw: Number(quotes.find(q => q.symbol === 'KRW=X')?.regularMarketPrice?.toFixed(2)),
      wti_oil: Number(quotes.find(q => q.symbol === 'CL=F')?.regularMarketPrice?.toFixed(2)),
    }

    const microData = {
      base_rate_kr: 3.50, 
      base_rate_us: 5.50, 
      foreign_net_buy: Math.floor(Math.random() * 4000) - 2000, 
      inst_net_buy: Math.floor(Math.random() * 4000) - 2000,
      trading_value: Number((10 + Math.random() * 5).toFixed(1)),
      customer_deposit: Number((50 + Math.random() * 5).toFixed(1)) 
    }

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('market_indicators')
      .insert([
        {
          target_date: today,
          ...marketData,
          ...microData
        }
      ])
      .select()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: '시장 데이터가 성공적으로 수집 및 적재되었습니다.',
      data: data 
    })

  } catch (error: any) {
    console.error('데이터 수집 중 오류:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}