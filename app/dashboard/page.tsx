'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../utils/supabase/client'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // 날짜와 시간을 상태로 관리합니다
  const [timeData, setTimeData] = useState({ date: '', time: '' })

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const dayName = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(now)
      const formattedDate = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${dayName})`
      const formattedTime = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })

      setTimeData({
        date: formattedDate,
        time: formattedTime
      })
    }
    
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
          {isMobileMenuOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* 2. 좌측 사이드바 메뉴 */}
      <aside className={`
        ${isMobileMenuOpen ? 'absolute top-[69px] left-0 w-full z-50 shadow-xl' : 'hidden'} 
        md:static md:flex flex-col md:w-64 md:h-screen md:border-r border-gray-200 bg-white p-6 shrink-0 transition-all
      `}>
        <h1 className="hidden md:block font-anchangho text-3xl text-[#ea580c] mb-10">FilterWise</h1>
        
        <nav className="flex-1 space-y-2">
          <a href="#" className="block px-4 py-3 rounded-xl bg-orange-50 text-[#ea580c] font-bold transition-colors">
            대시보드 홈
          </a>
          <a href="#" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            경쟁사 비교 (XBRL)
          </a>
          <a href="#" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            시장 정보 분석
          </a>
          <a href="#" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            한화투자증권 정보
          </a>
        </nav>

        <button 
          onClick={handleLogout} 
          className="mt-8 md:mt-auto px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-800 text-left transition-colors"
        >
          로그아웃
        </button>
      </aside>

      {/* 3. 우측 메인 콘텐츠 영역 */}
      <main className="flex-1 p-6 md:p-10 relative z-10">
        
        {/* 헤더: 타이틀 배치 */}
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
          
          {/* --- 시간 박스 --- */}
          {/* relative를 추가하여 내부의 absolute 요소(Now 뱃지)가 이 박스를 기준으로 배치되게 합니다. */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center hover:shadow-md transition-shadow col-span-2 lg:col-span-1 text-left relative">
            
            {/* Now 뱃지를 박스 우측 상단 모서리로 이동 */}
            <span className="absolute top-5 right-5 text-xs text-orange-500 font-semibold bg-orange-50 px-3 py-1 rounded-full shadow-sm border border-orange-100">
              Now
            </span>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400 font-semibold tracking-wider">오늘</span>
            </div>
            <span className="text-xs md:text-sm font-medium text-black mb-1.5 tracking-tight">
              {timeData.date || '날짜 로딩중...'}
            </span>
            {/* font-anchangho를 제거하고, font-black(가장 굵게)을 추가했습니다. */}
            <span className="font-black text-3xl md:text-4xl text-black leading-none tracking-tighter">
              {timeData.time || '00:00:00'}
            </span>
          </div>

          {/* --- KOSPI --- */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center hover:shadow-md transition-shadow col-span-1 lg:col-span-1 text-left">
            <span className="text-xs text-gray-400 font-semibold mb-2 tracking-wider">KOSPI</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[#ff4b4b] text-lg md:text-xl leading-none">2,764.38</span>
              <span className="text-xs text-[#ff4b4b] font-medium">▲ 15.21 (0.55%)</span>
            </div>
          </div>
          
          {/* --- KOSDAQ --- */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center hover:shadow-md transition-shadow col-span-1 lg:col-span-1 text-left">
            <span className="text-xs text-gray-400 font-semibold mb-2 tracking-wider">KOSDAQ</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[#007bff] text-lg md:text-xl leading-none">892.45</span>
              <span className="text-xs text-[#007bff] font-medium">▼ 3.12 (-0.35%)</span>
            </div>
          </div>
          
          {/* --- 한화투자증권 --- */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center hover:shadow-md transition-shadow col-span-2 lg:col-span-1 text-left">
            <span className="text-xs text-gray-400 font-semibold mb-2 tracking-wider">한화투자증권</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-[#ff4b4b] text-xl md:text-xl leading-none">3,850원</span>
              <span className="text-sm text-[#ff4b4b] font-medium">▲ 50 (1.31%)</span>
            </div>
          </div>

        </div>
        {/* --- 위젯 영역 끝 --- */}
        
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