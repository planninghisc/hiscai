'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../utils/supabase/client'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

// 불러올 시장 데이터의 타입 정의
interface MarketData {
  price: string;
  change: string;
  rate: string;
  direction: string;
}

export default function DashboardPage() {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // 날짜/시간 및 시장 데이터 상태 관리
  const [timeData, setTimeData] = useState({ date: '', time: '' })
  const [marketInfo, setMarketInfo] = useState<{
    kospi: MarketData | null;
    kosdaq: MarketData | null;
    hanwha: MarketData | null;
  }>({ kospi: null, kosdaq: null, hanwha: null })

  // 1. 시간 업데이트 설정
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const dayName = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(now)
      const formattedDate = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${dayName})`
      const formattedTime = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      })
      setTimeData({ date: formattedDate, time: formattedTime })
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. 실시간 금융 데이터 불러오기
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const res = await fetch('/api/market')
        const data = await res.json()
        setMarketInfo(data)
      } catch (error) {
        console.error('시장 데이터를 불러오는 중 오류 발생:', error)
      }
    }
    
    fetchMarketData() // 마운트 시 즉시 호출
    // 필요하다면 아래 주석을 풀어서 1분마다 자동 갱신되게 할 수 있습니다.
    const marketTimer = setInterval(fetchMarketData, 30000)
    return () => clearInterval(marketTimer)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // 지수 컴포넌트 렌더링을 돕는 유틸리티 함수
  const renderMarketWidget = (title: string, data: MarketData | null, unit: string = '', colSpanClass: string) => {
    if (!data) {
      return (
        <div className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center animate-pulse ${colSpanClass} text-left`}>
          <div className="h-4 bg-gray-200 rounded w-16 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      );
    }

    const isUp = data.direction === '2';
    const isDown = data.direction === '5';
    // 2: 상승(빨강), 5: 하락(파랑), 3: 보합(회색)
    const colorClass = isUp ? 'text-[#ff4b4b]' : isDown ? 'text-[#007bff]' : 'text-gray-500';
    const arrow = isUp ? '▲' : isDown ? '▼' : '-';

    return (
      <div className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center hover:shadow-md transition-shadow ${colSpanClass} text-left`}>
        <span className="text-xs text-gray-400 font-semibold mb-2 tracking-wider">{title}</span>
        <div className="flex flex-col gap-0.5">
          <span className={`font-bold ${colorClass} text-lg md:text-xl leading-none`}>
            {data.price}{unit}
          </span>
          <span className={`text-xs ${colorClass} font-medium`}>
            {arrow} {data.change} ({data.rate}%)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col md:flex-row relative">
      
      {/* 1. 모바일 전용 상단 헤더 */}
      <div className="md:hidden flex items-center justify-between bg-white px-6 py-4 border-b border-gray-200 relative z-20">
        <h1 className="font-anchangho text-2xl text-[#ea580c]">FilterWise</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 focus:outline-none"
        >
          {isMobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      {/* 2. 좌측 사이드바 메뉴 */}
      <aside className={`
        ${isMobileMenuOpen ? 'absolute top-[69px] left-0 w-full z-50 shadow-xl' : 'hidden'} 
        md:static md:flex flex-col md:w-64 md:h-screen md:border-r border-gray-200 bg-white p-6 shrink-0 transition-all
      `}>
        <h1 className="hidden md:block font-anchangho text-3xl text-[#ea580c] mb-10">FilterWise</h1>
        <nav className="flex-1 space-y-2">
          <a href="#" className="block px-4 py-3 rounded-xl bg-orange-50 text-[#ea580c] font-bold transition-colors">대시보드 홈</a>
          <a href="#" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">경쟁사 비교 (XBRL)</a>
          <a href="#" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">시장 정보 분석</a>
          <a href="#" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">한화투자증권 정보</a>
        </nav>
        <button onClick={handleLogout} className="mt-8 md:mt-auto px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-800 text-left transition-colors">
          로그아웃
        </button>
      </aside>

      {/* 3. 우측 메인 콘텐츠 영역 */}
      <main className="flex-1 p-6 md:p-10 relative z-10">
        
        {/* 헤더 */}
        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-2">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">대시보드 홈</h2>
            <p className="text-sm text-gray-500 mt-1.5 font-medium tracking-tight">
              한화투자증권 디지털 혁신 AI 경진대회
            </p>
          </div>
          <div className="hidden md:block text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
            환영합니다!
          </div>
        </header>

        {/* --- 상단 지수 및 데이터 박스 그리드 --- */}
        <div className="mb-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 시간 박스 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center hover:shadow-md transition-shadow col-span-2 lg:col-span-1 text-left relative">
            <span className="absolute top-5 right-5 text-xs text-orange-500 font-semibold bg-orange-50 px-3 py-1 rounded-full shadow-sm border border-orange-100">Now</span>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400 font-semibold tracking-wider">오늘</span>
            </div>
            <span className="text-xs md:text-sm font-medium text-black mb-1.5 tracking-tight">
              {timeData.date || '날짜 로딩중...'}
            </span>
            <span className="font-black text-3xl md:text-4xl text-black leading-none tracking-tighter">
              {timeData.time || '00:00:00'}
            </span>
          </div>

          {/* 실시간 시장 위젯 렌더링 */}
          {renderMarketWidget('KOSPI', marketInfo.kospi, '', 'col-span-1 lg:col-span-1')}
          {renderMarketWidget('KOSDAQ', marketInfo.kosdaq, '', 'col-span-1 lg:col-span-1')}
          {renderMarketWidget('한화투자증권', marketInfo.hanwha, '원', 'col-span-2 lg:col-span-1')}

        </div>
        
        {/* 요약 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-left">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-bold text-gray-800 mb-2">XBRL 분석 요약</h3>
            <p className="text-gray-500 text-sm leading-relaxed">최근 수집된 경쟁사 재무 데이터 비교 현황입니다.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-bold text-gray-800 mb-2">AI 시장 보고서</h3>
            <p className="text-gray-500 text-sm leading-relaxed">정성적/정량적 데이터 기반 최신 요약본입니다.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-bold text-gray-800 mb-2">오늘의 주요 뉴스</h3>
            <p className="text-gray-500 text-sm leading-relaxed">주식 커뮤니티 및 언론의 한화투자증권 동향입니다.</p>
          </div>
        </div>
      </main>
    </div>
  )
}