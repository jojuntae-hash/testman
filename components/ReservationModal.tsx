'use client'

import React, { useState, useEffect } from 'react'
import { useData } from '@/lib/DataContext'
import { Calendar, CheckCircle2, X } from 'lucide-react'

export default function ReservationModal() {
  const { reservationModal } = useData()
  const [date, setDate] = useState('')
  const [hour, setHour] = useState(9)
  const [minute, setMinute] = useState(0)

  // 시간대 목록 (오전 8시 ~ 오후 8시)
  const TIME_SLOTS = (() => {
    const slots: { label: string; hour: number; minute: number }[] = []
    for (let h = 8; h <= 20; h++) {
      const ampm = h < 12 ? '오전' : h === 12 ? '오후' : '오후'
      const display = h <= 12 ? h : h - 12
      slots.push({ label: `${ampm} ${display}시 00분`, hour: h, minute: 0 })
      if (h < 20) {
        slots.push({ label: `${ampm} ${display}시 30분`, hour: h, minute: 30 })
      }
    }
    return slots
  })()

  // 모달이 열릴 때 오늘 날짜와 기본 시간(오전 9시)으로 초기화
  useEffect(() => {
    if (reservationModal?.isOpen) {
      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      setDate(`${yyyy}-${mm}-${dd}`)
      setHour(9)
      setMinute(0)
    }
  }, [reservationModal?.isOpen])

  if (!reservationModal?.isOpen) return null

  const handleConfirm = () => {
    if (!date.trim()) {
      alert('올바른 예약 날짜를 선택해주세요.')
      return
    }
    // "YYYY-MM-DD HH:mm" 포맷으로 변환하여 전달 (캘린더 연동 규격)
    const pad = (n: number) => n.toString().padStart(2, '0')
    const formatted = `${date} ${pad(hour)}:${pad(minute)}`
    reservationModal.confirm(formatted)
  }

  return (
    <div className="reservation-modal-overlay" onClick={reservationModal.close}>
      <div className="reservation-modal-content animated-pop" onClick={(e) => e.stopPropagation()}>
        <header className="reservation-modal-header">
          <div className="title-group">
            <CheckCircle2 size={20} color="#4f46e5" />
            <h3>예약 일자 지정</h3>
          </div>
          <button className="close-btn" onClick={reservationModal.close}><X size={20} /></button>
        </header>
        <div className="reservation-modal-body">
          <p className="guide-text">
            선택한 <strong>{reservationModal.targetIds.length}명</strong>의 고객을 예약완료 상태로 변경합니다.<br />
            방문 예약 일시를 지정해 주세요.
          </p>
          <div className="date-input-group">
            <label><Calendar size={14} /> 예약 일시</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="modal-date-picker"
                style={{ flex: 1 }}
              />
              <select
                className="modal-date-picker time-select"
                value={`${hour}:${minute}`}
                onChange={e => {
                  const [h, m] = e.target.value.split(':').map(Number)
                  setHour(h)
                  setMinute(m)
                }}
                style={{ flex: 1 }}
              >
                {TIME_SLOTS.map(slot => (
                  <option key={`${slot.hour}:${slot.minute}`} value={`${slot.hour}:${slot.minute}`}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="btn-group">
            <button className="cancel-btn" onClick={reservationModal.close}>취소</button>
            <button className="confirm-btn" onClick={handleConfirm}>예약 처리</button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .reservation-modal-overlay {
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
        .reservation-modal-content {
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
        .reservation-modal-header {
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
        .reservation-modal-body {
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
          color: #4f46e5;
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
          border-color: #4f46e5;
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
          background: #4f46e5;
          color: #fff;
          border: none;
        }
        .confirm-btn:hover {
          background: #4338ca;
        }
        .cancel-btn:active, .confirm-btn:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  )
}
