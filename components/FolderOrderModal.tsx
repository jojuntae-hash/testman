import React, { useState, useEffect } from 'react'
import { X, ArrowUp, ArrowDown, Pencil, Check } from 'lucide-react'

interface FolderOrderModalProps {
  isOpen: boolean
  onClose: () => void
  folders: string[]
  onSave: (newOrder: string[], renamedMap: Record<string, string>) => void
}

export default function FolderOrderModal({ isOpen, onClose, folders, onSave }: FolderOrderModalProps) {
  const [order, setOrder] = useState<string[]>([])
  const [origNames, setOrigNames] = useState<string[]>([])
  const [renamedMap, setRenamedMap] = useState<Record<string, string>>({})
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')

  useEffect(() => {
    // '전체'는 고정이며 모달 목록에서 제외합니다
    const list = folders.filter(f => f !== '전체')
    setOrder(list)
    setOrigNames(list)
    setRenamedMap({})
    setEditingIndex(null)
    setEditingText('')
  }, [folders, isOpen])

  if (!isOpen) return null

  const startEditing = (index: number) => {
    setEditingIndex(index)
    setEditingText(order[index])
  }

  const saveEditing = (index: number) => {
    const trimmed = editingText.trim()
    if (!trimmed) {
      setEditingIndex(null)
      return
    }
    const currentFolder = order[index]
    if (trimmed === currentFolder) {
      setEditingIndex(null)
      return
    }

    // 다른 폴더와 이름 중복 체크
    if (order.some((f, i) => i !== index && f === trimmed)) {
      alert('이미 존재하는 폴더 이름입니다.')
      return
    }

    const newOrder = [...order]
    newOrder[index] = trimmed
    setOrder(newOrder)

    // 원래 이름 추적하여 renamedMap 업데이트
    const originalName = origNames[index] || currentFolder
    setRenamedMap(prev => ({
      ...prev,
      [originalName]: trimmed
    }))

    setEditingIndex(null)
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...order]
    const newOrig = [...origNames]

    const tempOrder = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = tempOrder

    const tempOrig = newOrig[index]
    newOrig[index] = newOrig[index - 1]
    newOrig[index - 1] = tempOrig

    setOrder(newOrder)
    setOrigNames(newOrig)
  }

  const moveDown = (index: number) => {
    if (index === order.length - 1) return
    const newOrder = [...order]
    const newOrig = [...origNames]

    const tempOrder = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = tempOrder

    const tempOrig = newOrig[index]
    newOrig[index] = newOrig[index + 1]
    newOrig[index + 1] = tempOrig

    setOrder(newOrder)
    setOrigNames(newOrig)
  }

  const handleSave = () => {
    let finalOrder = [...order]
    let finalRenamed = { ...renamedMap }

    // 수정 중인 상태가 있다면 먼저 저장 반영
    if (editingIndex !== null) {
      const trimmed = editingText.trim()
      if (trimmed && trimmed !== order[editingIndex]) {
        const originalName = origNames[editingIndex] || order[editingIndex]
        finalOrder[editingIndex] = trimmed
        finalRenamed[originalName] = trimmed
      }
    }

    onSave(finalOrder, finalRenamed)
    onClose()
  }

  return (
    <div className="folder-order-modal-overlay" onClick={onClose}>
      <div className="folder-order-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>폴더 관리 (순서 & 이름 변경)</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body">
          <p className="description">폴더 순서를 변경하거나 ✏️ 연필 버튼을 눌러 이름을 수정할 수 있습니다.</p>
          <div className="order-list">
            {order.map((folder, index) => (
              <div key={origNames[index] || folder} className="order-item">
                {editingIndex === index ? (
                  <div className="edit-input-group">
                    <input 
                      type="text" 
                      value={editingText} 
                      onChange={e => setEditingText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEditing(index)
                        if (e.key === 'Escape') setEditingIndex(null)
                      }}
                      autoFocus
                      className="folder-name-input"
                    />
                    <button onClick={() => saveEditing(index)} className="confirm-name-btn" title="확인">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingIndex(null)} className="cancel-name-btn" title="취소">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="folder-name-box" onClick={() => startEditing(index)}>
                      <span className="folder-name">{folder}</span>
                      <button className="edit-name-btn" title="이름 변경" onClick={(e) => { e.stopPropagation(); startEditing(index); }}>
                        <Pencil size={13} />
                      </button>
                    </div>
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
                  </>
                )}
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
          font-size: 1.05rem;
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
          max-height: 340px;
          overflow-y: auto;
        }
        .description {
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 12px;
          line-height: 1.4;
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
          padding: 8px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          min-height: 46px;
        }
        .folder-name-box {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          flex: 1;
        }
        .folder-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
        }
        .edit-name-btn {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 3px 5px;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .edit-name-btn:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
        .edit-input-group {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
        }
        .folder-name-input {
          flex: 1;
          padding: 6px 10px;
          border: 1.5px solid #3b82f6;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          outline: none;
          color: #1e293b;
          background: #fff;
        }
        .confirm-name-btn {
          background: #3b82f6;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 6px 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .cancel-name-btn {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .action-buttons {
          display: flex;
          gap: 4px;
        }
        .action-btn {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 5px;
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
          padding: 14px 16px;
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
