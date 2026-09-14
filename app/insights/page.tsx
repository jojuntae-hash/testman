'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  ChevronLeft, Plus, Search, Sparkles, Video, BookOpen, Newspaper, 
  Lightbulb, ExternalLink, Trash2, Edit3, Copy, Check, 
  Key, X, Tag, Play, FileText, Bookmark, RefreshCw
} from 'lucide-react'

export interface InsightItem {
  id: string
  title: string
  url: string
  type: 'youtube' | 'blog' | 'article' | 'memo'
  thumbnail?: string
  videoId?: string
  summary: string
  userNotes?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

const INITIAL_INSIGHTS: InsightItem[] = [
  {
    id: 'sample_yt_1',
    title: '성공하는 사람들의 하루 루틴과 시간 관리 3대 전략',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    type: 'youtube',
    videoId: 'dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=600&auto=format&fit=crop&q=60',
    summary: `### 💡 핵심 요약
- **생산성의 핵심**: 아침 첫 2시간 동안 가장 에너지가 많이 드는 '핵심 작업' 1가지에 몰입
- **포모도로 테크닉**: 50분 집중 / 10분 휴식의 블록 타임제 적용
- **의사결정 피로 감소**: 전날 밤 다음 날 해야 할 3대 우선순위를 미리 정해두기

### 📌 주요 내용 및 타임라인
1. **01:30 - 에너지 레벨 관리**: 시간 관리보다 중요한 것은 에너지 관리 (충분한 수면, 수분 섭취, 가벼운 스트레칭)
2. **05:40 - 방해 요소 차단**: 오전 집중 시간에는 휴대폰 알림 끄기 및 이메일 확인 지연
3. **10:20 - 주간 회고 시스템**: 매주 금요일 30분간 주간 성과 점검 및 다음 주 계획 수립

### 🎯 실천 과제
- [ ] 내일부터 출근 직후 1시간 동안 이메일/메신저 확인 대신 당일 최우선 과제 처리하기
- [ ] 주간 리뷰 루틴 캘린더에 고정 등록하기

🏷️ #시간관리 #생산성 #모닝루틴 #자기계발`,
    userNotes: '우리 업무 프로세스에도 아침 우선순위 선정 방식을 도입해보면 좋을 듯.',
    tags: ['시간관리', '자기계발', '생산성'],
    createdAt: '2026-09-14',
    updatedAt: '2026-09-14'
  },
  {
    id: 'sample_blog_2',
    title: '고객 만족도를 200% 높이는 현장 서비스 커뮤니케이션 기술',
    url: 'https://brunch.co.kr/@service-pro/12',
    type: 'blog',
    summary: `### 💡 핵심 요약
- **선제적 안내**: 고객이 묻기 전에 방문 예정 시간과 점검 항목을 미리 3줄 문자로 전달
- **전문성과 친절함의 균형**: 전문 용어를 고객 눈높이에 맞는 일상적 비유로 설명하기
- **마무리 확인 멘트**: "오늘 점검 내용 중 추가로 궁금하신 부분이 있으신가요?"로 신뢰감 형성

### 📌 주요 내용
- 방문 30분 전 사전 알림 시 고객 준비 시간 확보 및 부재율 80% 감소
- 점검 후 비포/애프터 사진이나 필터 교체 상태를 직접 눈으로 보여주는 시각화의 중요성
- 고객의 사소한 불편 사항도 현장 메모에 기록하여 다음 정기 점검 시 반영

### 🎯 실천 과제
- 방문 전 정형화된 사전 문자 템플릿 적극 활용하기
- 작업 완료 후 필터 수거 상태 깔끔하게 정리 후 확인 받기

🏷️ #고객응대 #CS #서비스품질 #현장영업`,
    userNotes: '고객 방문 시 비포/애프터 비교 멘트 연습해보기',
    tags: ['고객응대', 'CS', '현장관리'],
    createdAt: '2026-09-10',
    updatedAt: '2026-09-10'
  }
]

export default function InsightsPage() {
  const router = useRouter()
  const [insights, setInsights] = useState<InsightItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<InsightItem | null>(null)
  const [copied, setCopied] = useState(false)

  // 추가 모달 폼 상태
  const [inputUrl, setInputUrl] = useState('')
  const [inputTitle, setInputTitle] = useState('')
  const [inputType, setInputType] = useState<'youtube' | 'blog' | 'article' | 'memo'>('youtube')
  const [inputSummary, setInputSummary] = useState('')
  const [inputUserNotes, setInputUserNotes] = useState('')
  const [inputTags, setInputTags] = useState('')
  const [inputThumbnail, setInputThumbnail] = useState('')
  const [inputVideoId, setInputVideoId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Supabase 데이터 변환 함수
  const mapSupabaseToInsight = (row: any): InsightItem => {
    let parsedTags: string[] = []
    if (Array.isArray(row.tags)) {
      parsedTags = row.tags
    } else if (typeof row.tags === 'string') {
      try {
        parsedTags = JSON.parse(row.tags)
      } catch {
        parsedTags = row.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      }
    }

    return {
      id: row.id,
      title: row.title || '',
      url: row.url || '',
      type: row.type || 'youtube',
      thumbnail: row.thumbnail || '',
      videoId: row.video_id || '',
      summary: row.summary || '',
      userNotes: row.user_notes || '',
      tags: parsedTags,
      createdAt: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      updatedAt: row.updated_at ? row.updated_at.split('T')[0] : new Date().toISOString().split('T')[0]
    }
  }

  // Supabase에서 데이터 불러오기
  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Supabase fetch error or table not yet created:', error.message)
        // 로컬스토리지 fallback
        loadLocalData()
      } else if (data && data.length > 0) {
        const mapped = data.map(mapSupabaseToInsight)
        setInsights(mapped)
        if (typeof window !== 'undefined') {
          localStorage.setItem('insights_data_v1', JSON.stringify(mapped))
        }
      } else {
        // Supabase에 데이터가 아직 하나도 없을 때
        loadLocalData()
      }
    } catch (err) {
      console.warn('Supabase fetch failed, using local cache:', err)
      loadLocalData()
    } finally {
      setIsLoading(false)
    }
  }

  const loadLocalData = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('insights_data_v1')
      if (saved) {
        try {
          setInsights(JSON.parse(saved))
        } catch {
          setInsights(INITIAL_INSIGHTS)
        }
      } else {
        setInsights(INITIAL_INSIGHTS)
        localStorage.setItem('insights_data_v1', JSON.stringify(INITIAL_INSIGHTS))
      }
    }
  }

  // 초기 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
      setGeminiApiKey(savedKey)
    }
    fetchInsights()
  }, [])

  // 데이터 저장 및 로컬 캐싱
  const saveInsightsLocal = (data: InsightItem[]) => {
    setInsights(data)
    if (typeof window !== 'undefined') {
      localStorage.setItem('insights_data_v1', JSON.stringify(data))
    }
  }

  // Gemini API Key 저장
  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key)
    localStorage.setItem('gemini_api_key', key)
    setIsKeyModalOpen(false)
    alert('Gemini API 키가 안전하게 저장되었습니다.')
  }

  // AI 자동 요약 호출
  const handleGenerateSummary = async () => {
    if (!inputUrl.trim()) {
      alert('요약할 유튜브 영상이나 웹 페이지 URL을 입력해주세요.')
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: inputUrl.trim(),
          apiKey: geminiApiKey
        })
      })

      const data = await res.json()
      
      if (data.title && !inputTitle) {
        setInputTitle(data.title)
      }
      if (data.type) {
        setInputType(data.type)
      }
      if (data.videoId) {
        setInputVideoId(data.videoId)
      }
      if (data.thumbnail) {
        setInputThumbnail(data.thumbnail)
      }

      if (!res.ok) {
        throw new Error(data.error || '요약 생성 실패')
      }

      if (data.summary) {
        setInputSummary(data.summary)
      }

      if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
        setInputTags(data.tags.join(', '))
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  // 인사이트 등록 또는 수정 (Supabase + LocalStorage 동기화)
  const handleSaveInsight = async () => {
    if (!inputTitle.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    const tagList = inputTags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean)

    const nowIso = new Date().toISOString()
    const nowDate = nowIso.split('T')[0]

    if (isEditMode && editingId) {
      const updatedItem: Partial<InsightItem> = {
        title: inputTitle.trim(),
        url: inputUrl.trim(),
        type: inputType,
        thumbnail: inputThumbnail,
        videoId: inputVideoId,
        summary: inputSummary,
        userNotes: inputUserNotes,
        tags: tagList,
        updatedAt: nowDate
      }

      const updatedList = insights.map(item => {
        if (item.id === editingId) {
          return { ...item, ...updatedItem } as InsightItem
        }
        return item
      })

      saveInsightsLocal(updatedList)
      if (selectedInsight && selectedInsight.id === editingId) {
        setSelectedInsight(updatedList.find(i => i.id === editingId) || null)
      }

      // Supabase 동기화
      try {
        await supabase
          .from('insights')
          .update({
            title: inputTitle.trim(),
            url: inputUrl.trim(),
            type: inputType,
            thumbnail: inputThumbnail,
            video_id: inputVideoId,
            summary: inputSummary,
            user_notes: inputUserNotes,
            tags: tagList,
            updated_at: nowIso
          })
          .eq('id', editingId)
      } catch (err) {
        console.warn('Supabase update failed:', err)
      }

      alert('수정되었습니다.')
    } else {
      const newId = `insight_${Date.now()}`
      const newItem: InsightItem = {
        id: newId,
        title: inputTitle.trim(),
        url: inputUrl.trim(),
        type: inputType,
        thumbnail: inputThumbnail,
        videoId: inputVideoId,
        summary: inputSummary,
        userNotes: inputUserNotes,
        tags: tagList,
        createdAt: nowDate,
        updatedAt: nowDate
      }

      saveInsightsLocal([newItem, ...insights])

      // Supabase 동기화
      try {
        await supabase
          .from('insights')
          .insert([{
            id: newId,
            title: inputTitle.trim(),
            url: inputUrl.trim(),
            type: inputType,
            thumbnail: inputThumbnail,
            video_id: inputVideoId,
            summary: inputSummary,
            user_notes: inputUserNotes,
            tags: tagList,
            created_at: nowIso,
            updated_at: nowIso
          }])
      } catch (err) {
        console.warn('Supabase insert failed:', err)
      }

      alert('새 인사이트 노트가 저장되었습니다.')
    }

    setIsAddModalOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setInputUrl('')
    setInputTitle('')
    setInputType('youtube')
    setInputSummary('')
    setInputUserNotes('')
    setInputTags('')
    setInputThumbnail('')
    setInputVideoId('')
    setIsEditMode(false)
    setEditingId(null)
  }

  // 수정 모달 열기
  const handleOpenEdit = (item: InsightItem) => {
    setIsEditMode(true)
    setEditingId(item.id)
    setInputUrl(item.url || '')
    setInputTitle(item.title)
    setInputType(item.type)
    setInputSummary(item.summary)
    setInputUserNotes(item.userNotes || '')
    setInputTags(item.tags ? item.tags.join(', ') : '')
    setInputThumbnail(item.thumbnail || '')
    setInputVideoId(item.videoId || '')
    setIsAddModalOpen(true)
  }

  // 삭제
  const handleDeleteInsight = async (id: string, title: string) => {
    if (confirm(`'${title}' 인사이트를 삭제하시겠습니까?`)) {
      const updated = insights.filter(i => i.id !== id)
      saveInsightsLocal(updated)
      if (selectedInsight && selectedInsight.id === id) {
        setIsDetailModalOpen(false)
        setSelectedInsight(null)
      }

      // Supabase 삭제 동기화
      try {
        await supabase
          .from('insights')
          .delete()
          .eq('id', id)
      } catch (err) {
        console.warn('Supabase delete failed:', err)
      }
    }
  }

  // 복사
  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 필터링
  const filteredInsights = insights.filter(item => {
    const matchType = selectedType === 'all' || item.type === selectedType
    const matchQuery = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    return matchType && matchQuery
  })

  return (
    <div className="insights-container">
      {/* 상단 헤더 */}
      <header className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => router.back()} title="뒤로가기">
            <ChevronLeft size={24} />
          </button>
          <div className="header-titles">
            <div className="badge-wrapper">
              <h1>지식 & 인사이트 아카이브</h1>
              <span className="beta-badge">INSIGHTS</span>
            </div>
            <p>유튜브, 블로그, 웹진의 핵심을 AI로 요약하고 한눈에 다시 봅니다</p>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className={`sync-btn ${isLoading ? 'loading' : ''}`}
            onClick={fetchInsights}
            title="클라우드 동기화 새로고침"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spin-icon' : ''} />
            <span>{isLoading ? '동기화 중...' : '동기화'}</span>
          </button>

          <button 
            className={`api-key-btn ${geminiApiKey ? 'active' : ''}`}
            onClick={() => setIsKeyModalOpen(true)}
            title="Google Gemini API 설정"
          >
            <Key size={16} />
            <span>{geminiApiKey ? 'Gemini 연동됨' : 'Gemini API 등록'}</span>
          </button>

          <button 
            className="add-insight-btn"
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          >
            <Plus size={18} />
            <span>새 인사이트 정리</span>
          </button>
        </div>
      </header>

      {/* 필터 및 검색 바 */}
      <div className="filter-bar">
        <div className="category-tabs">
          <button 
            className={`tab-btn ${selectedType === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedType('all')}
          >
            전체 ({insights.length})
          </button>
          <button 
            className={`tab-btn ${selectedType === 'youtube' ? 'active' : ''}`}
            onClick={() => setSelectedType('youtube')}
          >
            <Video size={15} color="#ef4444" /> 유튜브
          </button>
          <button 
            className={`tab-btn ${selectedType === 'blog' ? 'active' : ''}`}
            onClick={() => setSelectedType('blog')}
          >
            <BookOpen size={15} color="#10b981" /> 블로그
          </button>
          <button 
            className={`tab-btn ${selectedType === 'article' ? 'active' : ''}`}
            onClick={() => setSelectedType('article')}
          >
            <Newspaper size={15} color="#3b82f6" /> 웹진/뉴스
          </button>
          <button 
            className={`tab-btn ${selectedType === 'memo' ? 'active' : ''}`}
            onClick={() => setSelectedType('memo')}
          >
            <Lightbulb size={15} color="#f59e0b" /> 메모/노트
          </button>
        </div>

        <div className="search-box">
          <Search size={16} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="제목, 키워드, 내용 검색..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>
      </div>

      {/* 인사이트 카드 그리드 */}
      <main className="content-grid">
        {filteredInsights.length === 0 ? (
          <div className="empty-state">
            <Bookmark size={48} color="#cbd5e1" />
            <h3>저장된 인사이트가 없습니다</h3>
            <p>유튜브나 블로그 링크를 추가하여 AI 요약 문서를 만들어보세요.</p>
            <button className="empty-add-btn" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
              <Plus size={16} /> 첫 인사이트 추가하기
            </button>
          </div>
        ) : (
          filteredInsights.map(item => (
            <div 
              key={item.id} 
              className="insight-card"
              onClick={() => { setSelectedInsight(item); setIsDetailModalOpen(true); }}
            >
              {/* 썸네일 영역 */}
              {item.type === 'youtube' && item.thumbnail ? (
                <div className="card-media">
                  <img src={item.thumbnail} alt={item.title} />
                  <div className="play-overlay">
                    <Play size={20} fill="#fff" color="#fff" />
                  </div>
                  <span className="type-badge yt">
                    <Video size={12} /> 유튜브
                  </span>
                </div>
              ) : (
                <div className={`card-header-pattern ${item.type}`}>
                  <span className={`type-badge ${item.type}`}>
                    {item.type === 'blog' && <><BookOpen size={12} /> 블로그</>}
                    {item.type === 'article' && <><Newspaper size={12} /> 웹진</>}
                    {item.type === 'memo' && <><Lightbulb size={12} /> 메모</>}
                  </span>
                  <span className="date-text">{item.createdAt}</span>
                </div>
              )}

              <div className="card-body">
                <h3 className="card-title">{item.title}</h3>
                
                <p className="card-preview">
                  {item.summary.replace(/#/g, '').replace(/\*/g, '').slice(0, 110)}...
                </p>

                {item.tags && item.tags.length > 0 && (
                  <div className="tag-list">
                    {item.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="tag-badge">#{tag}</span>
                    ))}
                    {item.tags.length > 3 && <span className="tag-more">+{item.tags.length - 3}</span>}
                  </div>
                )}
              </div>

              <div className="card-footer" onClick={(e) => e.stopPropagation()}>
                <span className="date-info">{item.createdAt}</span>
                <div className="card-btns">
                  {item.url && (
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="icon-link-btn"
                      title="원문 링크 열기"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button 
                    className="icon-link-btn edit" 
                    onClick={() => handleOpenEdit(item)}
                    title="수정"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    className="icon-link-btn delete" 
                    onClick={() => handleDeleteInsight(item.id, item.title)}
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* 상세 문서 뷰어 모달 */}
      {isDetailModalOpen && selectedInsight && (
        <div className="modal-overlay">
          <div className="modal-content detail-modal">
            <div className="modal-header">
              <div className="detail-header-info">
                <span className={`type-badge ${selectedInsight.type}`}>
                  {selectedInsight.type === 'youtube' && <><Video size={13} /> 유튜브 요약 문서</>}
                  {selectedInsight.type === 'blog' && <><BookOpen size={13} /> 블로그 요약</>}
                  {selectedInsight.type === 'article' && <><Newspaper size={13} /> 웹진 아티클</>}
                  {selectedInsight.type === 'memo' && <><Lightbulb size={13} /> 지식 메모</>}
                </span>
                <span className="detail-date">{selectedInsight.createdAt}</span>
              </div>

              <div className="detail-header-actions">
                <button 
                  className="action-btn copy"
                  onClick={() => handleCopySummary(selectedInsight.summary)}
                  title="요약 내용 복사"
                >
                  {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                  <span>{copied ? '복사됨!' : '요약 복사'}</span>
                </button>
                <button 
                  className="action-btn edit"
                  onClick={() => { setIsDetailModalOpen(false); handleOpenEdit(selectedInsight); }}
                >
                  <Edit3 size={16} />
                  <span>수정</span>
                </button>
                <button className="close-btn" onClick={() => setIsDetailModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="modal-body detail-body">
              <h1 className="detail-title">{selectedInsight.title}</h1>

              {/* 유튜브 영상 임베드 또는 링크 박스 */}
              {selectedInsight.type === 'youtube' && selectedInsight.videoId ? (
                <div className="video-embed-container">
                  <iframe 
                    src={`https://www.youtube.com/embed/${selectedInsight.videoId}`} 
                    title={selectedInsight.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  />
                </div>
              ) : selectedInsight.url ? (
                <div className="source-link-box">
                  <span className="link-label">원문 링크:</span>
                  <a href={selectedInsight.url} target="_blank" rel="noopener noreferrer" className="source-url">
                    {selectedInsight.url} <ExternalLink size={13} />
                  </a>
                </div>
              ) : null}

              {/* 태그 목록 */}
              {selectedInsight.tags && selectedInsight.tags.length > 0 && (
                <div className="detail-tags">
                  {selectedInsight.tags.map(tag => (
                    <span key={tag} className="detail-tag-item">#{tag}</span>
                  ))}
                </div>
              )}

              {/* 요약 문서 내용 */}
              <div className="summary-doc-container">
                <div className="doc-section-header">
                  <FileText size={18} color="#3b82f6" />
                  <span>핵심 분석 및 상세 정리 노트</span>
                </div>
                <div className="doc-text-content">
                  {selectedInsight.summary}
                </div>
              </div>

              {/* 개인 메모 영역 */}
              {selectedInsight.userNotes && (
                <div className="user-notes-container">
                  <div className="notes-header">
                    <Lightbulb size={16} color="#f59e0b" />
                    <span>내 생각 & 실행 메모</span>
                  </div>
                  <p className="notes-text">{selectedInsight.userNotes}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsDetailModalOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* 새 인사이트 추가 / 수정 모달 */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content form-modal">
            <div className="modal-header">
              <div className="header-title-group">
                <Sparkles size={20} color="#6366f1" />
                <h2>{isEditMode ? '인사이트 노트 수정' : '새 인사이트 정리'}</h2>
              </div>
              <button className="close-btn" onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
            </div>

            <div className="modal-body form-body">
              {/* URL 입력 및 AI 요약 생성 바 */}
              <div className="form-group">
                <label className="form-label">링크 URL (유튜브 / 블로그 / 웹진)</label>
                <div className="url-input-group">
                  <input 
                    type="text" 
                    placeholder="https://www.youtube.com/watch?v=... 또는 블로그 주소"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="form-input"
                  />
                  <button 
                    className="ai-generate-btn" 
                    onClick={handleGenerateSummary}
                    disabled={isGenerating}
                  >
                    <Sparkles size={15} className={isGenerating ? 'animate-spin' : ''} />
                    <span>{isGenerating ? 'AI 분석 중...' : 'AI 자동 요약'}</span>
                  </button>
                </div>
                {!geminiApiKey && (
                  <span className="key-hint" onClick={() => setIsKeyModalOpen(true)}>
                    💡 Gemini API 키를 등록하면 완벽한 구조의 문서가 자동 작성됩니다.
                  </span>
                )}
              </div>

              {/* 분류 및 제목 */}
              <div className="form-row">
                <div className="form-group" style={{ flex: '0 0 140px' }}>
                  <label className="form-label">콘텐츠 유형</label>
                  <select 
                    value={inputType} 
                    onChange={(e: any) => setInputType(e.target.value)}
                    className="form-select"
                  >
                    <option value="youtube">🎬 유튜브</option>
                    <option value="blog">📝 블로그</option>
                    <option value="article">📰 웹진/뉴스</option>
                    <option value="memo">💡 자유 메모</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">제목</label>
                  <input 
                    type="text" 
                    placeholder="인사이트 제목"
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* 태그 */}
              <div className="form-group">
                <label className="form-label">태그 (쉼표로 구분)</label>
                <input 
                  type="text" 
                  placeholder="시간관리, 생산성, CS, 마케팅"
                  value={inputTags}
                  onChange={(e) => setInputTags(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* 정리 내용 (마크다운) */}
              <div className="form-group">
                <label className="form-label">정리된 문서 내용 (핵심 요약 & 세부 내용)</label>
                <textarea 
                  rows={9}
                  placeholder="AI 자동 요약 버튼을 누르거나 직접 핵심 내용을 정리해주세요."
                  value={inputSummary}
                  onChange={(e) => setInputSummary(e.target.value)}
                  className="form-textarea"
                />
              </div>

              {/* 개인 메모 */}
              <div className="form-group">
                <label className="form-label">내 생각 & 실천 메모 (선택)</label>
                <textarea 
                  rows={3}
                  placeholder="이 내용을 보고 느낀 점이나 내 업무에 적용할 아이디어를 기록하세요."
                  value={inputUserNotes}
                  onChange={(e) => setInputUserNotes(e.target.value)}
                  className="form-textarea"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>취소</button>
              <button className="btn-primary" onClick={handleSaveInsight}>
                {isEditMode ? '수정 완료' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini API Key 설정 모달 */}
      {isKeyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content key-modal">
            <div className="modal-header">
              <div className="header-title-group">
                <Key size={20} color="#f59e0b" />
                <h2>Google Gemini API 설정</h2>
              </div>
              <button className="close-btn" onClick={() => setIsKeyModalOpen(false)}><X size={20} /></button>
            </div>

            <div className="modal-body">
              <p className="key-guide">
                Google AI Studio에서 발급받은 무료 API 키를 등록하면, 입력한 유튜브 링크나 웹 페이지를 Gemini 모델이 즉시 심층 분석하여 구조화된 마크다운 문서로 요약해줍니다.
              </p>

              <div className="form-group mt-3">
                <label className="form-label">Gemini API Key</label>
                <input 
                  type="password" 
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="key-link-box">
                <span>🔑 API 키가 없으신가요?</span>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="key-link"
                >
                  Google AI Studio에서 무료 발급받기 <ExternalLink size={13} />
                </a>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsKeyModalOpen(false)}>닫기</button>
              <button className="btn-primary" onClick={() => handleSaveApiKey(geminiApiKey)}>저장하기</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .insights-container {
          min-height: 100vh;
          background: #f8fafc;
          padding: 24px 20px 80px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* 헤더 */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .back-btn {
          background: #fff;
          border: 1px solid #e2e8f0;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #475569;
          transition: all 0.2s;
        }
        .back-btn:hover {
          background: #f1f5f9;
          color: #1e293b;
        }
        .badge-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .badge-wrapper h1 {
          font-size: 1.4rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }
        .beta-badge {
          background: #ede9fe;
          color: #7c3aed;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 6px;
        }
        .header-titles p {
          font-size: 0.85rem;
          color: #64748b;
          margin: 2px 0 0 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sync-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sync-btn:hover {
          background: #f1f5f9;
          color: #1e293b;
        }
        .sync-btn.loading {
          opacity: 0.7;
          cursor: wait;
        }
        :global(.spin-icon) {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .api-key-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .api-key-btn.active {
          border-color: #fef08a;
          background: #fefce8;
          color: #a16207;
        }
        .add-insight-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: #4f46e5;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
        }
        .add-insight-btn:hover {
          background: #4338ca;
        }

        /* 필터 및 검색 바 */
        .filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          background: #fff;
          padding: 12px 16px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }
        .category-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: transparent;
          border: none;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: #eff6ff;
          color: #2563eb;
        }
        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 6px 12px;
          width: 100%;
          max-width: 280px;
        }
        .search-box input {
          border: none;
          background: transparent;
          outline: none;
          padding-left: 8px;
          font-size: 0.85rem;
          width: 100%;
          color: #1e293b;
        }
        .clear-search {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 1.1rem;
        }

        /* 그리드 */
        .content-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }
        .insight-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .insight-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.06);
          border-color: #cbd5e1;
        }

        .card-media {
          position: relative;
          width: 100%;
          height: 170px;
          background: #0f172a;
          overflow: hidden;
        }
        .card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.9;
        }
        .play-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 44px;
          height: 44px;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(2px);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-header-pattern {
          height: 60px;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f1f5f9;
        }
        .card-header-pattern.blog { background: #ecfdf5; }
        .card-header-pattern.article { background: #eff6ff; }
        .card-header-pattern.memo { background: #fffbeb; }

        .type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
        }
        .type-badge.yt {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(239, 68, 68, 0.9);
          color: #fff;
        }
        .type-badge.blog { background: #d1fae5; color: #059669; }
        .type-badge.article { background: #dbeafe; color: #2563eb; }
        .type-badge.memo { background: #fef3c7; color: #d97706; }

        .card-body {
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .card-title {
          font-size: 1rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 8px 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-preview {
          font-size: 0.82rem;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 14px 0;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: auto;
        }
        .tag-badge {
          background: #f1f5f9;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .tag-more {
          font-size: 0.7rem;
          color: #94a3b8;
          padding: 2px 4px;
        }

        .card-footer {
          padding: 12px 16px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fafafa;
        }
        .date-info {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 600;
        }
        .card-btns {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .icon-link-btn {
          background: #fff;
          border: 1px solid #e2e8f0;
          color: #64748b;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: none;
        }
        .icon-link-btn:hover {
          color: #1e293b;
          border-color: #cbd5e1;
        }
        .icon-link-btn.delete:hover {
          color: #ef4444;
          border-color: #fca5a5;
          background: #fee2e2;
        }

        /* 빈 상태 */
        .empty-state {
          grid-column: 1 / -1;
          background: #fff;
          border: 1px dashed #cbd5e1;
          border-radius: 20px;
          padding: 60px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .empty-state h3 {
          margin: 10px 0 0 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #334155;
        }
        .empty-state p {
          color: #94a3b8;
          font-size: 0.85rem;
          margin: 0;
        }
        .empty-add-btn {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: #4f46e5;
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
        }

        /* 모달 공통 */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(2px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-content {
          background: #fff;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .modal-content.detail-modal { max-width: 720px; }
        .modal-content.form-modal { max-width: 640px; }
        .modal-content.key-modal { max-width: 480px; }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 22px;
          border-bottom: 1px solid #f1f5f9;
        }
        .header-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-title-group h2 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 800;
          color: #1e293b;
        }
        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
        }

        .modal-body {
          padding: 22px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .modal-footer {
          padding: 14px 22px;
          border-top: 1px solid #f1f5f9;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          background: #fafafa;
        }

        /* 상세 모달 스타일 */
        .detail-header-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .detail-date {
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .detail-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
        }
        .action-btn:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
        .detail-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 14px 0;
          line-height: 1.4;
        }
        .video-embed-container {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          overflow: hidden;
          border-radius: 12px;
          margin-bottom: 16px;
          background: #000;
        }
        .video-embed-container iframe {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          border: none;
        }
        .source-link-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.82rem;
          margin-bottom: 12px;
        }
        .link-label { font-weight: 700; color: #64748b; }
        .source-url {
          color: #2563eb;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .detail-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 16px;
        }
        .detail-tag-item {
          background: #eff6ff;
          color: #2563eb;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .summary-doc-container {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 18px;
        }
        .doc-section-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 14px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .doc-text-content {
          font-size: 0.96rem;
          color: #1e293b;
          line-height: 1.85;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          letter-spacing: -0.01em;
        }

        .user-notes-container {
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 12px;
          padding: 16px 18px;
        }
        .notes-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.88rem;
          font-weight: 800;
          color: #b45309;
          margin-bottom: 8px;
        }
        .notes-text {
          font-size: 0.9rem;
          color: #78350f;
          margin: 0;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        /* 폼 입력 스타일 */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-row {
          display: flex;
          gap: 12px;
        }
        .form-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #334155;
        }
        .form-input, .form-select {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-textarea {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          font-size: 0.93rem;
          line-height: 1.8;
          outline: none;
          transition: border-color 0.2s;
          white-space: pre-wrap;
          font-family: inherit;
          color: #1e293b;
          min-height: 280px;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #4f46e5;
        }
        .url-input-group {
          display: flex;
          gap: 8px;
        }
        .ai-generate-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          border: none;
          padding: 0 16px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .ai-generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .key-hint {
          font-size: 0.75rem;
          color: #6366f1;
          cursor: pointer;
          font-weight: 600;
        }
        .key-hint:hover { text-decoration: underline; }

        .key-guide {
          font-size: 0.85rem;
          color: #475569;
          line-height: 1.5;
          margin: 0;
        }
        .key-link-box {
          margin-top: 14px;
          background: #f8fafc;
          padding: 12px;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.8rem;
          color: #64748b;
        }
        .key-link {
          color: #2563eb;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
          border: none;
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .page-header { flex-direction: column; align-items: flex-start; }
          .header-actions { width: 100%; justify-content: space-between; }
          .filter-bar { flex-direction: column; align-items: stretch; }
          .search-box { max-width: 100%; }
        }
      `}</style>
    </div>
  )
}