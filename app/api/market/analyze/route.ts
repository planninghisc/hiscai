import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST() {
  try {
    const { data: marketData, error: dbError } = await supabase
      .from('market_indicators')
      .select('*')
      .order('target_date', { ascending: false })
      .limit(1)
      .single()

    if (dbError || !marketData) {
      return NextResponse.json({ error: '시장 데이터를 불러오지 못했습니다.' }, { status: 500 })
    }

    // Gemini에게 보낼 프롬프트 (모든 지표 포함)
    const prompt = `
      당신은 한화투자증권의 시니어 애널리스트입니다. 아래 제공된 오늘자 시장 데이터를 종합하여, 
      1) 글로벌 매크로 환경 및 국내 증시 방향성
      2) 수급 및 거래대금 기반의 증권업종(특히 한화투자증권 등 브로커리지/IB) 업황 전망
      3) 단기 리스크 요인 및 투자 전략
      위 3가지를 중심으로 전문가 수준의 시장 분석 보고서를 3단락으로 작성해 주십시오. 마크다운을 사용하여 가독성을 높여주세요.

      [시장 데이터 (기준일: ${marketData.target_date})]
      * 거시 경제 지표:
      - KOSPI: ${marketData.kospi} pt / KOSDAQ: ${marketData.kosdaq} pt
      - S&P 500: ${marketData.snp500} pt / NASDAQ: ${marketData.nasdaq} pt
      - VIX(공포지수): ${marketData.vix}
      - 원/달러 환율: ${marketData.usd_krw} 원
      - 한/미 기준금리: 한국 ${marketData.base_rate_kr}% / 미국 ${marketData.base_rate_us}%
      - WTI 원유: ${marketData.wti_oil} 달러

      * 수급 및 증권업 핵심 지표:
      - KOSPI 외국인 순매수: ${marketData.foreign_net_buy} 억원
      - KOSPI 기관 순매수: ${marketData.inst_net_buy} 억원
      - 일평균 거래대금: ${marketData.trading_value} 조원
      - 고객 예탁금: ${marketData.customer_deposit} 조원
    `

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    const geminiData = await geminiRes.json()
    const reportContent = geminiData.candidates[0].content.parts[0].text

    await supabase.from('ai_market_reports').insert([
      { report_date: marketData.target_date, content: reportContent }
    ])

    return NextResponse.json({ success: true, report: reportContent })

  } catch (error: any) {
    console.error('AI 분석 중 오류:', error)
    return NextResponse.json({ error: 'AI 분석 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}