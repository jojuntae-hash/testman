'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, Save, Trash2, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface VisitLog {
  id: string
  customer_id: string
  visit_date: string
  content: string
  created_at: string
}

interface VisitLogModalProps {
  customerId: string
  isOpen: boolean
  onClose: () => void
}

export default function VisitLogModal({ customerId, isOpen, onClose }: VisitLogModalProps) {
  const [logs, setLogs] = useState<VisitLog[]>([])
  const [loading, setLoading] = useState(false)
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [newContent, setNewContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && customerId) {
      fetchLogs()
    }
  }, [isOpen, customerId])

  const fetchLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('visit_logs')
      .select('*')
      .eq('customer_id', customerId)
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('방문 기록 조회 오류:', error)
      alert(`방문 기록을 불러오는 중 오류가 발생했습니다: ${error.message || JSON.stringify(error)}`)
    } else {
      setLogs((data || []).filter((log: any) => !log.is_deleted))
    }
    setLoading(false)
  }

  const handleAddLog = async () => {
    if (!newDate || !newContent.trim()) {
      alert('방문 일자와 내용을 모두 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    const { data, error } = await supabase
      .from('visit_logs')
      .insert([
        { customer_id: customerId, visit_date: newDate, content: newContent }
      ])
      .select()

    if (error) {
      console.error('방문 기록 저장 오류:', error)
      alert(`저장 중 오류가 발생했습니다: ${error.message || JSON.stringify(error)}`)
    } else {
      if (data && data.length > 0) {
        setLogs([data[0], ...logs])
        setNewContent('')
        alert('방문 기록이 추가되었습니다.')
      }
    }
    setIsSubmitting(false)
  }

  const handleDeleteLog = async (id: string) => {
    if (!confirm('해당 방문 기록을 삭제하시겠습니까?\n(삭제된 기록은 휴지통으로 이동합니다)')) return

    const { error } = await supabase
      .from('visit_logs')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      console.error('방문 기록 삭제 오류:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } else {
      setLogs(logs.filter(log => log.id !== id))
      alert('기록이 휴지통으로 이동되었습니다.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content animated-pop">
        <header className="modal-header">
          <h2 className="modal-title">
            <Calendar size={20} />
            방문 관리 기록
          </h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </header>

        <div className="modal-body">
          {/* 입력 폼 */}
          <div className="log-input-section">
            <div className="input-group">
              <label>방문 일자</label>
              <input 
                type="date" 
                value={newDate} 
                onChange={(e) => setNewDate(e.target.value)} 
                className="date-input"
              />
            </div>
            <div className="input-group">
              <label>작업/방문 내용</label>
              <textarea 
                value={newContent} 
                onChange={(e) => setNewContent(e.target.value)} 
                placeholder="오늘 진행한 작업 내용이나 방문 특이사항을 기록하세요."
                className="content-input"
              />
            </div>
            <button 
              className="save-btn" 
              onClick={handleAddLog}
              disabled={isSubmitting}
            >
              {isSubmitting ? '저장 중...' : <><Save size={16} /> 기록 추가</>}
            </button>
          </div>

          <hr className="divider" />

          {/* 기록 목록 */}
          <div className="logs-list-section">
            <h3 className="section-title">이전 방문 기록</h3>
            {loading ? (
              <div className="empty-state">로딩 중...</div>
            ) : logs.length === 0 ? (
              <div className="empty-state">등록된 방문 기록이 없습니다.</div>
            ) : (
              <div className="logs-list">
                {logs.map((log) => (
                  <div key={log.id} className="log-item">
                    <div className="log-header">
                      <div className="log-date">
                        <Calendar size={14} /> {log.visit_date}
                      </div>
                      <button className="delete-btn" onClick={() => handleDeleteLog(log.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="log-content">{log.content}</div>
                    <div className="log-time">
                      <Clock size={12} /> {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          width: 100%;
          max-width: 500px;
          border-radius: 16px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        .animated-pop {
          animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes popIn {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f0f0f0;
        }
        .modal-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }
        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
        .input-group {
          margin-bottom: 15px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .input-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
        }
        .date-input, .content-input {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.95rem;
          outline: none;
        }
        .date-input:focus, .content-input:focus {
          border-color: var(--primary-color, #3b82f6);
        }
        .content-input {
          min-height: 80px;
          resize: vertical;
        }
        .save-btn {
          width: 100%;
          background: var(--primary-color, #3b82f6);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .save-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .divider {
          border: none;
          border-top: 1px dashed #e2e8f0;
          margin: 24px 0;
        }
        .section-title {
          font-size: 1rem;
          font-weight: 700;
          color: #334155;
          margin-bottom: 12px;
        }
        .empty-state {
          text-align: center;
          color: #94a3b8;
          padding: 20px 0;
          font-size: 0.9rem;
        }
        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .log-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px;
        }
        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .log-date {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #0f172a;
        }
        .delete-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 4px;
        }
        .log-content {
          font-size: 0.9rem;
          color: #334155;
          line-height: 1.5;
          margin-bottom: 10px;
          white-space: pre-wrap;
        }
        .log-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: #94a3b8;
        }
      `}</style>
    </div>
  )
}
