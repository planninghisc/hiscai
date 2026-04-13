'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../utils/supabase/client'
import { fillWeekends } from '../../../utils/fillWeekends'
import {
  Bars3Icon, XMarkIcon, SparklesIcon, ArrowPathIcon
} from '@heroicons/react/24/outline'
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'

interface MarketIndicator {
  target_date:     string
  kospi:           number
  kosdaq:          number
  foreign_net_buy: number
  inst_net_buy:    number
  trading_value:   number
  customer_deposit:number
  vix:             number
  usd_krw:         number
  base_rate_kr:    number
  base_rate_us:    number
  wti_oil:         number
  snp500:          number
  nasdaq:          number
}

const CustomTooltip = ({ active, payload, label, unit = '' }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {Number(entry.value)?.toLocaleString()}{unit}
        </p>
      ))}
    </div>
  )
}

const fmtDate = (d: string) => {
  const date = new Date(d + 'T00:00:00')
  const day = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  return isWeekend
    ? `${date.getMonth() + 1}/${date.getDate()}(${day})`
    : `${date.getMonth() + 1}/${date.getDate()}`
}

export default function MarketAnalysisPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [report, setReport]           = useState<string>('')
  const [isLoading, setIsLoading]     = useState(false)
  const [latestData, setLatestData]   = useState<MarketIndicator | null>(null)
  const [chartData, setChartData]     = useState<(MarketIndicator & { date: string })[]>([])
  const [activeChart, setActiveChart] = useState<'index' | 'supply' | 'trading'>('index')

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    const { data: latest } = await supabase
      .from('market_indicators')
      .select('*')
      .order('target_date', { ascending: false })
      .limit(1)
      .single()
    if (latest) setLatestData(latest)

    const { data: history } = await supabase
      .from('market_indicators')
      .select('target_date, kospi, kosdaq, foreign_net_buy, inst_net_buy, trading_value, customer_deposit, vix, usd_krw, base_rate_kr, base_rate_us, wti_oil, snp500, nasdaq')
      .order('target_date', { ascending: true })
      .limit(44)

    if (history) {
      const filled = fillWeekends(history as MarketIndicator[])
      const sliced = filled.slice(-30)
      setChartData(sliced.map(d => ({ ...d, date: fmtDate(d.target_date) })))
    }

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
      const res  = await fetch('/api/market/analyze', { method: 'POST' })
      const data = await res.json()
      if (data.success) setReport(data.report)
      else alert(data.error)
    } catch {
      alert('분석 요청 중 네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
      fetchAllData()
    }
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col md:flex-row relative">

      {/* 모바일 헤더 */}
      <div className="md:hidden flex items-center justify-between bg-white px-6 py-4 border-b border-gray-200 relative z-20">
        <h1 className="font-anchangho text-2xl text-[#ea580c]">FilterWise</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
          {isMobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      {/* 사이드바 */}
      <aside className={`${isMobileMenuOpen ? 'absolute top-[69px] left-0 w-full z-50 shadow-xl' : 'hidden'} md:static md:flex flex-col md:w-64 md:h-screen md:border-r border-gray-200 bg-white p-6 shrink-0`}>
        <h1 className="hidden md:block font-anchangho text-3xl text-[#ea580c] mb-10">FilterWise</h1>
        <nav className="flex-1 space-y-2">
          <a href="/dashboard"        className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">대시보드 홈</a>
          <a href="/dashboard/board"  className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">자유 게시판</a>
          <a href="#"                 className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">경쟁사 비교 (XBRL)</a>
          <a href="/dashboard/market" className="block px-4 py-3 rounded-xl bg-orange-50 text-[#ea580c] font-bold transition-colors">시장 정보 분석</a>
        </nav>
      </aside>

      {/* 메인 */}
      <main className="flex-1 p-6 md:p-10 relative z-10 overflow-y-auto">

        {/* 헤더 */}
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">AI 시장 정보 분석</h2>
            <p className="text-sm text-gray-500 mt-1.5 font-medium">최신 시장 지표 및 Gemini 심층 보고서</p>
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

        {/* 섹션 1: 지표 패널 + AI 리포트 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          <div className="lg:col-span-1 flex flex-col gap-4">
            {latestData ? (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">거시적 지표 (Macro)</h3>
                  <ul className="space-y-2.5 text-sm text-gray-600">
                    <li className="flex justify-between"><span>KOSPI / KOSDAQ</span><span className="font-semibold">{latestData.kospi?.toLocaleString()} / {latestData.kosdaq?.toLocaleString()}</span></li>
                    <li className="flex justify-between"><span>S&P 500 / NASDAQ</span><span className="font-semibold">{latestData.snp500?.toLocaleString()} / {latestData.nasdaq?.toLocaleString()}</span></li>
                    <li className="flex justify-between"><span>VIX (공포지수)</span><span className="font-semibold text-blue-600">{latestData.vix}</span></li>
                    <li className="flex justify-between"><span>원/달러 환율</span><span className="font-semibold">{latestData.usd_krw?.toLocaleString()} 원</span></li>
                    <li className="flex justify-between"><span>한/미 기준금리</span><span className="font-semibold">{latestData.base_rate_kr}% / {latestData.base_rate_us}%</span></li>
                    <li className="flex justify-between"><span>WTI 원유</span><span className="font-semibold">{latestData.wti_oil} $</span></li>
                  </ul>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">증권업 특화 수급 지표</h3>
                  <ul className="space-y-2.5 text-sm text-gray-600">
                    <li className="flex justify-between">
                      <span>외국인 순매수</span>
                      <span className={`font-semibold ${latestData.foreign_net_buy > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        {latestData.foreign_net_buy > 0 ? '+' : ''}{latestData.foreign_net_buy?.toLocaleString()} 억원
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>기관 순매수</span>
                      <span className={`font-semibold ${latestData.inst_net_buy > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        {latestData.inst_net_buy > 0 ? '+' : ''}{latestData.inst_net_buy?.toLocaleString()} 억원
                      </span>
                    </li>
                    <li className="flex justify-between"><span>일평균 거래대금</span><span className="font-semibold">{latestData.trading_value} 조원</span></li>
                    <li className="flex justify-between"><span>고객 예탁금</span><span className="font-semibold">{latestData.customer_deposit} 조원</span></li>
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

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[400px]">
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

        {/* 섹션 2: 차트 3종 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-gray-800">시장 데이터 추이 (최근 30일)</h3>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {([
                { key: 'index',   label: '지수 추이' },
                { key: 'supply',  label: '수급 흐름' },
                { key: 'trading', label: '거래대금' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveChart(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    activeChart === tab.key
                      ? 'bg-white text-[#ea580c] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              차트 데이터가 없습니다.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              {activeChart === 'index' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis yAxisId="kospi"  orientation="left"  tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={v => v.toLocaleString()} />
                  <YAxis yAxisId="kosdaq" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={v => v.toLocaleString()} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                  <Line yAxisId="kospi"  type="monotone" dataKey="kospi"  name="KOSPI"  stroke="#ea580c" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line yAxisId="kosdaq" type="monotone" dataKey="kosdaq" name="KOSDAQ" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
                </LineChart>
              ) : activeChart === 'supply' ? (
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={v => `${Math.round(v / 100)}백억`} />
                  <Tooltip content={<CustomTooltip unit="억원" />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                  <Bar dataKey="foreign_net_buy" name="외국인 순매수" fill="#ea580c" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="inst_net_buy"    name="기관 순매수"   fill="#fed7aa" radius={[3, 3, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorTrading" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ea580c" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDeposit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis yAxisId="trading" orientation="left"  tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}조`} />
                  <YAxis yAxisId="deposit" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}조`} />
                  <Tooltip content={<CustomTooltip unit="조원" />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                  <Area yAxisId="trading" type="monotone" dataKey="trading_value"    name="일평균 거래대금" stroke="#ea580c" strokeWidth={2} fill="url(#colorTrading)" dot={false} />
                  <Area yAxisId="deposit" type="monotone" dataKey="customer_deposit" name="고객 예탁금"     stroke="#f97316" strokeWidth={2} fill="url(#colorDeposit)" dot={false} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

      </main>
    </div>
  )
}