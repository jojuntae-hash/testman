'use client'

import React, { useState, useMemo } from 'react'
import { useData } from '@/lib/DataContext'
import { useRouter } from 'next/navigation'
import { Folder, Clock, Calendar, CheckCircle2, ChevronRight, Trash2, FolderPlus, Map, ClipboardList, Search, Phone } from 'lucide-react'

export default function HomePage() {
  const { customers, setCustomers, selectedIds, setSelectedIds } = useData()
  const router = useRouter()
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const getModelTypeBadge = (modelName?: string) => {
    if (!modelName) return null
    const lower = modelName.toLowerCase()
    let text = ''
    let typeClass = ''
    if (lower.startsWith('cp')) {
      text = '정수기'
      typeClass = 'purifier'
    } else if (lower.startsWith('ac')) {
      text = '공기청정기'
      typeClass = 'air-cleaner'
    } else if (lower.startsWith('cbt')) {
      text = '비데'
      typeClass = 'bidet'
    } else {
      return null
    }

    return (
      <span className={`model-badge ${typeClass}`}>
        {text}
      </span>
    )
  }

  const getElapsedMonthsBadge = (contractDate?: string) => {
    if (!contractDate) return null
    const start = new Date(contractDate)
    const end = new Date()
    if (isNaN(start.getTime())) return null

    let diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    if (end.getDate() < start.getDate()) {
      diff--
    }
    const months = Math.max(0, diff)

    return (
      <span className="model-badge elapsed-months">
        {months}개월
      </span>
    )
  }

  const uniqueStatuses = useMemo(() => {
    const statuses = Array.from(new Set(customers.map(c => c.status)))
    const priority = ['작업미완료', '예약완료', '작업완료', '삭제됨']
    return statuses.sort((a, b) => {
      const indexA = priority.indexOf(a)
      const indexB = priority.indexOf(b)
      if (indexA === -1 && indexB === -1) return a.localeCompare(b)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
  }, [customers])

  const stats = useMemo(() => {
    const statusStats = uniqueStatuses.map(status => {
      let icon = <Folder size={24} />
      let color = '#34495e'
      let bgColor = '#f8fafc'
      let label = status
      if (status === '작업미완료') { label = '작업 미완료'; icon = <Clock size={24} />; color = '#666'; bgColor = '#f5f5f5'; }
      else if (status === '예약완료') { label = '예약 완료'; icon = <Calendar size={24} />; color = '#4f46e5'; bgColor = '#eef2ff'; }
      else if (status === '작업완료') { label = '작업 완료'; icon = <CheckCircle2 size={24} />; color = '#10b981'; bgColor = '#ecfdf5'; }
      else if (status === '삭제됨') { label = '삭제됨'; icon = <Trash2 size={24} />; color = '#ff4d4f'; bgColor = '#fff0f0'; }
      return { label, count: customers.filter(c => c.status === status).length, icon, color, bgColor, status }
    })

    // 전체리스트 추가 (삭제됨 제외)
    const allList = {
      label: '전체 리스트',
      count: customers.filter(c => c.status !== '삭제됨').length,
      icon: <ClipboardList size={24} />,
      color: '#3b82f6',
      bgColor: '#eff6ff',
      status: '전체리스트'
    }

    return [allList, ...statusStats]
  }, [uniqueStatuses, customers])

  const filteredCustomers = useMemo(() => {
    let list = customers.filter(c => c.status !== '삭제됨')
    if (selectedFolder && selectedFolder !== '전체리스트') {
      list = customers.filter(c => c.status === selectedFolder)
    }
    if (searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase()
      list = list.filter(c => 
        (c.고객명_상호 && c.고객명_상호.toLowerCase().includes(lowerTerm)) ||
        (c.전화번호 && c.전화번호.includes(lowerTerm)) ||
        (c.설치주소 && c.설치주소.toLowerCase().includes(lowerTerm)) ||
        (c.주소 && c.주소.toLowerCase().includes(lowerTerm)) ||
        (c.모델명 && c.모델명.toLowerCase().includes(lowerTerm))
      )
    }
    return list
  }, [customers, selectedFolder, searchTerm])

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedIds.length === 0) return
    const msg = newStatus === '삭제됨' ? '삭제하시겠습니까?' : `'${newStatus}' 상태로 변경하시겠습니까?`
    if (confirm(msg)) {
      const updated = customers.map(c => selectedIds.includes(c.id) ? { ...c, status: newStatus } : c)
      setCustomers(updated as any); setSelectedIds([]);
    }
  }

  const handleCreateFolder = () => {
    const folderName = prompt('새로운 폴더 이름을 입력해 주세요.')
    if (!folderName || folderName.trim() === '') return
    const updated = customers.map(c => selectedIds.includes(c.id) ? { ...c, status: folderName.trim() } : c)
    setCustomers(updated as any); setSelectedIds([]);
  }

  const toggleSelectAll = () => {
    if (filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id))
    }
  }

  return (
    <div className="home-page">
      <div className="view-header">
        <div className="header-text no-back">
          <h1>고객 리스트</h1>
          <p>폴더별로 고객을 분류하여 관리합니다.</p>
        </div>
      </div>

      <div className="folder-grid">
        {stats.map((stat) => (
          <div 
            key={stat.status} 
            className={`folder-card ${selectedFolder === stat.status ? 'active' : ''}`}
            onClick={() => { setSelectedFolder(stat.status); setSelectedIds([]); }}
            style={{ '--folder-color': stat.color, '--folder-bg': stat.bgColor } as any}
          >
            <div className="folder-icon" style={{ color: stat.color, background: stat.bgColor }}>{stat.icon}</div>
            <div className="folder-info">
              <span className="folder-label">{stat.label}</span>
              <span className="folder-count">{stat.count}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="search-section">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="이름, 전화번호, 주소, 모델명으로 검색" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="customer-list-section">
        <div className="flex-between list-title">
          <div className="title-with-btn">
            <h3>{selectedFolder === '전체리스트' ? '전체' : (selectedFolder || '전체')} 고객 목록</h3>
            <button className="select-all-mini-btn" onClick={toggleSelectAll}>
              {filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <span className="count-badge">총 {filteredCustomers.length}건</span>
        </div>

        <div className="status-customer-list">
          {filteredCustomers.length === 0 ? <div className="empty-state">해당하는 고객이 없습니다.</div> : (
            filteredCustomers.map((customer) => (
              <div 
                key={customer.id} 
                className={`status-customer-item ${selectedIds.includes(customer.id) ? 'selected' : ''}`}
                onClick={(e) => toggleSelect(customer.id, e)}
              >
                <div className="item-main">
                  <div className="item-title-row">
                    <p className="font-bold">{customer.고객명_상호}</p>
                    <span className={`folder-badge status-${customer.status}`}>{customer.status}</span>
                    {getModelTypeBadge(customer.모델명)}
                    {getElapsedMonthsBadge(customer.계약일자)}
                  </div>
                  <p className="text-xs text-sub">{customer.전화번호} | {customer.설치주소 || customer.주소}</p>
                </div>
                <div className="item-actions">
                  <button className="go-detail-mini-btn" onClick={(e) => { e.stopPropagation(); router.push(`/detail/${customer.id}`); }}>상세 <ChevronRight size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>



      <style jsx>{`
        .home-page { padding: 0; padding-bottom: 100px; background: #f8fafc; min-height: 100%; }
        .view-header { height: 80px; display: flex; align-items: center; padding: 0 20px; border-bottom: 1px solid #f1f5f9; background: #fff; sticky; top: 0; z-index: 100; margin-bottom: 20px; }
        .header-text.no-back { margin-left: 52px; } /* 뒤로가기 버튼이 있는 페이지의 타이틀 위치와 완벽 정렬 */
        .header-text h1 { font-size: 1.25rem; font-weight: 800; margin: 0; color: #1e293b; }
        .header-text p { font-size: 0.8rem; color: #94a3b8; margin: 0; font-weight: 500; }
        .folder-grid { padding: 0 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
        .customer-list-section { padding: 0 20px; }
        .folder-card { background: #fff; border: 1px solid var(--border-color); padding: 20px; border-radius: 20px; display: flex; align-items: center; gap: 15px; transition: all 0.2s; cursor: pointer; }
        .folder-card.active { border-color: var(--folder-color); background: var(--folder-bg); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .folder-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .folder-label { font-size: 0.85rem; color: #666; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80px; }
        .folder-count { font-size: 1.2rem; font-weight: 800; }
        .list-title { margin-bottom: 15px; align-items: flex-end; }
        .title-with-btn { display: flex; flex-direction: column; gap: 5px; }
        .select-all-mini-btn { align-self: flex-start; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; color: #64748b; cursor: pointer; }
        .count-badge { background: #f0f0f0; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; }
        .status-customer-list { display: flex; flex-direction: column; gap: 10px; }
        .status-customer-item { background: #fff; padding: 18px 20px; border-radius: 18px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s; }
        .status-customer-item.selected { border-color: var(--primary-color); background: #f0f7ff; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .item-main { flex: 1; min-width: 0; }
        .item-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .folder-badge { font-size: 0.65rem; padding: 1px 6px; border-radius: 4px; font-weight: 700; background: #f1f5f9; color: #64748b; white-space: nowrap; }
        .folder-badge.status-작업완료 { background: #ecfdf5; color: #10b981; }
        .folder-badge.status-예약완료 { background: #eef2ff; color: #4f46e5; }
        .folder-badge.status-작업미완료 { background: #f5f5f5; color: #888; }
        :global(.model-badge) { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; }
        :global(.model-badge.purifier) { background: #eff6ff; color: #3b82f6; }
        :global(.model-badge.air-cleaner) { background: #ecfdf5; color: #10b981; }
        :global(.model-badge.bidet) { background: #fff7ed; color: #ea580c; }
        :global(.model-badge.elapsed-months) { background: #f1f5f9; color: #475569; }
        .item-main p { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .item-actions { display: flex; align-items: center; gap: 6px; }
        .action-circle-btn { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; text-decoration: none; transition: all 0.2s; }
        .action-circle-btn:active { transform: scale(0.9); }
        .action-circle-btn.phone { background: #10b981; }
        .go-detail-mini-btn { padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.75rem; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 2px; }

        .empty-state { text-align: center; padding: 40px 0; color: #999; font-size: 0.9rem; }
        .font-bold { font-weight: 700; }
        .text-xs { font-size: 0.75rem; }
        .flex-between { display: flex; align-items: center; justify-content: space-between; }

        .search-section { padding: 0 20px 20px 20px; }
        .search-box { display: flex; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 15px; }
        .search-icon { color: #94a3b8; margin-right: 10px; }
        .search-box input { flex: 1; border: none; outline: none; font-size: 0.9rem; color: #1e293b; background: transparent; }
        .search-box input::placeholder { color: #94a3b8; }
      `}</style>
    </div>
  )
}
