import React, { useState, useMemo } from 'react'
import { X, Search, Trash2 } from 'lucide-react'
import { useData } from '@/lib/DataContext'

interface CustomerDeleteModalProps {
  onClose: () => void
}

export default function CustomerDeleteModal({ onClose }: CustomerDeleteModalProps) {
  const { customers, deleteCustomers } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const term = searchTerm.toLowerCase()
      return (
        (c.고객명_상호 && c.고객명_상호.toLowerCase().includes(term)) ||
        (c.전화번호 && String(c.전화번호).includes(term)) ||
        (c.주소 && c.주소.toLowerCase().includes(term)) ||
        (c.모델명 && c.모델명.toLowerCase().includes(term))
      )
    })
  }, [customers, searchTerm])

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id))
    }
  }

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      alert('삭제할 고객을 선택해주세요.')
      return
    }

    const confirm1 = confirm(`선택한 ${selectedIds.length}명의 고객을 삭제하시겠습니까?`)
    if (!confirm1) return

    const confirm2 = confirm('삭제된 데이터는 복구할 수 없습니다. 정말로 삭제하시겠습니까?')
    if (!confirm2) return

    await deleteCustomers(selectedIds)
    alert('삭제가 완료되었습니다.')
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>개별 고객 삭제</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-search">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="이름, 연락처, 주소, 모델명 검색" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-list">
          <div className="list-header">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length}
                onChange={toggleSelectAll}
              />
              <span>전체 선택</span>
            </label>
            <span className="count-text">총 {filteredCustomers.length}건</span>
          </div>
          
          <div className="list-body">
            {filteredCustomers.length === 0 ? (
              <div className="empty-state">검색 결과가 없습니다.</div>
            ) : (
              filteredCustomers.map(c => (
                <div key={c.id} className={`list-item ${selectedIds.includes(c.id) ? 'selected' : ''}`} onClick={() => toggleSelect(c.id)}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(c.id)}
                    onChange={() => {}} // Handle through parent div
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="item-info">
                    <div className="item-name">{c.고객명_상호 || '이름 없음'}</div>
                    <div className="item-detail">{c.전화번호 || c.핸드폰번호 || '연락처 없음'} | {c.주소 || c.설치주소 || '주소 없음'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="delete-btn" onClick={handleDelete} disabled={selectedIds.length === 0}>
            <Trash2 size={16} />
            선택한 {selectedIds.length}명 삭제하기
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .modal-content {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          height: 80vh;
          max-height: 800px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #1e293b;
        }
        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }
        .modal-search {
          padding: 15px 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          color: #94a3b8;
        }
        .search-input-wrapper input {
          width: 100%;
          padding: 10px 10px 10px 36px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          outline: none;
        }
        .search-input-wrapper input:focus {
          border-color: #3b82f6;
        }
        .modal-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
        }
        .count-text {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
        }
        .list-body {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }
        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.9rem;
        }
        .list-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 10px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .list-item:hover {
          background: #f8fafc;
        }
        .list-item.selected {
          background: #eff6ff;
        }
        .item-info {
          flex: 1;
          min-width: 0;
        }
        .item-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .item-detail {
          font-size: 0.8rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #f1f5f9;
        }
        .delete-btn {
          width: 100%;
          padding: 14px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .delete-btn:hover:not(:disabled) {
          background: #dc2626;
        }
        .delete-btn:disabled {
          background: #fca5a5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
