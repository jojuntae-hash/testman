'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Map, ChevronRight, Search, X, FolderPlus, Trash2 } from 'lucide-react'
import { useData } from '@/lib/DataContext'

export default function CustomerList() {
  const { customers, setCustomers, selectedIds, setSelectedIds } = useData()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  // 삭제되지 않은 고객만 필터링 + 검색어 적용
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.status === '작업미완료' && 
      (c.고객명_상호.includes(searchTerm) || 
       c.전화번호.includes(searchTerm) || 
       (c.설치주소 && c.설치주소.includes(searchTerm)) || 
       (c.주소 && c.주소.includes(searchTerm)) ||
       (c.모델명 && c.모델명.includes(searchTerm)))
    )
  }, [customers, searchTerm])

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const toggleSelectAll = () => {
    if (filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id))
    }
  }

  // 일괄 상태 변경 공통 함수
  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedIds.length === 0) return
    const msg = newStatus === '삭제됨' ? '삭제하시겠습니까?' : `'${newStatus}' 상태로 변경하시겠습니까?`
    if (confirm(msg)) {
      const updated = customers.map(c => selectedIds.includes(c.id) ? { ...c, status: newStatus } : c)
      setCustomers(updated as any); setSelectedIds([]);
    }
  }

  // 커스텀 폴더 생성
  const handleCreateFolder = () => {
    const folderName = prompt('새로운 폴더 이름을 입력해 주세요.')
    if (!folderName || folderName.trim() === '') return
    const updated = customers.map(c => selectedIds.includes(c.id) ? { ...c, status: folderName.trim() } : c)
    setCustomers(updated as any); setSelectedIds([]);
  }

  return (
    <div className="customer-list-container">
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="이름, 전화번호, 주소, 모델명 검색..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <X size={18} className="clear-icon" onClick={() => setSearchTerm('')} />}
        </div>
      </div>

      <div className="list-header flex-between">
        <button className="select-all-btn" onClick={toggleSelectAll}>
          {filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length ? '전체 해제' : '전체 선택'}
        </button>
        <span className="text-xs text-sub">총 {filteredCustomers.length}명</span>
      </div>

      <div className="customer-grid">
        {filteredCustomers.map((customer) => (
          <div 
            key={customer.id} 
            className={`customer-card-small ${selectedIds.includes(customer.id) ? 'selected' : ''}`}
            onClick={() => toggleSelect(customer.id)}
          >
            <div className="card-top">
              <span className={`status-tag status-${customer.status}`}>
                {customer.status}
              </span>
            </div>
            <div className="card-info">
              <h3 className="customer-name">{customer.고객명_상호}</h3>
              <p className="customer-phone">{customer.전화번호}</p>
              <p className="customer-addr">{customer.설치주소 || customer.주소}</p>
            </div>
            <div className="card-actions">
              <button className="view-detail-btn" onClick={(e) => { e.stopPropagation(); router.push(`/detail/${customer.id}`); }}>
                상세보기 <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
        {filteredCustomers.length === 0 && <div className="empty-state">검색 결과가 없습니다.</div>}
      </div>



      <style jsx>{`
        .customer-list-container { padding: 15px; padding-bottom: 120px; }
        .search-bar { margin-bottom: 20px; }
        .search-input-wrapper { position: relative; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 12px; color: #999; }
        .clear-icon { position: absolute; right: 12px; color: #ccc; cursor: pointer; }
        .search-bar input { width: 100%; padding: 12px 40px; border-radius: 12px; border: 1px solid var(--border-color); background: #f8f9fa; font-size: 0.95rem; }
        .list-header { margin-bottom: 15px; padding: 0 5px; }
        .select-all-btn { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: #64748b; cursor: pointer; }
        .customer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .customer-card-small { background: #fff; border-radius: 18px; padding: 15px; border: 1px solid var(--border-color); transition: all 0.2s; display: flex; flex-direction: column; gap: 8px; position: relative; cursor: pointer; }
        .customer-card-small.selected { border-color: var(--primary-color); background: #f0f7ff; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .status-tag { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; background: #f1f5f9; color: #64748b; }
        .status-tag.status-작업완료 { background: #ecfdf5; color: #10b981; }
        .status-tag.status-예약완료 { background: #eef2ff; color: #4f46e5; }
        .status-tag.status-작업미완료 { background: #f5f5f5; color: #888; }
        .customer-name { font-size: 0.95rem; font-weight: 700; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .customer-phone { font-size: 0.8rem; color: #666; margin-bottom: 4px; }
        .customer-addr { font-size: 0.75rem; color: #999; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 32px; }
        .card-actions { margin-top: auto; border-top: 1px solid #f0f0f0; padding-top: 8px; }
        .view-detail-btn { width: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--primary-color); font-weight: 600; }

        .empty-state { grid-column: span 2; padding: 40px 0; text-align: center; color: #999; }

        .flex-between { display: flex; align-items: center; justify-content: space-between; }
      `}</style>
    </div>
  )
}
