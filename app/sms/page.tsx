'use client'

import React, { useState, useMemo } from 'react'
import { useData, LongTermCustomer, SubscribedCustomer, ProductCategoryRule } from '@/lib/DataContext'
import { 
  Trash2, UserPlus, Save, Edit, X, MessageSquare, Send, 
  Users, UserCheck, Search, Download, CheckSquare, Square, 
  ChevronLeft, ChevronRight, FileSpreadsheet, AlertCircle
} from 'lucide-react'
import * as XLSX from 'xlsx'

type TabType = 'manual' | 'longterm' | 'subscribed'

const PAGE_SIZE = 50

// ----------------------------------------------------
// 설정된 규칙 기반 제품 카테고리 매칭 함수
// ----------------------------------------------------
export const matchProductCategoryWithRules = (
  modelName: string, 
  category: string, 
  rules: ProductCategoryRule[]
): boolean => {
  if (!modelName) return category === '기타'
  const upper = modelName.trim().toUpperCase()
  const lower = modelName.trim().toLowerCase()

  if (category === '전체') return true

  // 특정 카테고리에 매칭되는지 확인하는 내부 함수
  const isMatchRule = (rule: ProductCategoryRule) => {
    // 1. 접두사 매칭 (예: CP -> CP-, CP123, CP-ABS 등)
    const matchPrefix = rule.prefixes.some(pfx => {
      const cleanPfx = pfx.trim().toUpperCase()
      if (!cleanPfx) return false
      return upper.startsWith(cleanPfx + '-') || upper.startsWith(cleanPfx)
    })
    if (matchPrefix) return true

    // 2. 키워드 매칭
    const matchKeyword = rule.keywords.some(kw => {
      const cleanKw = kw.trim().toLowerCase()
      if (!cleanKw) return false
      return lower.includes(cleanKw)
    })
    return matchKeyword
  }

  if (category === '기타') {
    // 정의된 어떤 룰에도 속하지 않는 모델
    return !rules.some(rule => isMatchRule(rule))
  }

  const targetRule = rules.find(r => r.category === category)
  if (!targetRule) {
    return lower.includes(category.toLowerCase())
  }

  return isMatchRule(targetRule)
}

export default function SmsPage() {
  const { 
    longTermCustomers, subscribedCustomers,
    smsQueue, addToSmsQueue, removeFromSmsQueue, clearSmsQueue, setSmsQueue,
    smsTemplates, addSmsTemplate, updateSmsTemplate, deleteSmsTemplate,
    productCategoryRules
  } = useData()

  // 동적 제품 태그 목록
  const productTags = useMemo(() => {
    const customCats = productCategoryRules.map(r => r.category)
    return ['전체', ...customCats, '기타']
  }, [productCategoryRules])

  // 현재 활성 탭 (장기고객 문자 기본 활성화)
  const [activeTab, setActiveTab] = useState<TabType>('longterm')

  // 수동 입력 상태
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  // 탭 1 & 탭 2 검색 및 필터 상태
  const [selectedProduct, setSelectedProduct] = useState<string>('전체')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())

  // 템플릿 관련 상태
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateContent, setTemplateContent] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  // ----------------------------------------------------
  // 전화번호 추출 및 정규화 헬퍼
  // ----------------------------------------------------
  const extractMobileNumber = (item: LongTermCustomer | SubscribedCustomer): string => {
    const rawCandidates = [
      (item as any).핸드폰번호,
      (item as any).설치핸드폰번호,
      (item as any).설치전화번호,
      (item as any).전화번호
    ]
    for (const raw of rawCandidates) {
      if (!raw) continue
      let clean = String(raw).replace(/[^0-9]/g, '').trim()
      if (clean.startsWith('10') && (clean.length === 9 || clean.length === 10)) {
        clean = '0' + clean
      }
      if (clean.startsWith('010') || clean.startsWith('011') || clean.startsWith('016') || 
          clean.startsWith('017') || clean.startsWith('018') || clean.startsWith('019')) {
        if (clean.length >= 10 && clean.length <= 11) {
          return clean
        }
      }
    }
    return ''
  }

  const formatPhoneNumber = (num: string): string => {
    if (!num) return ''
    const clean = num.replace(/[^0-9]/g, '')
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`
    } else if (clean.length === 10) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`
    }
    return clean
  }

  const getDisplayName = (item: LongTermCustomer | SubscribedCustomer): string => {
    return (
      (item as any).고객명_상호 ||
      (item as any).이름 ||
      (item as any).설치자명 ||
      '고객'
    )
  }

  const getModelName = (item: LongTermCustomer | SubscribedCustomer): string => {
    return (item as any).모델명 || ''
  }

  // ----------------------------------------------------
  // 가입고객 번호 Set (장기고객 탭에서 제외용)
  // ----------------------------------------------------
  const subscribedPhoneSet = useMemo(() => {
    const set = new Set<string>()
    subscribedCustomers.forEach(sub => {
      const phone = extractMobileNumber(sub)
      if (phone) set.add(phone)
    })
    return set
  }, [subscribedCustomers])

  // ----------------------------------------------------
  // 장기고객 탭 대상 목록 (가입고객 제외 + 자체 중복 제거)
  // ----------------------------------------------------
  const longTermList = useMemo(() => {
    const seenPhones = new Set<string>()
    const result: { item: LongTermCustomer; mobile: string; name: string; model: string }[] = []

    longTermCustomers.forEach(c => {
      const mobile = extractMobileNumber(c)
      if (!mobile) return // 휴대폰 번호가 없으면 제외
      if (subscribedPhoneSet.has(mobile)) return // 가입고객에 존재하는 번호 제외
      if (seenPhones.has(mobile)) return // 자체 중복 제거

      seenPhones.add(mobile)
      result.push({
        item: c,
        mobile,
        name: getDisplayName(c),
        model: getModelName(c)
      })
    })
    return result
  }, [longTermCustomers, subscribedPhoneSet])

  // ----------------------------------------------------
  // 가입고객 탭 대상 목록 (자체 중복 제거)
  // ----------------------------------------------------
  const subscribedList = useMemo(() => {
    const seenPhones = new Set<string>()
    const result: { item: SubscribedCustomer; mobile: string; name: string; model: string }[] = []

    subscribedCustomers.forEach(sub => {
      const mobile = extractMobileNumber(sub)
      if (!mobile) return // 휴대폰 번호가 없으면 제외
      if (seenPhones.has(mobile)) return // 자체 중복 제거

      seenPhones.add(mobile)
      result.push({
        item: sub,
        mobile,
        name: getDisplayName(sub),
        model: getModelName(sub)
      })
    })
    return result
  }, [subscribedCustomers])

  // ----------------------------------------------------
  // 현재 활성 탭에 따른 필터링 (제품 태그 + 검색어)
  // ----------------------------------------------------
  const currentBaseList = activeTab === 'longterm' ? longTermList : activeTab === 'subscribed' ? subscribedList : []

  const filteredList = useMemo(() => {
    return currentBaseList.filter(({ item, mobile, name, model }) => {
      // 1. 제품 태그 필터 (설정된 규칙 기반 매칭)
      if (selectedProduct !== '전체') {
        if (!matchProductCategoryWithRules(model, selectedProduct, productCategoryRules)) {
          return false
        }
      }

      // 2. 검색어 필터
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase()
        const matchName = name.toLowerCase().includes(kw)
        const matchMobile = mobile.includes(kw)
        const matchModel = model.toLowerCase().includes(kw)
        const matchAddress = ((item as any).주소 || (item as any).설치주소 || '').toLowerCase().includes(kw)
        const matchCustomerNo = ((item as any).고객번호 || '').toLowerCase().includes(kw)
        if (!matchName && !matchMobile && !matchModel && !matchAddress && !matchCustomerNo) {
          return false
        }
      }

      return true
    })
  }, [currentBaseList, selectedProduct, searchKeyword, productCategoryRules])

  // ----------------------------------------------------
  // 페이징 처리
  // ----------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE))
  const currentPageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredList.slice(start, start + PAGE_SIZE)
  }, [filteredList, currentPage])

  // 필터나 탭 변경 시 1페이지로 리셋 및 선택 초기화
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setCurrentPage(1)
    setSelectedItemIds(new Set())
  }

  const handleProductChange = (prod: string) => {
    setSelectedProduct(prod)
    setCurrentPage(1)
    setSelectedItemIds(new Set())
  }

  const handleSearchChange = (kw: string) => {
    setSearchKeyword(kw)
    setCurrentPage(1)
    setSelectedItemIds(new Set())
  }

  // ----------------------------------------------------
  // 체크박스 선택 로직
  // ----------------------------------------------------
  const isPageAllSelected = useMemo(() => {
    if (currentPageItems.length === 0) return false
    return currentPageItems.every(entry => selectedItemIds.has(entry.item.id))
  }, [currentPageItems, selectedItemIds])

  const toggleSelectPageAll = () => {
    const next = new Set(selectedItemIds)
    if (isPageAllSelected) {
      currentPageItems.forEach(entry => next.delete(entry.item.id))
    } else {
      currentPageItems.forEach(entry => next.add(entry.item.id))
    }
    setSelectedItemIds(next)
  }

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedItemIds(next)
  }

  // ----------------------------------------------------
  // 전송 대상 목록(큐)에 담기
  // ----------------------------------------------------
  const queuedPhoneSet = useMemo(() => {
    return new Set(smsQueue.map(q => q.phone.replace(/[^0-9]/g, '')))
  }, [smsQueue])

  const handleAddSelectedToQueue = () => {
    if (selectedItemIds.size === 0) {
      alert('추가할 고객을 먼저 선택해주세요.')
      return
    }

    const targetEntries = filteredList.filter(entry => selectedItemIds.has(entry.item.id))
    let addedCount = 0

    const newQueueItems: { id: string; name: string; phone: string }[] = []
    targetEntries.forEach(entry => {
      const cleanPhone = entry.mobile.replace(/[^0-9]/g, '')
      if (!queuedPhoneSet.has(cleanPhone)) {
        newQueueItems.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: entry.name,
          phone: formatPhoneNumber(entry.mobile)
        })
        queuedPhoneSet.add(cleanPhone)
        addedCount++
      }
    })

    if (newQueueItems.length > 0) {
      setSmsQueue(prev => [...prev, ...newQueueItems])
    }

    alert(`${addedCount}명의 고객이 전송 대상 목록에 추가되었습니다. (이미 추가된 고객 제외)`)
    setSelectedItemIds(new Set())
  }

  const handleAddFilteredAllToQueue = () => {
    if (filteredList.length === 0) {
      alert('추가할 대상이 없습니다.')
      return
    }

    if (!confirm(`현재 조건의 전체 ${filteredList.length}명을 전송 대상 목록에 추가하시겠습니까?`)) {
      return
    }

    let addedCount = 0
    const newQueueItems: { id: string; name: string; phone: string }[] = []
    
    filteredList.forEach(entry => {
      const cleanPhone = entry.mobile.replace(/[^0-9]/g, '')
      if (!queuedPhoneSet.has(cleanPhone)) {
        newQueueItems.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: entry.name,
          phone: formatPhoneNumber(entry.mobile)
        })
        queuedPhoneSet.add(cleanPhone)
        addedCount++
      }
    })

    if (newQueueItems.length > 0) {
      setSmsQueue(prev => [...prev, ...newQueueItems])
    }

    alert(`${addedCount}명이 전송 대상 목록에 추가되었습니다.`)
  }

  // ----------------------------------------------------
  // 엑셀 다운로드 기능
  // ----------------------------------------------------
  const downloadExcel = (data: { name: string; phone: string }[], filename: string) => {
    if (data.length === 0) {
      alert('다운로드할 데이터가 없습니다.')
      return
    }
    const excelRows = data.map(d => ({
      '이름': d.name,
      '휴대폰번호': formatPhoneNumber(d.phone)
    }))

    const worksheet = XLSX.utils.json_to_sheet(excelRows)
    worksheet['!cols'] = [{ wch: 18 }, { wch: 18 }]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '문자대상목록')
    XLSX.writeFile(workbook, `${filename}.xlsx`)
  }

  const handleExportFilteredExcel = () => {
    const list = filteredList.map(e => ({ name: e.name, phone: e.mobile }))
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const tabName = activeTab === 'longterm' ? '장기고객' : '가입고객'
    downloadExcel(list, `${tabName}_${selectedProduct}_문자대상_${dateStr}`)
  }

  const handleExportQueueExcel = () => {
    const list = smsQueue.map(q => ({ name: q.name, phone: q.phone }))
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    downloadExcel(list, `전송대상목록_${dateStr}`)
  }

  // ----------------------------------------------------
  // 수동 추가 로직
  // ----------------------------------------------------
  const handleManualAdd = () => {
    if (!newPhone.trim()) {
      alert('전화번호를 입력해주세요.')
      return
    }
    let clean = newPhone.replace(/[^0-9]/g, '').trim()
    if (clean.startsWith('10')) clean = '0' + clean
    if (!clean.startsWith('01')) {
      if (!confirm('휴대폰 번호(010 등) 형식이 아닙니다. 계속 추가하시겠습니까?')) {
        return
      }
    }
    addToSmsQueue(newName.trim() || '이름없음', formatPhoneNumber(clean) || newPhone.trim())
    setNewName('')
    setNewPhone('')
  }

  // ----------------------------------------------------
  // 템플릿 관리 모달 로직
  // ----------------------------------------------------
  const handleOpenAddTemplate = () => {
    setEditingTemplateId(null)
    setTemplateTitle('')
    setTemplateContent('')
    setIsTemplateModalOpen(true)
  }

  const handleOpenEditTemplate = (template: { id: string; title: string; content: string }) => {
    setEditingTemplateId(template.id)
    setTemplateTitle(template.title)
    setTemplateContent(template.content)
    setIsTemplateModalOpen(true)
  }

  const handleSaveTemplate = () => {
    if (!templateTitle.trim() || !templateContent.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }
    if (editingTemplateId) {
      updateSmsTemplate(editingTemplateId, templateTitle, templateContent)
    } else {
      addSmsTemplate(templateTitle, templateContent)
    }
    setIsTemplateModalOpen(false)
  }

  // ----------------------------------------------------
  // 기본 문자앱 연동
  // ----------------------------------------------------
  const handleSendSms = () => {
    if (smsQueue.length === 0) {
      alert('전송할 대상이 없습니다. 번호를 추가해주세요.')
      return
    }
    if (!selectedTemplateId) {
      alert('전송할 자주 쓰는 문구를 선택해주세요.')
      return
    }

    const selectedTemplate = smsTemplates.find(t => t.id === selectedTemplateId)
    if (!selectedTemplate) return

    const phones = smsQueue
      .map(item => String(item.phone).replace(/[^0-9]/g, ''))
      .filter(p => p)
      .join(',')

    if (!phones) {
      alert('유효한 전화번호가 없습니다.')
      return
    }

    if (smsQueue.length > 20) {
      if (!confirm(`현재 전송 대상이 ${smsQueue.length}명입니다.\n스마트폰 기본 문자앱은 기기 환경에 따라 10~20명 이상일 경우 번호가 잘리거나 앱 오류가 발생할 수 있습니다.\n\n대량 발송의 경우 '엑셀 다운로드'를 통해 문자 사이트를 이용하시는 것을 권장합니다.\n\n그래도 기본 문자앱을 실행하시겠습니까?`)) {
        return
      }
    }

    const body = encodeURIComponent(selectedTemplate.content)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const separator = isIOS ? '&' : '?'
    
    window.location.href = `sms:${phones}${separator}body=${body}`
  }

  return (
    <div className="sms-page pb-[100px]">
      {/* 상단 헤더 */}
      <header className="header" style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: 800 }}>단체 문자 전송</h1>
      </header>

      <div style={{ padding: '16px' }}>
        {/* 탭 네비게이션: 장기고객 / 가입고객 / 수동추가 */}
        <div className="tab-container">
          <button 
            className={`tab-btn ${activeTab === 'longterm' ? 'active' : ''}`}
            onClick={() => handleTabChange('longterm')}
          >
            <Users size={16} />
            <span>장기고객 문자</span>
            <span className="tab-badge" title={`전체 ${longTermCustomers.length}명 중 발송 가능 ${longTermList.length}명`}>
              {longTermList.length}
            </span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'subscribed' ? 'active' : ''}`}
            onClick={() => handleTabChange('subscribed')}
          >
            <UserCheck size={16} />
            <span>가입고객 문자</span>
            <span className="tab-badge" title={`전체 ${subscribedCustomers.length}명 중 발송 가능 ${subscribedList.length}명`}>
              {subscribedList.length}
            </span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => handleTabChange('manual')}
          >
            <UserPlus size={16} />
            <span>수동 번호 추가</span>
          </button>
        </div>

        {/* 1. 수동 번호 추가 탭 컨텐츠 */}
        {activeTab === 'manual' && (
          <div className="card mt-4">
            <div className="card-title">
              <UserPlus size={18} />
              <span>수동 번호 직접 입력</span>
            </div>
            <p className="tab-desc">개별적으로 연락처를 입력하여 전송 대상 목록에 추가합니다.</p>
            <div className="add-form">
              <input 
                type="text" 
                placeholder="고객명 (선택)" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="form-input"
              />
              <input 
                type="tel" 
                placeholder="전화번호 (예: 01012345678)" 
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="form-input"
              />
              <button className="add-btn" onClick={handleManualAdd}>추가</button>
            </div>
          </div>
        )}

        {/* 2 & 3. 장기고객 / 가입고객 탭 컨텐츠 */}
        {(activeTab === 'longterm' || activeTab === 'subscribed') && (
          <div className="card mt-4">
            {/* 안내 배너 */}
            {activeTab === 'longterm' && (
              <div className="info-banner">
                <AlertCircle size={16} className="info-icon" />
                <span>
                  장기고객 전체 {longTermCustomers.length}명 중 <strong>가입고객 등록 번호 및 중복 번호가 자동 제외</strong>되어 총 {longTermList.length}명이 대상입니다.
                </span>
              </div>
            )}
            {activeTab === 'subscribed' && (
              <div className="info-banner">
                <AlertCircle size={16} className="info-icon" />
                <span>
                  가입고객 전체 {subscribedCustomers.length}명 중 <strong>중복 번호가 자동 제외</strong>되어 총 {subscribedList.length}명이 대상입니다.
                </span>
              </div>
            )}

            {/* 제품 필터 태그 */}
            <div className="product-tags">
              {productTags.map(tag => {
                const count = tag === '전체' 
                  ? currentBaseList.length 
                  : currentBaseList.filter(e => matchProductCategoryWithRules(e.model, tag, productCategoryRules)).length
                return (
                  <button
                    key={tag}
                    className={`product-tag ${selectedProduct === tag ? 'active' : ''}`}
                    onClick={() => handleProductChange(tag)}
                  >
                    <span>{tag}</span>
                    <span className="tag-count">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* 검색 및 액션 바 */}
            <div className="search-action-bar mt-3">
              <div className="search-box">
                <Search size={16} color="#94a3b8" />
                <input 
                  type="text"
                  placeholder="이름, 전화번호, 상세모델명 검색..."
                  value={searchKeyword}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="search-input"
                />
                {searchKeyword && (
                  <button className="clear-search" onClick={() => handleSearchChange('')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* 엑셀 다운로드 버튼 */}
              <button 
                className="excel-download-btn"
                onClick={handleExportFilteredExcel}
                title="현재 검색된 전체 명단을 대량문자용 엑셀로 다운로드합니다"
              >
                <FileSpreadsheet size={16} />
                <span>검색목록 엑셀저장 ({filteredList.length}명)</span>
              </button>
            </div>

            {/* 상단 컨트롤 영역 (선택 & 담기) */}
            <div className="list-controls mt-4">
              <div className="select-all-box" onClick={toggleSelectPageAll}>
                {isPageAllSelected ? (
                  <CheckSquare size={18} color="#3b82f6" />
                ) : (
                  <Square size={18} color="#94a3b8" />
                )}
                <span>현재 페이지 전체 선택 ({currentPageItems.length}명)</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  className="action-btn primary"
                  onClick={handleAddSelectedToQueue}
                  disabled={selectedItemIds.size === 0}
                >
                  선택한 {selectedItemIds.size}명 담기
                </button>
                <button 
                  className="action-btn outline"
                  onClick={handleAddFilteredAllToQueue}
                  disabled={filteredList.length === 0}
                >
                  전체 {filteredList.length}명 일괄 담기
                </button>
              </div>
            </div>

            {/* 고객 목록 테이블 / 리스트 */}
            <div className="customer-list-box mt-3">
              {currentPageItems.length === 0 ? (
                <div className="empty-box">
                  <p>조건에 일치하는 고객이 없습니다.</p>
                </div>
              ) : (
                <div className="customer-table">
                  {currentPageItems.map(({ item, mobile, name, model }) => {
                    const isSelected = selectedItemIds.has(item.id)
                    const isAlreadyQueued = queuedPhoneSet.has(mobile.replace(/[^0-9]/g, ''))
                    return (
                      <div 
                        key={item.id} 
                        className={`customer-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSelectItem(item.id)}
                      >
                        <div className="col-check">
                          {isSelected ? (
                            <CheckSquare size={18} color="#3b82f6" />
                          ) : (
                            <Square size={18} color="#cbd5e1" />
                          )}
                        </div>
                        <div className="col-info">
                          <div className="name-box">
                            <span className="cust-name">{name}</span>
                            {isAlreadyQueued && <span className="queued-badge">담김</span>}
                          </div>
                          <span className="cust-phone">{formatPhoneNumber(mobile)}</span>
                        </div>
                        <div className="col-model">
                          <span className="cust-model" title={model}>{model || '모델명 없음'}</span>
                          <span className="cust-addr">{(item as any).설치주소 || (item as any).주소 || ''}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="pagination mt-3">
                <button 
                  className="page-nav-btn" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="page-indicator">
                  {currentPage} / {totalPages} (총 {filteredList.length}명)
                </span>
                <button 
                  className="page-nav-btn" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* 공통 하단: 전송 대상 목록 (장바구니) */}
        {/* ---------------------------------------------------- */}
        <div className="card mt-4">
          <div className="card-title" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="#3b82f6" />
              <span>전송 대상 목록 ({smsQueue.length}명)</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {smsQueue.length > 0 && (
                <>
                  <button 
                    className="excel-small-btn" 
                    onClick={handleExportQueueExcel}
                    title="전송 대상 목록을 엑셀로 저장합니다"
                  >
                    <Download size={13} />
                    <span>엑셀저장</span>
                  </button>
                  <button 
                    className="clear-btn" 
                    onClick={() => confirm('전송 대상 목록을 모두 지우시겠습니까?') && clearSmsQueue()}
                  >
                    전체 초기화
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="queue-list">
            {smsQueue.length === 0 ? (
              <p className="empty-text">전송할 고객을 상단에서 선택하여 담아주세요.</p>
            ) : (
              smsQueue.map(item => (
                <div key={item.id} className="queue-item">
                  <div className="queue-info">
                    <span className="queue-name">{item.name}</span>
                    <span className="queue-phone">{item.phone}</span>
                  </div>
                  <button className="delete-btn" onClick={() => removeFromSmsQueue(item.id)}>
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 자주 보내는 문구 선택 */}
        <div className="card mt-4">
          <div className="card-title" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={18} color="#3b82f6" />
              <span>자주 보내는 문구 선택</span>
            </div>
            <button className="add-template-btn" onClick={handleOpenAddTemplate}>+ 새 문구</button>
          </div>

          <div className="template-list">
            {smsTemplates.length === 0 ? (
              <p className="empty-text">저장된 문구가 없습니다. 새 문구를 추가해주세요.</p>
            ) : (
              smsTemplates.map(template => (
                <div 
                  key={template.id} 
                  className={`template-item ${selectedTemplateId === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <div className="template-header">
                    <span className="template-title">{template.title}</span>
                    <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <button className="icon-btn edit" onClick={() => handleOpenEditTemplate(template)}><Edit size={14} /></button>
                      <button className="icon-btn delete" onClick={() => confirm('삭제하시겠습니까?') && deleteSmsTemplate(template.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="template-content">{template.content}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 전송 버튼 */}
        <button 
          className="send-btn mt-6"
          onClick={handleSendSms}
          disabled={smsQueue.length === 0 || !selectedTemplateId}
        >
          <Send size={20} />
          <span>기본 문자 앱으로 전송하기 ({smsQueue.length}명)</span>
        </button>
      </div>

      {/* 템플릿 추가/수정 모달 */}
      {isTemplateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTemplateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTemplateId ? '문구 수정' : '새 문구 추가'}</h2>
              <button className="close-btn" onClick={() => setIsTemplateModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="form-group">
                <label>제목 (어떤 상황인지 등)</label>
                <input 
                  type="text" 
                  value={templateTitle} 
                  onChange={e => setTemplateTitle(e.target.value)} 
                  placeholder="예: 정수기 필터 교체 및 할인 안내"
                  className="modal-input"
                />
              </div>
              <div className="form-group mt-3">
                <label>문자 내용</label>
                <textarea 
                  value={templateContent} 
                  onChange={e => setTemplateContent(e.target.value)}
                  placeholder="고객에게 전송될 메시지 내용..."
                  className="modal-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={() => setIsTemplateModalOpen(false)}>취소</button>
              <button className="modal-save-btn" onClick={handleSaveTemplate}>저장</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mt-3 { margin-top: 12px; }
        .mt-4 { margin-top: 16px; }
        .mt-6 { margin-top: 24px; }

        /* 탭 네비게이션 스타일 */
        .tab-container {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
        }
        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 8px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: #ffffff;
          color: #1e293b;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }
        .tab-badge {
          background: #e2e8f0;
          color: #475569;
          font-size: 0.72rem;
          padding: 1px 6px;
          border-radius: 10px;
        }
        .tab-btn.active .tab-badge {
          background: #dbeafe;
          color: #2563eb;
        }
        .tab-desc {
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 4px;
          margin-bottom: 8px;
        }

        /* 안내 배너 */
        .info-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          margin-bottom: 12px;
        }
        .info-icon {
          flex-shrink: 0;
        }

        /* 제품 태그 */
        .product-tags {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: thin;
        }
        .product-tag {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .product-tag.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }
        .tag-count {
          font-size: 0.7rem;
          background: rgba(0, 0, 0, 0.07);
          padding: 1px 5px;
          border-radius: 8px;
        }
        .product-tag.active .tag-count {
          background: rgba(255, 255, 255, 0.25);
          color: white;
        }

        /* 검색 & 엑셀 액션바 */
        .search-action-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .search-box {
          flex: 1;
          min-width: 180px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 8px;
        }
        .search-input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.85rem;
          width: 100%;
        }
        .clear-search {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0;
        }
        .excel-download-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #10b981;
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s;
        }
        .excel-download-btn:hover {
          background: #059669;
        }
        .excel-small-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        /* 컨트롤 영역 */
        .list-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .select-all-box {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 700;
          color: #475569;
          user-select: none;
        }
        .action-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn.primary {
          background: #3b82f6;
          color: white;
          border: none;
        }
        .action-btn.primary:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }
        .action-btn.outline {
          background: white;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .action-btn.outline:disabled {
          color: #cbd5e1;
          border-color: #f1f5f9;
          cursor: not-allowed;
        }

        /* 고객 리스트 테이블 */
        .customer-list-box {
          max-height: 420px;
          overflow-y: auto;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
        }
        .customer-table {
          display: flex;
          flex-direction: column;
        }
        .customer-row {
          display: flex;
          align-items: center;
          padding: 10px 12px;
          border-bottom: 1px solid #f8fafc;
          cursor: pointer;
          gap: 12px;
          transition: background 0.15s;
        }
        .customer-row:last-child {
          border-bottom: none;
        }
        .customer-row:hover {
          background: #f8fafc;
        }
        .customer-row.selected {
          background: #eff6ff;
        }
        .col-check {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .col-info {
          display: flex;
          flex-direction: column;
          min-width: 110px;
          flex-shrink: 0;
        }
        .name-box {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cust-name {
          font-weight: 700;
          font-size: 0.88rem;
          color: #1e293b;
        }
        .queued-badge {
          background: #e0e7ff;
          color: #4338ca;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 4px;
        }
        .cust-phone {
          font-size: 0.78rem;
          color: #64748b;
        }
        .col-model {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        .cust-model {
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cust-addr {
          font-size: 0.72rem;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .empty-box {
          padding: 40px 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
        }

        /* 페이지네이션 */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 6px 0;
        }
        .page-nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #475569;
          cursor: pointer;
        }
        .page-nav-btn:disabled {
          color: #cbd5e1;
          border-color: #f1f5f9;
          cursor: not-allowed;
        }
        .page-indicator {
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
        }

        /* 수동 입력 폼 */
        .add-form {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .form-input {
          flex: 1;
          min-width: 0;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          outline: none;
        }
        .form-input:focus { border-color: #3b82f6; }
        .add-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .clear-btn {
          background: #fee2e2;
          color: #ef4444;
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        .empty-text {
          color: #94a3b8;
          font-size: 0.85rem;
          text-align: center;
          padding: 10px 0;
        }
        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
          max-height: 200px;
          overflow-y: auto;
        }
        .queue-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }
        .queue-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .queue-name { font-weight: 700; font-size: 0.9rem; color: #1e293b; }
        .queue-phone { color: #64748b; font-size: 0.85rem; }
        .delete-btn {
          background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 4px;
        }
        .delete-btn:hover { color: #ef4444; }

        .add-template-btn {
          background: #f1f5f9;
          color: #3b82f6;
          border: 1px solid #e2e8f0;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        .template-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        .template-item {
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .template-item.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }
        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .template-title {
          font-weight: 800;
          font-size: 0.95rem;
          color: #0f172a;
        }
        .icon-btn {
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 4px;
          border-radius: 4px;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover { background: #f8fafc; }
        .template-content {
          font-size: 0.85rem;
          color: #475569;
          white-space: pre-wrap;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .send-btn {
          width: 100%;
          background: var(--primary-color, #1e293b);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 1.05rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .send-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }
        .send-btn:not(:disabled):active {
          transform: scale(0.98);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
          z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal-content {
          background: #fff; width: 100%; max-width: 400px; border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px; border-bottom: 1px solid #f1f5f9;
        }
        .modal-header h2 { font-size: 1.1rem; font-weight: 800; margin: 0; }
        .close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0; }
        .form-group label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 6px; }
        .modal-input, .modal-textarea {
          width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 10px;
          font-size: 0.9rem; outline: none; box-sizing: border-box;
        }
        .modal-input:focus, .modal-textarea:focus { border-color: #3b82f6; }
        .modal-textarea { min-height: 120px; resize: vertical; }
        .modal-footer {
          padding: 16px 20px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc;
        }
        .modal-cancel-btn {
          padding: 10px 16px; background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; font-weight: 700; color: #475569; cursor: pointer;
        }
        .modal-save-btn {
          padding: 10px 20px; background: #3b82f6; border: none; border-radius: 10px; font-weight: 700; color: #fff; cursor: pointer;
        }
      `}</style>
    </div>
  )
}
