'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useData } from '@/lib/DataContext'
import { 
  LayoutGrid, 
  Map, 
  Navigation, 
  Settings, 
  FileText, 
  FolderPlus, 
  Trash2,
  Clock,
  Calendar,
  CheckCircle2
} from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { customers, setCustomers, selectedIds, setSelectedIds } = useData()

  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedIds.length === 0) return
    const msg = newStatus === '삭제됨' ? '선택한 고객을 삭제하시겠습니까?' : `선택한 고객을 '${newStatus}' 상태로 변경하시겠습니까?`
    if (confirm(msg)) {
      const updated = customers.map(c => selectedIds.includes(c.id) ? { ...c, status: newStatus } : c)
      setCustomers(updated as any)
      setSelectedIds([])
    }
  }

  const handleCreateFolder = () => {
    if (selectedIds.length === 0) return
    const folderName = prompt('새로운 폴더 이름을 입력해 주세요.')
    if (!folderName || folderName.trim() === '') return
    const updated = customers.map(c => selectedIds.includes(c.id) ? { ...c, status: folderName.trim() } : c)
    setCustomers(updated as any)
    setSelectedIds([])
  }

  // 선택된 항목이 있을 때 렌더링할 선택 모드 액션 바
  if (selectedIds.length > 0) {
    return (
      <nav className="bottom-nav selection-mode">
        <div className="selection-info">
          <span className="count">{selectedIds.length}</span>명 선택됨
        </div>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => router.push('/map')}>
            <Map size={18} />
            <span>지도</span>
          </button>
          <button className="action-btn folder-btn" onClick={handleCreateFolder}>
            <FolderPlus size={18} />
            <span>폴더</span>
          </button>
          <button className="action-btn" onClick={() => handleBulkStatusChange('작업미완료')}>
            <Clock size={18} />
            <span>미완료</span>
          </button>
          <button className="action-btn reserved" onClick={() => handleBulkStatusChange('예약완료')}>
            <Calendar size={18} />
            <span>예약</span>
          </button>
          <button className="action-btn complete" onClick={() => handleBulkStatusChange('작업완료')}>
            <CheckCircle2 size={18} />
            <span>완료</span>
          </button>
          <button className="action-btn delete-btn" onClick={() => handleBulkStatusChange('삭제됨')}>
            <Trash2 size={18} />
            <span>삭제</span>
          </button>
        </div>

        <style jsx>{`
          .bottom-nav.selection-mode {
            background: #0f172a;
            color: #fff;
            padding: 0 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: none;
            height: var(--nav-height, 70px);
            width: 100%;
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
          .action-btn.reserved { color: #818cf8; }
          .action-btn.complete { color: #34d399; }
          .action-btn.delete-btn { color: #f87171; }
        `}</style>
      </nav>
    )
  }

  // 일반 내비게이션 바
  return (
    <nav className="bottom-nav">
      <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
        <LayoutGrid size={22} />
        <span>리스트</span>
      </Link>
      <Link href="/map" className={`nav-item ${pathname === '/map' ? 'active' : ''}`}>
        <Map size={22} />
        <span>지도</span>
      </Link>
      <Link href="/route" className={`nav-item ${pathname === '/route' ? 'active' : ''}`}>
        <Navigation size={22} />
        <span>경로</span>
      </Link>
      <Link href="/memos" className={`nav-item ${pathname === '/memos' ? 'active' : ''}`}>
        <FileText size={22} />
        <span>메모</span>
      </Link>
      <Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}>
        <Settings size={22} />
        <span>설정</span>
      </Link>
    </nav>
  )
}
