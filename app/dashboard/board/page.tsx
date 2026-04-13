'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../utils/supabase/client'
import { Bars3Icon, XMarkIcon, StarIcon as StarOutline, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

interface Post {
  id: number
  title: string
  content: string
  author_name: string
  author_id: string
  is_important: boolean
  created_at: string
}

export default function BoardPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // 모달(입력/수정) 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', is_important: false })

  // 모달(읽기 전용) 상태
  const [isReadModalOpen, setIsReadModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  // 데이터 & 사용자 정보 불러오기
  useEffect(() => {
    fetchUserAndPosts()
  }, [])

  const fetchUserAndPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    const { data, error } = await supabase
      .from('board')
      .select('*')
      .order('is_important', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (!error && data) setPosts(data)
  }

  // --- CRUD 기능 ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return alert('로그인이 필요합니다.')

    const author_name = currentUser.user_metadata?.nickname || currentUser.email?.split('@')[0] || '익명'

    if (editId) {
      await supabase.from('board').update({
        title: formData.title,
        content: formData.content,
        is_important: formData.is_important
      }).eq('id', editId)
    } else {
      await supabase.from('board').insert([{
        title: formData.title,
        content: formData.content,
        author_name,
        author_id: currentUser.id,
        is_important: formData.is_important
      }])
    }

    setIsModalOpen(false)
    setFormData({ title: '', content: '', is_important: false })
    setEditId(null)
    fetchUserAndPosts()
  }

  const handleDelete = async (id: number) => {
    if (confirm('정말로 삭제하시겠습니까?')) {
      await supabase.from('board').delete().eq('id', id)
      fetchUserAndPosts()
    }
  }

  const toggleImportant = async (id: number, currentStatus: boolean) => {
    await supabase.from('board').update({ is_important: !currentStatus }).eq('id', id)
    fetchUserAndPosts()
  }

  // 글쓰기/수정 모달 열기
  const openModal = (post?: Post) => {
    if (post) {
      setEditId(post.id)
      setFormData({ title: post.title, content: post.content || '', is_important: post.is_important })
    } else {
      setEditId(null)
      setFormData({ title: '', content: '', is_important: false })
    }
    setIsModalOpen(true)
  }

  // 글 읽기 모달 열기
  const openReadModal = (post: Post) => {
    setSelectedPost(post)
    setIsReadModalOpen(true)
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
          <a href="/dashboard" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">대시보드 홈</a>
          <a href="/dashboard/board" className="block px-4 py-3 rounded-xl bg-orange-50 text-[#ea580c] font-bold transition-colors">자유 게시판</a>
          <a href="#" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">경쟁사 비교 (XBRL)</a>
          <a href="/dashboard/market" className="block px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">시장 정보 분석</a>
        </nav>
      </aside>

      {/* 메인 콘텐츠 (게시판) */}
      <main className="flex-1 p-6 md:p-10 relative z-10 overflow-hidden">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">자유 게시판</h2>
            <p className="text-sm text-gray-500 mt-1.5 font-medium">자유롭게 의견을 나누는 공간입니다.</p>
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-[#ea580c] hover:bg-orange-700 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap"
          >
            새 글 작성
          </button>
        </header>

        {/* 게시글 목록 테이블 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto"> 
            <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs md:text-sm text-gray-500">
                  {/* whitespace-nowrap 적용으로 '중요' 글자 줄바꿈 방지 */}
                  <th className="px-4 md:px-6 py-3 md:py-4 font-semibold w-14 md:w-20 text-center whitespace-nowrap">중요</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-semibold">제목</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-semibold w-24 md:w-32 text-center md:text-left">작성자</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-semibold w-28 md:w-32 text-center">작성일</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-semibold w-20 md:w-24 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="text-xs md:text-sm text-gray-700">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">등록된 게시글이 없습니다.</td>
                  </tr>
                ) : (
                  posts.map(post => {
                    const date = new Date(post.created_at)
                    const formattedDate = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
                    const isAuthor = currentUser?.id === post.author_id

                    return (
                      <tr key={post.id} className={`border-b border-gray-50 hover:bg-orange-50/30 transition-colors ${post.is_important ? 'bg-orange-50/50' : ''}`}>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                          <button onClick={() => toggleImportant(post.id, post.is_important)} className="focus:outline-none">
                            {post.is_important ? <StarSolid className="w-4 h-4 md:w-5 md:h-5 text-[#ea580c]" /> : <StarOutline className="w-4 h-4 md:w-5 md:h-5 text-gray-300 hover:text-gray-400" />}
                          </button>
                        </td>
                        {/* 제목 클릭 시 읽기 모달 오픈 (hover 스타일 추가) */}
                        <td 
                          className="px-4 md:px-6 py-3 md:py-4 font-medium text-gray-900 max-w-[180px] md:max-w-xs truncate cursor-pointer hover:text-[#ea580c] hover:underline transition-colors"
                          onClick={() => openReadModal(post)}
                        >
                          {post.title}
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-gray-500 whitespace-nowrap text-center md:text-left truncate max-w-[80px] md:max-w-none">
                          {post.author_name}
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-center text-gray-400 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-center">
                          {isAuthor && (
                            <div className="flex justify-center gap-2 md:gap-3">
                              <button onClick={() => openModal(post)} className="text-gray-400 hover:text-blue-500"><PencilSquareIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                              <button onClick={() => handleDelete(post.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 작성/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-6">{editId ? '게시글 수정' : '새 글 작성'}</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input 
                  type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  placeholder="제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                <textarea 
                  rows={6} value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                  placeholder="내용을 입력하세요"
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" id="important" checked={formData.is_important}
                  onChange={(e) => setFormData({...formData, is_important: e.target.checked})}
                  className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                />
                <label htmlFor="important" className="text-sm text-gray-700 font-medium cursor-pointer">중요 글로 표시</label>
              </div>
              <button type="submit" className="mt-4 w-full bg-[#ea580c] hover:bg-orange-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
                {editId ? '수정 완료' : '등록하기'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- 새로 추가된 글 읽기 모달 --- */}
      {isReadModalOpen && selectedPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-left">
            <button onClick={() => setIsReadModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-6 w-6" />
            </button>
            
            {/* 글 제목 및 메타 정보 */}
            <div className="mb-5 pr-6 border-b border-gray-100 pb-4">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 break-words leading-snug">
                {selectedPost.is_important && <span className="text-[#ea580c] mr-2">[중요]</span>}
                {selectedPost.title}
              </h2>
              <div className="text-xs md:text-sm text-gray-500 mt-2 flex gap-3 font-medium">
                <span>작성자: {selectedPost.author_name}</span>
                <span className="text-gray-300">|</span>
                <span>
                  {new Date(selectedPost.created_at).toLocaleString('ko-KR', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
            
            {/* 글 내용 */}
            <div className="bg-gray-50 p-5 rounded-xl min-h-[180px] max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm md:text-base text-gray-700 leading-relaxed">
              {selectedPost.content}
            </div>
            
            {/* 하단 버튼 */}
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setIsReadModalOpen(false)} 
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-lg text-sm transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}