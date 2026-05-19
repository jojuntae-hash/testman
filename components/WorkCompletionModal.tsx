'use client'

import React, { useState, useEffect } from 'react'
import { useData } from '@/lib/DataContext'
import { Calendar, CheckCircle2, X } from 'lucide-react'

export default function WorkCompletionModal() {
  const { completionModal } = useData()
  const [date, setDate] = useState('')

  // 모달이 열릴 때 오늘 날짜로 초기화
  useEffect(() => {
    if (completionModal?.isOpen) {
      setDate(new Date().toLocaleDateString('sv-SE'))
    }
  }, [completionModal?.isOpen])

  if (!completionModal?.isOpen) return null

  const handleConfirm = () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!date.trim() || !dateRegex.test(date.trim())) {
      alert('올바른 날짜 형식(YYYY-MM-DD)으로 입력하거나 선택해주세요.')
      return
    }
    completionModal.confirm(date.trim())
  }

  return (
    <div className="completion-modal-overlay" onClick={completionModal.close}>
      <div className="completion-modal-content animated-pop" onClick={(e) => e.stopPropagation()}>
        <header className="completion-modal-header">
          <div className="title-group">
            <CheckCircle2 size={20} color="#10b981" />
            <h3>작업 완료일 지정</h3>
          </div>
          <button className="close-btn" onClick={completionModal.close}><X size={20} /></button>
        </header>
        <div className="completion-modal-body">
          <p className="guide-text">
            선택한 <strong>{completionModal.targetIds.length}명</strong>의 고객을 작업완료 상태로 변경합니다.<br />
            작업이 완료된 날짜를 지정해 주세요.
          </p>
          <div className="date-input-group">
            <label><Calendar size={14} /> 완료 일자</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="modal-date-picker"
            />
          </div>
          <div className="btn-group">
            <button className="cancel-btn" onClick={completionModal.close}>취소</button>
            <button className="confirm-btn" onClick={handleConfirm}>완료 처리</button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .completion-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 20px;
        }
        .completion-modal-content {
          background: #fff;
          width: 100%;
          max-width: 380px;
          border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        .animated-pop {
          animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes popIn {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .completion-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .title-group h3 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
        }
        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }
        .close-btn:hover {
          color: #475569;
        }
        .completion-modal-body {
          padding: 20px;
        }
        .guide-text {
          font-size: 0.85rem;
          color: #475569;
          line-height: 1.5;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .guide-text strong {
          color: #10b981;
          font-weight: 700;
        }
        .date-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 24px;
        }
        .date-input-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .modal-date-picker {
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.9rem;
          outline: none;
          font-weight: 600;
          color: #0f172a;
          background: #f8fafc;
        }
        .modal-date-picker:focus {
          border-color: #10b981;
          background: #fff;
        }
        .btn-group {
          display: flex;
          gap: 10px;
        }
        .cancel-btn, .confirm-btn {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .cancel-btn {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .cancel-btn:hover {
          background: #e2e8f0;
        }
        .confirm-btn {
          background: #10b981;
          color: #fff;
          border: none;
        }
        .confirm-btn:hover {
          background: #059669;
        }
        .cancel-btn:active, .confirm-btn:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  )
}
