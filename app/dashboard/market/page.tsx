'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../utils/supabase/client'
import { Bars3Icon, XMarkIcon, SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function MarketAnalysisPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [report, setReport] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [latestData, setLatestData] = useState<any>(null)

  useEffect(() => {
    fetchLatestInfo()
  }, [])

  const fetchLatestInfo = async () => {
    const { data: indicators } = await supabase
      .from('market_indicators')
      .select('*')
      .order('target_date', { ascending: false })
      .limit(1)
      .single()
    if (indicators) setLatestData(indicators)

    const { data: reports } = await supabase
      .from('ai_market_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (reports) setReport(reports.content)
  }

  const handleGenerateReport = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/analyze', { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        setReport(data.report)
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('분석 요청 중 네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
      fetchLatestInfo()
    }
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col md:flex-row relative">
      
      <div className="md:hidden flex items-center justify-between bg-white px-6 py-4 border-b border-gray-200 relative z-20">
        <h1 className="font-anchangho text-2xl text-[#ea580c]">FilterWise</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
          {isMobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      <aside className={`${isMobileMenuOpen ? 'absolute top-[69px] left-0 w-full z-50 shadow-xl' : 'hidden'} md:static md:flex flex-col md:w-64 md:h-screen md:border-r border-gray-200 bg-white p-6 shrink-0`}>
        <h1 className="hidden md:block font-anchangho text-3xl text-[#ea580c] mb-10">FilterWise</h1>
        <nav className="flex-1 space-y-2">
          <a href="/dashboard" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">대시보드 홈</a>
          <a href="/dashboard/board" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">자유 게시판</a>
          <a href="#" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">경쟁사 비교 (XBRL)</a>
          <a href="/dashboard/market" className="block px-4 py-3 rounded-xl bg-orange-50 text-[#ea580c] font-bold transition-colors">시장 정보 분석</a>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-10 relative z-10 overflow-y-auto">
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">AI 시장 정보 분석</h2>
            <p className="text-sm text-gray-500 mt-1.5 font-medium">최신 시장 지표를 기반으로 Gemini가 생성한 심층 보고서입니다.</p>
          </div>
          <button 
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-[#ea580c] hover:bg-orange-700 disabled:bg-gray-400 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap"
          >
            {isLoading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
            {isLoading ? 'AI가 분석 중입니다...' : '최신 데이터로 AI 분석 실행'}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 수집된 원본 데이터 요약 패널 (카테고리 분리) */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {latestData ? (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">거시적 지표 (Macro)</h3>
                  <ul className="space-y-2.5 text-sm text-gray-600">
                    <li className="flex justify-between"><span>KOSPI / KOSDAQ</span> <span className="font-semibold">{latestData.kospi} / {latestData.kosdaq}</span></li>
                    <li className="flex justify-between"><span>S&P 500 / NASDAQ</span> <span className="font-semibold">{latestData.snp500} / {latestData.nasdaq}</span></li>
                    <li className="flex justify-between"><span>VIX (공포지수)</span> <span className="font-semibold text-blue-600">{latestData.vix}</span></li>
                    <li className="flex justify-between"><span>원/달러 환율</span> <span className="font-semibold">{latestData.usd_krw} 원</span></li>
                    <li className="flex justify-between"><span>한/미 기준금리</span> <span className="font-semibold">{latestData.base_rate_kr}% / {latestData.base_rate_us}%</span></li>
                    <li className="flex justify-between"><span>WTI 원유</span> <span className="font-semibold">{latestData.wti_oil} $</span></li>
                  </ul>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">증권업 특화 수급 지표 (Micro)</h3>
                  <ul className="space-y-2.5 text-sm text-gray-600">
                    <li className="flex justify-between"><span>외국인 순매수</span> <span className={`font-semibold ${latestData.foreign_net_buy > 0 ? 'text-red-500' : 'text-blue-500'}`}>{latestData.foreign_net_buy} 억원</span></li>
                    <li className="flex justify-between"><span>기관 순매수</span> <span className={`font-semibold ${latestData.inst_net_buy > 0 ? 'text-red-500' : 'text-blue-500'}`}>{latestData.inst_net_buy} 억원</span></li>
                    <li className="flex justify-between"><span>일평균 거래대금</span> <span className="font-semibold">{latestData.trading_value} 조원</span></li>
                    <li className="flex justify-between"><span>고객 예탁금</span> <span className="font-semibold">{latestData.customer_deposit} 조원</span></li>
                  </ul>
                  <div className="mt-4 text-xs text-gray-400 text-right">기준일: {latestData.target_date}</div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-sm text-gray-400 text-center py-10">
                적재된 데이터가 없습니다.
              </div>
            )}
          </div>

          {/* 우측: 생성된 리포트 출력 패널 */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[500px]">
             <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
               <SparklesIcon className="w-5 h-5 text-[#ea580c]" /> Gemini 인사이트
             </h3>
             
             {report ? (
                <div className="prose prose-sm md:prose-base prose-orange max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {report}
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3 py-20">
                  <SparklesIcon className="w-12 h-12 text-gray-200" />
                  <p>상단의 버튼을 눌러 AI 분석을 시작해 보세요.</p>
                </div>
             )}
          </div>
        </div>
      </main>
    </div>
  )
}