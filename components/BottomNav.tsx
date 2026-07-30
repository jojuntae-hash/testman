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
  CheckCircle2,
  MoreHorizontal,
  MessageSquare,
  Users,
  Copy,
  FileSpreadsheet
} from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { customers, setCustomers, selectedIds, setSelectedIds, changeCustomerStatus, copyToLongTerm } = useData()
  const [isMoreOpen, setIsMoreOpen] = React.useState(false)

  // 모달 관련 상태
  const [isFolderModalOpen, setIsFolderModalOpen] = React.useState(false)
  const [newFolderName, setNewFolderName] = React.useState('')

  // 기존 폴더 목록 추출
  const uniqueFolders = React.useMemo(() => {
    return Array.from(new Set(customers.map(c => c.status)))
      .filter(status => !['작업미완료', '예약완료', '작업완료', '삭제됨'].includes(status))
  }, [customers])

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.length === 0) return
    const msg = newStatus === '삭제됨' ? '선택한 고객을 삭제하시겠습니까?' : `선택한 고객을 '${newStatus}' 상태로 변경하시겠습니까?`
    if (confirm(msg)) {
      await changeCustomerStatus(selectedIds, newStatus)
      setSelectedIds([])
    }
  }

  // 새 폴더 만들기 및 이동
  const handleCreateNewFolder = () => {
    if (!newFolderName || newFolderName.trim() === '') return
    const folderName = newFolderName.trim()
    const updated = customers.map(c => selectedIds.includes(c.id) ? { ...c, status: folderName } : c)
    setCustomers(updated as any)
    setSelectedIds([])
    setNewFolderName('')
    setIsFolderModalOpen(false)
  }

  // 기존 폴더에 추가 및 이동
  const handleMoveToExistingFolder = (folderName: string) => {
    const updated = customers.map(c => selectedIds.includes(c.id) ? { ...c, status: folderName } : c)
    setCustomers(updated as any)
    setSelectedIds([])
    setIsFolderModalOpen(false)
  }

  // 제품 상세 페이지에서는 하단 네비게이션을 아예 숨김
  if (pathname.startsWith('/products/') && pathname !== '/products/') {
    return null
  }

  // 선택된 항목이 있을 때 렌더링할 선택 모드 액션 바
  if (pathname === '/' && selectedIds.length > 0) {
    return (
      <nav className="bottom-nav selection-mode">
        <div className="selection-info-container">
          <div className="selection-info">
            <span className="count">{selectedIds.length}</span>명 선택됨
          </div>
          <button className="clear-selection-btn" onClick={() => setSelectedIds([])}>전체해제</button>
        </div>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => router.push('/map')}>
            <Map size={18} />
            <span>지도</span>
          </button>
          <button className="action-btn folder-btn" onClick={() => setIsFolderModalOpen(true)}>
            <FolderPlus size={18} />
            <span>폴더</span>
          </button>
          <button className="action-btn" onClick={() => { copyToLongTerm(selectedIds); setSelectedIds([]) }}>
            <Copy size={18} />
            <span>고객관리</span>
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

        {/* 04. 폴딩옵션메뉴 모달 UI */}
        {isFolderModalOpen && (
          <div className="folder-modal-overlay" onClick={() => setIsFolderModalOpen(false)}>
            <div className="folder-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>선택한 {selectedIds.length}명을 폴더로 이동</h3>
                <button className="close-btn" onClick={() => setIsFolderModalOpen(false)}>×</button>
              </div>
              
              {/* 새 폴더 생성 */}
              <div className="modal-section">
                <label className="section-label">새 폴더 만들기</label>
                <div className="new-folder-input-group">
                  <input 
                    type="text" 
                    placeholder="새 폴더 이름을 입력하세요..." 
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFolder()}
                  />
                  <button className="create-submit-btn" onClick={handleCreateNewFolder}>만들기</button>
                </div>
              </div>
              
              {/* 기존 폴더 선택 */}
              <div className="modal-section">
                <label className="section-label">기존 폴더에 넣기</label>
                {uniqueFolders.length === 0 ? (
                  <p className="no-folders-text">생성된 폴더가 없습니다.</p>
                ) : (
                  <div className="existing-folders-list">
                    {uniqueFolders.map(folder => (
                      <button 
                        key={folder} 
                        className="existing-folder-item"
                        onClick={() => handleMoveToExistingFolder(folder)}
                      >
                        <FolderPlus size={14} style={{ color: '#fbbf24' }} />
                        <span>{folder}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .bottom-nav.selection-mode {
            position: absolute;
            bottom: 0;
            left: 0;
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
          .action-btn.reserved { color: #818cf8; }
          .action-btn.complete { color: #34d399; }
          .action-btn.delete-btn { color: #f87171; }

          /* 모달 스타일 */
          .folder-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .folder-modal-content {
            background: #fff;
            width: 100%;
            max-width: 360px;
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
            animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            color: #1e293b;
            text-align: left;
          }
          @keyframes modalFadeIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
          }
          .modal-header h3 {
            font-size: 0.95rem;
            font-weight: 800;
            margin: 0;
            color: #0f172a;
          }
          .close-btn {
            background: none;
            border: none;
            font-size: 1.3rem;
            color: #94a3b8;
            cursor: pointer;
            padding: 0;
            line-height: 1;
          }
          .close-btn:hover {
            color: #475569;
          }
          .modal-section {
            margin-bottom: 16px;
          }
          .modal-section:last-child {
            margin-bottom: 0;
          }
          .section-label {
            display: block;
            font-size: 0.7rem;
            font-weight: 700;
            color: #64748b;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .new-folder-input-group {
            display: flex;
            gap: 6px;
          }
          .new-folder-input-group input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            font-size: 0.8rem;
            outline: none;
            color: #1e293b;
            background: #fff;
          }
          .new-folder-input-group input:focus {
            border-color: #3b82f6;
          }
          .create-submit-btn {
            background: #3b82f6;
            color: #fff;
            border: none;
            padding: 0 12px;
            border-radius: 10px;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
          }
          .create-submit-btn:hover {
            background: #2563eb;
          }
          .no-folders-text {
            font-size: 0.75rem;
            color: #94a3b8;
            margin: 6px 0;
            text-align: center;
          }
          .existing-folders-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            max-height: 120px;
            overflow-y: auto;
            padding-right: 4px;
          }
          .existing-folder-item {
            background: #f8fafc;
            border: 1px solid #f1f5f9;
            padding: 8px 10px;
            border-radius: 10px;
            font-size: 0.75rem;
            font-weight: 600;
            color: #334155;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            width: 100%;
            min-width: 0;
          }
          .existing-folder-item:hover {
            background: #eff6ff;
            border-color: #bfdbfe;
            color: #1e3a8a;
          }
          .existing-folder-item span {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: inline-block;
            flex: 1;
          }
        `}</style>
      </nav>
    )
  }

  const isMoreActive = ['/sms', '/memos', '/settings', '/customers', '/products', '/quotes'].includes(pathname)

  // 일반 내비게이션 바
  return (
    <>
      {isMoreOpen && (
        <div className="more-menu-overlay" onClick={() => setIsMoreOpen(false)}>
          <div className="more-menu-container animated-slide-up" onClick={(e) => e.stopPropagation()}>
            <Link href="/customers" className={`more-menu-item ${pathname === '/customers' ? 'active' : ''}`} onClick={() => setIsMoreOpen(false)}>
              <Users size={18} />
              <span>고객관리</span>
            </Link>
            <Link href="/sms" className={`more-menu-item ${pathname === '/sms' ? 'active' : ''}`} onClick={() => setIsMoreOpen(false)}>
              <MessageSquare size={18} />
              <span>문자</span>
            </Link>
            <Link href="/memos" className={`more-menu-item ${pathname === '/memos' ? 'active' : ''}`} onClick={() => setIsMoreOpen(false)}>
              <FileText size={18} />
              <span>메모</span>
            </Link>
            <Link href="/settings" className={`more-menu-item ${pathname === '/settings' ? 'active' : ''}`} onClick={() => setIsMoreOpen(false)}>
              <Settings size={18} />
              <span>설정</span>
            </Link>
            <Link href="/products" className={`more-menu-item ${pathname === '/products' ? 'active' : ''}`} onClick={() => setIsMoreOpen(false)}>
              <LayoutGrid size={18} />
              <span>제품목록</span>
            </Link>
            <Link href="/quotes" className={`more-menu-item ${pathname === '/quotes' ? 'active' : ''}`} onClick={() => setIsMoreOpen(false)}>
              <FileSpreadsheet size={18} />
              <span>견적서</span>
            </Link>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
          <LayoutGrid size={22} />
          <span>리스트</span>
        </Link>
        <Link href="/map" className={`nav-item ${pathname === '/map' ? 'active' : ''}`}>
          <Map size={22} />
          <span>지도</span>
        </Link>
        <Link href="/calendar" className={`nav-item ${pathname === '/calendar' ? 'active' : ''}`}>
          <Calendar size={22} />
          <span>일정</span>
        </Link>
        <Link href="/completed" className={`nav-item ${pathname === '/completed' ? 'active' : ''}`}>
          <CheckCircle2 size={22} />
          <span>작업완료</span>
        </Link>
        <button 
          className={`nav-item nav-btn ${isMoreActive ? 'active' : ''} ${isMoreOpen ? 'open' : ''}`}
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', outline: 'none' }}
        >
          <MoreHorizontal size={22} />
          <span>더보기</span>
        </button>
      </nav>

      <style jsx>{`
        .more-menu-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(1.5px);
          z-index: 9999;
        }
        .more-menu-container {
          position: absolute;
          bottom: 80px;
          right: 20px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(226, 232, 240, 0.8);
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 140px;
          z-index: 10000;
        }
        .animated-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          0% { transform: translateY(10px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        :global(.more-menu-item) {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          color: #475569;
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 700;
          transition: all 0.2s;
        }
        :global(.more-menu-item:active) {
          background: #f1f5f9;
        }
        :global(.more-menu-item.active) {
          background: #eff6ff;
          color: #3b82f6;
        }
        .nav-btn.open {
          color: #3b82f6;
        }
      `}</style>
    </>
  )
}
