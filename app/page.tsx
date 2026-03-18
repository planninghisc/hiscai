'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { supabase } from '../utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  // 상태 변수명은 userId를 그대로 유지합니다
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 핵심: 입력받은 아이디에 @hiscai.com을 자동으로 붙여줍니다.
    // 공백이 들어갈 수 있으니 trim()으로 양옆 공백도 제거해줍니다.
    const loginEmail = `${userId.trim()}@hiscai.com`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      })

      if (error) {
        alert('Fail : ' + error.message)
        return
      }

      alert('Login Success!')
       router.push('/dashboard') 
      
    } catch (error) {
      console.error('로그인 에러:', error)
      alert('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[380px] rounded-[2rem] bg-white p-8 shadow-xl sm:p-10">
        
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="font-anchangho font-bold text-5xl text-[#ea580c] mb-4">
            FilterWise
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            The power of properly accumulated data
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text" // 이메일 타입 대신 text 타입 유지
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-full border border-gray-300 bg-white py-3.5 pl-11 pr-4 text-sm text-gray-900 focus:border-[#ea580c] focus:outline-none focus:ring-1 focus:ring-[#ea580c] transition-colors"
              placeholder="Enter your ID" // placeholder를 ID로 변경
              required
            />
          </div>

          <div className="relative">
            <LockClosedIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-full border border-gray-300 bg-white py-3.5 pl-11 pr-4 text-sm text-gray-900 focus:border-[#ea580c] focus:outline-none focus:ring-1 focus:ring-[#ea580c] transition-colors"
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-[#ea580c] py-4 text-sm font-bold text-white shadow-md transition-all hover:bg-[#c2410c] active:scale-[0.98] disabled:bg-gray-400"
            >
              {isLoading ? '로그인 중...' : 'Login In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}