import React, { useState, useEffect } from 'react'
import { X, ArrowUp, ArrowDown } from 'lucide-react'

interface FolderOrderModalProps {
  isOpen: boolean
  onClose: () => void
  folders: string[]
  onSave: (newOrder: string[]) => void
}

export default function FolderOrderModal({ isOpen, onClose, folders, onSave }: FolderOrderModalProps) {
  const [order, setOrder] = useState<string[]>([])

  useEffect(() => {
    // '전체'는 고정이며 모달 목록에서 제외합니다
    setOrder(folders.filter(f => f !== '전체'))
  }, [folders, isOpen])

  if (!isOpen) return null

  const moveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...order]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = temp
    setOrder(newOrder)
  }

  const moveDown = (index: number) => {
    if (index === order.length - 1) return
    const newOrder = [...order]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = temp
    setOrder(newOrder)
  }

  const handleSave = () => {
    onSave(order)
    onClose()
  }

  return (
    <div className="folder-order-modal-overlay" onClick={onClose}>
      <div className="folder-order-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>폴더 순서 변경</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body">
          <p className="description">화면에 표시될 폴더 탭의 순서를 변경합니다. (▲/▼ 버튼 사용)</p>
          <div className="order-list">
            {order.map((folder, index) => (
              <div key={folder} className="order-item">
                <span className="folder-name">{folder}</span>
                <div className="action-buttons">
                  <button 
                    onClick={() => moveUp(index)} 
                    disabled={index === 0} 
                    className="action-btn"
                    title="위로 이동"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button 
                    onClick={() => moveDown(index)} 
                    disabled={index === order.length - 1} 
                    className="action-btn"
                    title="아래로 이동"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>취소</button>
          <button className="save-btn" onClick={handleSave}>저장</button>
        </div>
      </div>

      <style jsx>{`
        .folder-order-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(2px);
        }
        .folder-order-modal-content {
          background: white;
          width: 90%;
          max-width: 400px;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        .modal-header h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .modal-body {
          padding: 16px;
          max-height: 300px;
          overflow-y: auto;
        }
        .description {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 12px;
        }
        .order-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .order-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .folder-name {
          font-size: 0.95rem;
          font-weight: 500;
          color: #1e293b;
        }
        .action-buttons {
          display: flex;
          gap: 4px;
        }
        .action-btn {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 4px;
          cursor: pointer;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-btn:disabled {
          background: #f1f5f9;
          color: #cbd5e1;
          cursor: not-allowed;
        }
        .modal-footer {
          display: flex;
          gap: 8px;
          padding: 16px;
          border-top: 1px solid #e2e8f0;
          justify-content: flex-end;
        }
        .cancel-btn {
          padding: 8px 16px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
        }
        .save-btn {
          padding: 8px 16px;
          background: #3b82f6;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          color: white;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
