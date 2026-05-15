'use client'

import React, { useState, useMemo } from 'react'
import { useData } from '@/lib/DataContext'
import { useRouter } from 'next/navigation'
import { Folder, Clock, Calendar, CheckCircle2, ChevronRight, Trash2, FolderPlus, Map, ClipboardList } from 'lucide-react'

export default function HomePage() {
  const { customers, setCustomers, selectedIds, setSelectedIds } = useData()
  const router = useRouter()
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

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
    if (selectedFolder === '전체리스트') return customers.filter(c => c.status !== '삭제됨')
    return selectedFolder 
      ? customers.filter(c => c.status === selectedFolder)
      : customers.filter(c => c.status !== '삭제됨')
  }, [customers, selectedFolder])

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
                  <p className="font-bold">{customer.고객명_상호}</p>
                  <p className="text-xs text-sub">{customer.전화번호} | {customer.설치주소 || customer.주소}</p>
                </div>
                <button className="go-detail-mini-btn" onClick={(e) => { e.stopPropagation(); router.push(`/detail/${customer.id}`); }}>상세 <ChevronRight size={14} /></button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="floating-bar animated-up shadow-lg">
          <div className="selection-info"><span className="count">{selectedIds.length}</span>명</div>
          <div className="action-buttons">
            <button className="action-btn" onClick={() => router.push('/map')}><Map size={18} /> 지도</button>
            <div className="divider"></div>
            <button className="action-btn folder-btn" onClick={handleCreateFolder}><FolderPlus size={18} /> 폴더</button>
            <div className="divider"></div>
            <button className="action-btn status-btn" onClick={() => handleBulkStatusChange('작업미완료')}>미완료</button>
            <button className="action-btn status-btn reserved" onClick={() => handleBulkStatusChange('예약완료')}>예약</button>
            <button className="action-btn status-btn complete" onClick={() => handleBulkStatusChange('작업완료')}>완료</button>
            <div className="divider"></div>
            <button className="action-btn delete-btn" onClick={() => handleBulkStatusChange('삭제됨')}><Trash2 size={18} /> 삭제</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .home-page { padding: 0; padding-bottom: 120px; background: #f8fafc; min-height: 100vh; }
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
        .item-main p { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .go-detail-mini-btn { padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.75rem; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 2px; }
        .floating-bar { position: fixed; bottom: 85px; left: 5px; right: 5px; background: #2c3e50; color: #fff; padding: 12px 10px; border-radius: 20px; display: flex; align-items: center; justify-content: space-between; z-index: 1000; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .selection-info { font-size: 0.75rem; white-space: nowrap; padding-left: 5px; }
        .selection-info .count { font-weight: 800; color: #3498db; margin-right: 2px; }
        .action-buttons { display: flex; align-items: center; gap: 8px; }
        .action-btn { background: transparent; color: #fff; border: none; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 3px; cursor: pointer; white-space: nowrap; }
        .action-btn.folder-btn { color: #f1c40f; }
        .action-btn.reserved { color: #a5b4fc; }
        .action-btn.complete { color: #2ecc71; }
        .action-btn.delete-btn { color: #ff4d4f; }
        .divider { width: 1px; height: 14px; background: rgba(255,255,255,0.2); }
        .empty-state { text-align: center; padding: 40px 0; color: #999; font-size: 0.9rem; }
        .font-bold { font-weight: 700; }
        .text-xs { font-size: 0.75rem; }
        .flex-between { display: flex; align-items: center; justify-content: space-between; }
        .animated-up { animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
