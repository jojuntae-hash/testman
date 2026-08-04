'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, X, MapPin, FolderPlus, Trash2, Map } from 'lucide-react'
import { useData } from '@/lib/DataContext'

const formatShortAddress = (addr: string) => {
  if (!addr) return ''
  return addr.replace(/^(?:[가-힣]+(?:시|도)\s+)?(?:[가-힣]+(?:구|군|시)\s+)?/, '').trim()
}

export default function SubscribedCustomersPage() {
  const router = useRouter()
  const { subscribedCustomers, changeSubscribedCustomerStatus, deleteSubscribedCustomers, folderColors, updateFolderColor } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('전체')
  const [sortOption, setSortOption] = useState('name')
  
  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // 폴더 모달
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6')

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedFolder, itemsPerPage, sortOption])

  // 마운트 시 이전에 선택했던 정렬 기준 복구
  React.useEffect(() => {
    const savedSort = localStorage.getItem('lastSortOption_sub')
    if (savedSort) {
      setSortOption(savedSort)
    }
    const savedFolder = localStorage.getItem('lastFolder_sub')
    if (savedFolder) {
      setSelectedFolder(savedFolder)
    }
  }, [])

  const folders = useMemo(() => {
    const unique = Array.from(new Set(subscribedCustomers.map(c => c.status || '미분류')))
    return ['전체', ...unique]
  }, [subscribedCustomers])

  const getModelCategory = (modelName?: string) => {
    if (!modelName) return '기타'
    const lower = modelName.toLowerCase()
    if (lower.startsWith('cp')) return '정수기'
    if (lower.startsWith('ac')) return '공기청정기'
    if (lower.startsWith('cbt')) return '비데'
    return '기타'
  }

  const getModelTypeBadge = (modelName?: string) => {
    const category = getModelCategory(modelName)
    let typeClass = ''
    if (category === '정수기') typeClass = 'purifier'
    else if (category === '공기청정기') typeClass = 'air-cleaner'
    else if (category === '비데') typeClass = 'bidet'
    else return null

    return (
      <span className={`model-badge ${typeClass}`}>
        {category}
      </span>
    )
  }

  const getElapsedMonths = (contractDate?: string) => {
    if (!contractDate) return 0
    const start = new Date(contractDate)
    const end = new Date()
    if (isNaN(start.getTime())) return 0

    let diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    if (end.getDate() < start.getDate()) {
      diff--
    }
    return Math.max(0, diff)
  }

  const getElapsedMonthsBadge = (contractDate?: string) => {
    const months = getElapsedMonths(contractDate)
    if (months === 0) return null
    return (
      <span className="model-badge elapsed-months">
        {months}개월
      </span>
    )
  }

  const getCompletionBadge = (date?: string) => {
    if (!date) return null
    const parts = date.split('-')
    if (parts.length === 3) {
      return <span className="model-badge comp-badge">{parts[1]}-{parts[2]} 완료</span>
    }
    return null
  }

  const filteredCustomers = useMemo(() => {
    const cleanSearch = searchTerm.replace(/\s+/g, '').toLowerCase()
    let list = subscribedCustomers || []

    if (selectedFolder !== '전체') {
      list = list.filter(c => (c.status || '미분류') === selectedFolder)
    }

    if (cleanSearch) {
      list = list.filter(c => {
        const name = (c.고객명_상호 || '').replace(/\s+/g, '').toLowerCase()
        const phone1 = (c.전화번호 || '').replace(/\s+/g, '').toLowerCase()
        const phone2 = (c.핸드폰번호 || '').replace(/\s+/g, '').toLowerCase()
        const addr = (c.주소 || '').replace(/\s+/g, '').toLowerCase()
        const model = (c.모델명 || '').replace(/\s+/g, '').toLowerCase()
        const record = (c.현장메모 || '').replace(/\s+/g, '').toLowerCase()
        return name.includes(cleanSearch) || phone1.includes(cleanSearch) || phone2.includes(cleanSearch) || addr.includes(cleanSearch) || model.includes(cleanSearch) || record.includes(cleanSearch)
      })
    }

    return list.sort((a, b) => {
      switch (sortOption) {
        case 'model':
          return (getModelCategory(a.모델명) || '').localeCompare(getModelCategory(b.모델명) || '')
        case 'join-desc':
          return (b.계약일자 || '').localeCompare(a.계약일자 || '')
        case 'join-asc':
          return (a.계약일자 || '').localeCompare(b.계약일자 || '')
        case 'months-asc':
          return getElapsedMonths(a.계약일자) - getElapsedMonths(b.계약일자)
        case 'months-desc':
          return getElapsedMonths(b.계약일자) - getElapsedMonths(a.계약일자)
        case 'name':
        default:
          return (a.고객명_상호 || '').localeCompare(b.고객명_상호 || '')
      }
    })
  }, [subscribedCustomers, searchTerm, selectedFolder, sortOption])

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const toggleSelectAll = () => {
    if (paginatedCustomers.length > 0 && selectedIds.length === paginatedCustomers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedCustomers.map(c => c.id))
    }
  }

  const handleDelete = async () => {
    if (selectedIds.length === 0) return
    if (confirm('선택한 가입 고객을 삭제하시겠습니까?')) {
      await deleteSubscribedCustomers(selectedIds)
      setSelectedIds([])
    }
  }

  const handleMapClick = () => {
    if (selectedIds.length === 0) return
    sessionStorage.setItem('map_selected_ids', JSON.stringify(selectedIds))
    router.push('/map?type=longTerm')
  }

  const handleCreateNewFolder = () => {
    if (!newFolderName || newFolderName.trim() === '') return
    const folderName = newFolderName.trim()
    changeSubscribedCustomerStatus(selectedIds, folderName)
    updateFolderColor(folderName, newFolderColor)
    setSelectedIds([])
    setNewFolderName('')
    setIsFolderModalOpen(false)
  }

  const handleMoveToExistingFolder = (folderName: string) => {
    changeSubscribedCustomerStatus(selectedIds, folderName)
    setSelectedIds([])
    setIsFolderModalOpen(false)
  }

  const uniqueExistingFolders = Array.from(new Set(subscribedCustomers.map(c => c.status).filter(s => s && s !== '미분류')))

  return (
    <div className="customers-page">
      <div className="view-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <div className="header-text">
          <h1>가입고객 리스트</h1>
          <p>가입고객 관리를 위한 리스트입니다.</p>
        </div>
      </div>

      <div className="search-section">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="이름, 전화번호, 주소 검색 (띄어쓰기 무시)" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <X size={18} className="clear-icon" onClick={() => setSearchTerm('')} />}
        </div>
        
        <div className="category-filters">
          {folders.map(folder => (
            <button 
              key={folder}
              className={`cat-btn ${selectedFolder === folder ? 'active' : ''}`}
              onClick={() => {
                setSelectedFolder(folder)
                localStorage.setItem('lastFolder_sub', folder)
              }}
            >
              {folder}
            </button>
          ))}
        </div>
      </div>

      <div className="list-section">
        <div className="list-title">
          <div className="list-title-left">
            <h3>총 {filteredCustomers.length}명</h3>
            <button className="select-all-text-btn" onClick={toggleSelectAll}>
              {paginatedCustomers.length > 0 && selectedIds.length === paginatedCustomers.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          
          <div className="list-title-right">
            <select 
              className="items-per-page-select sort-select"
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value)
                localStorage.setItem('lastSortOption_sub', e.target.value)
              }}
            >
              <option value="name">이름순</option>
              <option value="model">장비순</option>
              <option value="join-desc">가입일 최신순</option>
              <option value="join-asc">가입일 오래된순</option>
              <option value="months-asc">개월수 오름차순</option>
              <option value="months-desc">개월수 내림차순</option>
            </select>
          </div>
        </div>

        <div className="lt-customer-list">
          {paginatedCustomers.length === 0 ? <div className="empty-state">해당하는 고객이 없습니다.</div> : (
            paginatedCustomers.map((customer) => (
              <div 
                key={customer.id} 
                className={`lt-customer-item ${selectedIds.includes(customer.id) ? 'selected' : ''}`}
                onClick={() => toggleSelect(customer.id)}
              >
                <div className="item-header">
                  <div className="item-title-row">
                    <p className="font-bold">{customer.고객명_상호}</p>
                    {getModelTypeBadge(customer.모델명)}
                    {getElapsedMonthsBadge(customer.계약일자)}
                  </div>
                  <button className="detail-link-btn" onClick={(e) => { e.stopPropagation(); router.push(`/subscribed/${customer.id}`); }}>
                    상세 <ChevronRight size={14} />
                  </button>
                </div>
                <div className="item-details">
                  <div className="detail-text">
                    {customer.핸드폰번호 || customer.전화번호 || '번호없음'} | {customer.주소 || customer.설치주소 || '주소없음'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="page-btn" 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              이전
            </button>
            <span className="page-info">{currentPage} / {totalPages}</span>
            <button 
              className="page-btn" 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 하단 다중 선택 액션 바 */}
      {selectedIds.length > 0 && (
        <nav className="bottom-nav selection-mode">
          <div className="selection-info-container">
            <div className="selection-info">
              <span className="count">{selectedIds.length}</span>명 선택됨
            </div>
            <button className="clear-selection-btn" onClick={() => setSelectedIds([])}>전체해제</button>
          </div>
          <div className="action-buttons">
            <button className="action-btn" onClick={handleMapClick}>
              <Map size={18} />
              <span>지도</span>
            </button>
            <button className="action-btn folder-btn" onClick={() => setIsFolderModalOpen(true)}>
              <FolderPlus size={18} />
              <span>폴더</span>
            </button>
            <button className="action-btn delete-btn" onClick={handleDelete}>
              <Trash2 size={18} />
              <span>삭제</span>
            </button>
          </div>
        </nav>
      )}

      {/* 폴더 변경 모달 */}
      {isFolderModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFolderModalOpen(false)}>
          <div className="modal-content animated-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>선택한 {selectedIds.length}명을 폴더로 이동</h2>
              <button className="close-btn" onClick={() => setIsFolderModalOpen(false)}>×</button>
            </div>
            
            <div className="modal-section">
              <label className="section-label">새 폴더 만들기</label>
              <div className="new-folder-group">
                <input 
                  type="color" 
                  className="new-folder-color" 
                  value={newFolderColor} 
                  onChange={e => setNewFolderColor(e.target.value)}
                  title="폴더 색상 선택"
                />
                <input
                  type="text"
                  placeholder="새 폴더 이름을 입력하세요..."
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateNewFolder()}
                />
                <button className="create-submit-btn" onClick={handleCreateNewFolder}>만들기</button>
              </div>
            </div>

            <div className="modal-section">
              <label className="section-label">기존 폴더에 넣기</label>
              <div className="existing-folders-list">
                <button
                  className="existing-folder-item"
                  onClick={() => handleMoveToExistingFolder('미분류')}
                >
                  <FolderPlus size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <span>미분류</span>
                </button>
                {uniqueExistingFolders.map(folder => (
                  <button
                    key={folder}
                    className="existing-folder-item"
                    onClick={() => handleMoveToExistingFolder(folder as string)}
                  >
                    <FolderPlus size={14} style={{ color: folderColors[folder as string] || '#fbbf24', flexShrink: 0 }} />
                    <span>{folder}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .customers-page { padding: 0; padding-bottom: 120px; background: #f8fafc; min-height: 100%; }
        .view-header { height: 70px; display: flex; align-items: center; padding: 0 15px; border-bottom: 1px solid #f1f5f9; background: #fff; position: sticky; top: 0; z-index: 100; margin-bottom: 15px; }
        .back-btn { background: none; border: none; width: 40px; height: 40px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #64748b; margin-left: -10px; }
        .header-text h1 { font-size: 1.1rem; font-weight: 800; margin: 0; color: #1e293b; }
        .header-text p { font-size: 0.75rem; color: #94a3b8; margin: 0; font-weight: 500; }
        
        .search-section { padding: 0 15px 15px 15px; background: #fff; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; }
        .search-box { display: flex; align-items: center; background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 15px; margin-bottom: 15px; }
        .search-icon { color: #999; margin-right: 10px; }
        .clear-icon { color: #ccc; cursor: pointer; }
        .search-box input { flex: 1; border: none; outline: none; font-size: 0.95rem; color: #1e293b; background: transparent; }
        .search-box input::placeholder { color: #999; }
        
        .category-filters { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; }
        .category-filters::-webkit-scrollbar { display: none; }
        .cat-btn { padding: 6px 14px; background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; border-radius: 20px; font-size: 0.8rem; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
        .cat-btn.active { background: #0f172a; color: #fff; border-color: #0f172a; }
        
        .list-section { padding: 0 15px; }
        .list-title { margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
        .list-title-left { display: flex; align-items: center; gap: 10px; }
        .list-title-left h3 { margin: 0; font-size: 0.9rem; color: #1e293b; font-weight: 800; }
        .select-all-text-btn { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: #64748b; cursor: pointer; }
        .list-title-right { display: flex; gap: 8px; }
        .items-per-page-select { padding: 6px 10px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.8rem; font-weight: 600; color: #475569; outline: none; background: #fff; }
        
        .lt-customer-list { display: flex; flex-direction: column; gap: 12px; }
        .lt-customer-item { background: #fff; padding: 15px; border-radius: 18px; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; position: relative; }
        .lt-customer-item.selected { border-color: #3b82f6; background: #f0f7ff; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .item-title-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
        .font-bold { font-size: 1rem; font-weight: 800; color: #1e293b; margin: 0; margin-right: 4px; }
        
        :global(.model-badge) { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; }
        :global(.model-badge.purifier) { background: #eff6ff; color: #3b82f6; }
        :global(.model-badge.air-cleaner) { background: #ecfdf5; color: #10b981; }
        :global(.model-badge.bidet) { background: #fff7ed; color: #ea580c; }
        :global(.model-badge.elapsed-months) { background: #f1f5f9; color: #475569; }
        :global(.model-badge.comp-badge) { border: 1px solid #10b981; color: #10b981; background: transparent; }
        
        .detail-link-btn { display: flex; align-items: center; gap: 2px; background: #fff; color: #64748b; border: 1px solid #e2e8f0; padding: 4px 8px 4px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .detail-link-btn:active { background: #f1f5f9; }
        
        .item-details { display: flex; flex-direction: column; gap: 4px; }
        .detail-text { font-size: 0.8rem; color: #64748b; line-height: 1.4; word-break: keep-all; }
        
        .empty-state { text-align: center; padding: 40px 0; color: #94a3b8; font-size: 0.9rem; }
        
        .pagination { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 25px; margin-bottom: 20px; }
        .page-btn { padding: 8px 16px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.85rem; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.2s; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .page-btn:not(:disabled):hover { background: #f8fafc; }
        .page-info { font-size: 0.9rem; font-weight: 700; color: #334155; }

        /* 다중 선택 액션 바 (메인화면 스타일 일치) */
        .bottom-nav.selection-mode {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 600px;
          background: #0f172a;
          color: #fff;
          padding: 0 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: none;
          height: 70px;
          z-index: 9999;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
        }
        .selection-info-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .clear-selection-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .clear-selection-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }
        .clear-selection-btn:active {
          transform: scale(0.95);
        }
        .selection-info {
          font-size: 0.8rem;
          font-weight: 800;
          white-space: nowrap;
          color: #94a3b8;
        }
        .selection-info .count {
          color: #3b82f6;
          font-size: 1rem;
          margin-right: 2px;
        }
        .action-buttons {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .action-btn {
          background: transparent;
          color: #cbd5e1;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 4px 6px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .action-btn:active {
          background: #1e293b;
          color: #fff;
        }
        .action-btn.folder-btn { color: #fbbf24; }
        .action-btn.delete-btn { color: #f87171; }

        /* Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { background: #fff; width: 100%; max-width: 400px; border-radius: 24px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
        .animated-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .modal-header h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
        .close-btn { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; line-height: 1; }
        
        .modal-section { margin-bottom: 20px; }
        .modal-section:last-child { margin-bottom: 0; }
        .section-label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; }
        .new-folder-group { display: flex; gap: 8px; }
        .new-folder-color { width: 38px; height: 38px; padding: 0; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; flex-shrink: 0; background: #fff; }
        .new-folder-color::-webkit-color-swatch-wrapper { padding: 0; }
        .new-folder-color::-webkit-color-swatch { border: none; border-radius: 9px; }
        .new-folder-group input[type="text"] { flex: 1; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.9rem; outline: none; color: #1e293b; background: #fff; }
        .new-folder-group input[type="text"]:focus { border-color: #3b82f6; }
        .create-submit-btn { background: #3b82f6; color: #fff; border: none; padding: 0 16px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background 0.2s; }
        .create-submit-btn:hover { background: #2563eb; }
        
        .existing-folders-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; max-height: 200px; overflow-y: auto; }
        .existing-folder-item { background: #f8fafc; border: 1px solid #f1f5f9; padding: 10px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; color: #334155; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; text-align: left; }
        .existing-folder-item:hover { background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; }
        .existing-folder-item span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
      `}</style>
    </div>
  )
}
