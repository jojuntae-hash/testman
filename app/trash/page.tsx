'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/lib/DataContext'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Trash2, RotateCcw, FileText, Calendar, Clock, AlertTriangle } from 'lucide-react'

type DeletedRecord = {
  id: string
  type: 'memo' | 'visit_log'
  content: string
  date: string
  customerName: string
}

export default function TrashPage() {
  const { customers } = useData()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'memo' | 'visit_log'>('memo')
  const [deletedMemos, setDeletedMemos] = useState<DeletedRecord[]>([])
  const [deletedVisits, setDeletedVisits] = useState<DeletedRecord[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    fetchDeletedRecords()
  }, [customers])

  useEffect(() => {
    setSelectedIds([])
  }, [activeTab])

  const fetchDeletedRecords = async () => {
    if (!customers || customers.length === 0) return
    setLoading(true)
    setDbError(null)

    try {
      // 1. 삭제된 메모 가져오기
      const { data: memos, error: memosError } = await supabase
        .from('memos')
        .select('*')
        .eq('is_deleted', true)

      if (memosError) {
        if (memosError.code === '42703') {
          setDbError('is_deleted 컬럼이 데이터베이스에 존재하지 않습니다.')
        }
        throw memosError
      }

      // 2. 삭제된 방문 기록 가져오기
      const { data: visits, error: visitsError } = await supabase
        .from('visit_logs')
        .select('*')
        .eq('is_deleted', true)

      if (visitsError) throw visitsError

      // 메모 매핑
      const mappedMemos: DeletedRecord[] = (memos || [])
        .map(memo => {
          const customer = customers.find(c => c.id === memo.customer_id)
          return {
            id: memo.id,
            type: 'memo',
            content: memo.content || '',
            date: memo.updated_at,
            customerName: customer ? customer.고객명_상호 : '알 수 없는 고객'
          }
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // 방문 기록 매핑
      const mappedVisits: DeletedRecord[] = (visits || [])
        .map(visit => {
          const customer = customers.find(c => c.id === visit.customer_id)
          return {
            id: visit.id,
            type: 'visit_log',
            content: visit.content || '',
            date: visit.created_at,
            customerName: customer ? customer.고객명_상호 : '알 수 없는 고객'
          }
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setDeletedMemos(mappedMemos)
      setDeletedVisits(mappedVisits)
    } catch (err: any) {
      console.error('삭제 데이터 로드 실패:', err)
      if (err.code !== '42703') {
        setDbError('데이터를 불러오는 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleRecordSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleRestore = async (id: string, type: 'memo' | 'visit_log') => {
    const typeKor = type === 'memo' ? '메모' : '방문기록'
    try {
      const table = type === 'memo' ? 'memos' : 'visit_logs'
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: false })
        .eq('id', id)

      if (error) throw error

      alert(`${typeKor}가 성공적으로 복구되었습니다.`)
      fetchDeletedRecords()
    } catch (err: any) {
      console.error(err)
      alert('복구 중 오류가 발생했습니다.')
    }
  }

  const handlePermanentDelete = async (id: string, type: 'memo' | 'visit_log') => {
    const typeKor = type === 'memo' ? '메모' : '방문기록'
    if (!confirm(`이 ${typeKor}를 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return

    try {
      const table = type === 'memo' ? 'memos' : 'visit_logs'
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (error) throw error

      alert(`${typeKor}가 영구 삭제되었습니다.`)
      fetchDeletedRecords()
    } catch (err: any) {
      console.error(err)
      alert('영구 삭제 중 오류가 발생했습니다.')
    }
  }

  // ------------------ 일괄 작업 핸들러 ------------------
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return
    const typeKor = activeTab === 'memo' ? '메모' : '방문기록'
    if (!confirm(`선택한 ${selectedIds.length}개의 ${typeKor}를 복구하시겠습니까?`)) return
    
    try {
      const table = activeTab === 'memo' ? 'memos' : 'visit_logs'
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: false })
        .in('id', selectedIds)
      
      if (error) throw error
      
      alert('선택한 항목들이 성공적으로 복구되었습니다.')
      setSelectedIds([])
      fetchDeletedRecords()
    } catch (err) {
      console.error(err)
      alert('일괄 복구 중 오류가 발생했습니다.')
    }
  }

  const handleBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return
    const typeKor = activeTab === 'memo' ? '메모' : '방문기록'
    if (!confirm(`선택한 ${selectedIds.length}개의 ${typeKor}를 영구 삭제하시겠습니까?\n이 작업은 절대로 되돌릴 수 없습니다.`)) return
    
    try {
      const table = activeTab === 'memo' ? 'memos' : 'visit_logs'
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', selectedIds)
      
      if (error) throw error
      
      alert('선택한 항목들이 영구 삭제되었습니다.')
      setSelectedIds([])
      fetchDeletedRecords()
    } catch (err) {
      console.error(err)
      alert('일괄 영구 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEmptyTrash = async () => {
    const currentRecords = activeTab === 'memo' ? deletedMemos : deletedVisits
    if (currentRecords.length === 0) return
    const typeKor = activeTab === 'memo' ? '삭제된 메모' : '삭제된 방문기록'
    if (!confirm(`휴지통의 모든 ${typeKor}(총 ${currentRecords.length}개)을 완전히 비우시겠습니까?\n이 작업은 절대로 되돌릴 수 없습니다.`)) return
    
    try {
      const table = activeTab === 'memo' ? 'memos' : 'visit_logs'
      const allIdsInTab = currentRecords.map(r => r.id)
      
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', allIdsInTab)
      
      if (error) throw error
      
      alert('휴지통이 성공적으로 비워졌습니다.')
      setSelectedIds([])
      fetchDeletedRecords()
    } catch (err) {
      console.error(err)
      alert('휴지통을 비우는 중 오류가 발생했습니다.')
    }
  }

  const currentRecords = activeTab === 'memo' ? deletedMemos : deletedVisits

  return (
    <div className="trash-page-container">
      <div className="trash-page">
        <header className="header">
          <button className="back-btn" onClick={() => router.back()}>
            <ChevronLeft size={24} />
          </button>
          <div className="header-text">
            <h1>휴지통</h1>
            <p>삭제된 메모 및 방문 기록 관리</p>
          </div>
        </header>

        {dbError ? (
          <div className="db-setup-box">
            <AlertTriangle size={36} className="warn-icon" />
            <h3>휴지통 기능 데이터베이스 설정 필요</h3>
            <p>휴지통 기능을 이용하기 위해 Supabase SQL Editor에서 아래 명령어를 실행해주세요:</p>
            <pre className="sql-box">
{`alter table memos add column is_deleted boolean default false;
alter table visit_logs add column is_deleted boolean default false;`}
            </pre>
            <button className="refresh-btn" onClick={fetchDeletedRecords}>설정 완료 후 새로고침</button>
          </div>
        ) : (
          <>
            <div className="tabs">
              <button 
                className={`tab-btn ${activeTab === 'memo' ? 'active' : ''}`}
                onClick={() => setActiveTab('memo')}
              >
                <FileText size={16} />
                삭제된 메모 ({deletedMemos.length})
              </button>
              <button 
                className={`tab-btn ${activeTab === 'visit_log' ? 'active' : ''}`}
                onClick={() => setActiveTab('visit_log')}
              >
                <Calendar size={16} />
                삭제된 방문기록 ({deletedVisits.length})
              </button>
            </div>

            {/* ------------------ 일괄 제어 영역 ------------------ */}
            <div className="controls-row">
              {selectedIds.length > 0 ? (
                <div className="bulk-actions animated-up">
                  <span className="selected-count">선택됨 <strong>{selectedIds.length}</strong>개</span>
                  <div className="bulk-btns">
                    <button className="bulk-action-btn restore" onClick={handleBulkRestore}>선택 복구</button>
                    <button className="bulk-action-btn delete" onClick={handleBulkPermanentDelete}>선택 영구삭제</button>
                    <button className="cancel-btn" onClick={() => setSelectedIds([])}>취소</button>
                  </div>
                </div>
              ) : (
                <div className="default-controls">
                  {currentRecords.length > 0 && (
                    <>
                      <button 
                        className="select-all-btn"
                        onClick={() => setSelectedIds(currentRecords.map(r => r.id))}
                      >
                        전체선택
                      </button>
                      <button className="empty-trash-btn" onClick={handleEmptyTrash}>
                        <Trash2 size={12} /> 휴지통 비우기
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="list-container">
              {loading ? (
                <div className="empty-state">데이터를 불러오는 중...</div>
              ) : currentRecords.length === 0 ? (
                <div className="empty-state">휴지통이 비어 있습니다.</div>
              ) : (
                currentRecords.map(record => (
                  <div 
                    key={record.id} 
                    className={`trash-card ${selectedIds.includes(record.id) ? 'selected' : ''}`}
                    onClick={() => toggleRecordSelection(record.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(record.id)}
                          onChange={() => {}} // 부모의 onClick에서 처리
                          onClick={(e) => e.stopPropagation()} // 더블 토글 방지
                          className="checkbox-custom"
                        />
                        <div>
                          <span className="customer-name">{record.customerName}</span>
                          <div className="date-info">
                            <Clock size={12} />
                            {new Date(record.date).toLocaleDateString()} {new Date(record.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                      <div className="actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="restore-btn" 
                          onClick={() => handleRestore(record.id, record.type)}
                          title="복구"
                        >
                          <RotateCcw size={12} />
                        </button>
                        <button 
                          className="perm-delete-btn" 
                          onClick={() => handlePermanentDelete(record.id, record.type)}
                          title="영구 삭제"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="card-content">{record.content}</div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .trash-page-container {
          width: 100%;
          min-height: 100vh;
          background: #f8fafc;
          display: flex;
          justify-content: center;
        }
        .trash-page {
          width: 100%;
          max-width: 600px;
          padding: 15px;
          background: #fff;
          min-height: 100vh;
          box-shadow: 0 0 20px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
        }
        .header {
          display: flex;
          align-items: center;
          padding: 10px 0;
          margin-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        .back-btn { background: none; border: none; cursor: pointer; color: #333; padding: 5px; }
        .header-text { margin-left: 10px; }
        .header-text h1 { font-size: 1.2rem; font-weight: 800; margin: 0; color: #1e293b; }
        .header-text p { font-size: 0.75rem; color: #64748b; margin: 0; }

        .db-setup-box {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border: 1px solid #fee2e2;
          margin-top: 20px;
        }
        .warn-icon { color: #f59e0b; margin-bottom: 12px; display: inline-block; }
        .db-setup-box h3 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; color: #1e293b; }
        .db-setup-box p { font-size: 0.85rem; color: #64748b; margin-bottom: 16px; line-height: 1.4; }
        .sql-box {
          background: #0f172a;
          color: #38bdf8;
          padding: 15px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 0.8rem;
          text-align: left;
          overflow-x: auto;
          margin-bottom: 20px;
        }
        .refresh-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }

        .tabs {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 16px;
          gap: 4px;
        }
        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: transparent;
          border: none;
          padding: 10px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: #fff;
          color: #3b82f6;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        /* ------------------ 일괄 작업 디자인 ------------------ */
        .controls-row {
          margin-bottom: 15px;
          min-height: 38px;
        }
        .bulk-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #0f172a;
          padding: 8px 12px;
          border-radius: 12px;
          color: #fff;
          width: 100%;
        }
        .selected-count {
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .selected-count strong {
          color: #38bdf8;
          font-weight: 800;
        }
        .bulk-btns {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .bulk-action-btn {
          border: none;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .bulk-action-btn.restore {
          background: #0284c7;
          color: #fff;
        }
        .bulk-action-btn.restore:hover { background: #0369a1; }
        .bulk-action-btn.delete {
          background: #b91c1c;
          color: #fff;
        }
        .bulk-action-btn.delete:hover { background: #991b1b; }
        .cancel-btn {
          background: transparent;
          color: #94a3b8;
          border: none;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 4px;
        }
        .cancel-btn:hover { color: #fff; }

        .default-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .select-all-btn {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 8px;
          cursor: pointer;
        }
        .select-all-btn:hover { background: #e2e8f0; }
        .empty-trash-btn {
          background: transparent;
          border: 1px solid #fecaca;
          color: #ef4444;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }
        .empty-trash-btn:hover {
          background: #fee2e2;
        }

        /* ------------------ 체크박스 및 카드 디자인 ------------------ */
        .checkbox-custom {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          cursor: pointer;
          accent-color: #3b82f6;
        }
        .list-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .trash-card {
          background: #f8fafc;
          border-radius: 14px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }
        .trash-card.selected {
          border-color: #3b82f6;
          background: #f0f7ff;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.05);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px dashed #e2e8f0;
          padding-bottom: 8px;
        }
        .customer-name {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
        }
        .date-info {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 4px;
        }
        .actions {
          display: flex;
          gap: 4px;
        }
        .restore-btn, .perm-delete-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .restore-btn {
          background: #e0f2fe;
          color: #0369a1;
        }
        .restore-btn:hover { background: #bae6fd; }
        .perm-delete-btn {
          background: #fee2e2;
          color: #b91c1c;
        }
        .perm-delete-btn:hover { background: #fecaca; }
        .card-content {
          font-size: 0.85rem;
          color: #475569;
          line-height: 1.4;
          white-space: pre-wrap;
          margin-top: 8px;
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
          background: #f8fafc;
          border-radius: 14px;
          border: 1px dashed #e2e8f0;
        }

        .animated-up { animation: slideUp 0.2s ease-out; }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
