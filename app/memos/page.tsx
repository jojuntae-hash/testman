'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/lib/DataContext'
import { supabase } from '@/lib/supabase'
import { Search, ChevronRight, FileText, Calendar, Clock, X, Trash2 } from 'lucide-react'

type AggregatedRecord = {
  id: string
  type: 'memo' | 'visit_log'
  content: string
  date: string
}

type GroupedCustomer = {
  customerId: string
  customerName: string
  customerNumber: string
  latestDate: string
  records: AggregatedRecord[]
}

export default function MemosPage() {
  const { customers } = useData()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [groupedData, setGroupedData] = useState<GroupedCustomer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  const handleDeleteRecord = async (recordId: string, type: 'memo' | 'visit_log') => {
    const typeKor = type === 'memo' ? '메모' : '방문기록'
    if (!confirm(`${typeKor}를 삭제하시겠습니까?\n(삭제된 기록은 휴지통으로 이동합니다)`)) return

    try {
      if (type === 'memo') {
        const { error } = await supabase
          .from('memos')
          .update({ is_deleted: true })
          .eq('id', recordId)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('visit_logs')
          .update({ is_deleted: true })
          .eq('id', recordId)
        
        if (error) throw error
      }
      
      alert(`${typeKor}가 휴지통으로 이동되었습니다.`)
      fetchData()
    } catch (err: any) {
      console.error(err)
      alert(`삭제 중 오류가 발생했습니다: ${err.message || err}`)
    }
  }

  useEffect(() => {
    fetchData()
  }, [customers])

  const fetchData = async () => {
    if (!customers || customers.length === 0) return
    setLoading(true)

    try {
      // 1. 메모 가져오기
      const { data: memos, error: memosError } = await supabase
        .from('memos')
        .select('*')
      
      // 2. 방문 기록 가져오기
      const { data: visits, error: visitsError } = await supabase
        .from('visit_logs')
        .select('*')

      if (memosError) console.error('메모 로드 실패:', memosError)
      if (visitsError) console.error('방문 기록 로드 실패:', visitsError)

      // 3. 데이터 병합 및 그룹화
      const groupMap = new Map<string, GroupedCustomer>()

      // 메모 처리
      memos?.forEach(memo => {
        if (memo.is_deleted) return
        if (!memo.content || memo.content.trim() === '') return
        if (!groupMap.has(memo.customer_id)) {
          const customer = customers.find(c => c.id === memo.customer_id)
          if (!customer) return
          groupMap.set(memo.customer_id, {
            customerId: memo.customer_id,
            customerName: customer.고객명_상호,
            customerNumber: customer.고객번호 || '-',
            latestDate: memo.updated_at,
            records: []
          })
        }
        const group = groupMap.get(memo.customer_id)!
        group.records.push({
          id: memo.id,
          type: 'memo',
          content: memo.content,
          date: memo.updated_at
        })
        if (new Date(memo.updated_at) > new Date(group.latestDate)) {
          group.latestDate = memo.updated_at
        }
      })

      // 방문 기록 처리
      visits?.forEach(visit => {
        if (visit.is_deleted) return
        if (!visit.content || visit.content.trim() === '') return
        if (!groupMap.has(visit.customer_id)) {
          const customer = customers.find(c => c.id === visit.customer_id)
          if (!customer) return
          groupMap.set(visit.customer_id, {
            customerId: visit.customer_id,
            customerName: customer.고객명_상호,
            customerNumber: customer.고객번호 || '-',
            latestDate: visit.created_at,
            records: []
          })
        }
        const group = groupMap.get(visit.customer_id)!
        group.records.push({
          id: visit.id,
          type: 'visit_log',
          content: visit.content,
          date: visit.created_at
        })
        if (new Date(visit.created_at) > new Date(group.latestDate)) {
          group.latestDate = visit.created_at
        }
      })

      const finalData = Array.from(groupMap.values())
      setGroupedData(finalData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredData = useMemo(() => {
    let result = [...groupedData]
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(g => 
        g.customerName.toLowerCase().includes(lower) || 
        g.records.some(r => r.content.toLowerCase().includes(lower))
      )
    }

    result.sort((a, b) => {
      const timeA = new Date(a.latestDate).getTime()
      const timeB = new Date(b.latestDate).getTime()
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    })

    return result.map(g => {
      const sortedRecords = [...g.records].sort((a, b) => {
        const timeA = new Date(a.date).getTime()
        const timeB = new Date(b.date).getTime()
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
      })
      return { ...g, records: sortedRecords }
    })
  }, [groupedData, searchTerm, sortOrder])

  return (
    <div className="memos-page">
      <header className="header">
        <div>
          <h1>통합 메모 내역</h1>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
            총 {filteredData.length}명의 고객
          </div>
        </div>
        <button className="trash-nav-btn" onClick={() => router.push('/trash')}>
          <Trash2 size={16} /> 휴지통
        </button>
      </header>

      <div className="controls-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="고객명 또는 메모 내용 검색..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <X size={18} className="clear-icon" onClick={() => setSearchTerm('')} />}
        </div>
        <select 
          className="sort-select"
          value={sortOrder} 
          onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
        >
          <option value="desc">최신순</option>
          <option value="asc">오래된순</option>
        </select>
      </div>

      <div className="list-container">
        {loading ? (
          <div className="empty-state">데이터를 불러오는 중입니다...</div>
        ) : filteredData.length === 0 ? (
          <div className="empty-state">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 메모나 방문 기록이 없습니다.'}
          </div>
        ) : (
          filteredData.map(group => (
            <div key={group.customerId} className="customer-card">
              <div 
                className="card-header"
                onClick={() => router.push(`/detail/${group.customerId}`)}
              >
                <div>
                  <h2 className="customer-name">{group.customerName}</h2>
                  <span className="customer-num">고객번호: {group.customerNumber}</span>
                </div>
                <button 
                  className="detail-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/detail/${group.customerId}`)
                  }}
                >
                  상세보기 <ChevronRight size={14} />
                </button>
              </div>
              
              <div className="records-timeline">
                {group.records.map((record, index) => (
                  <div key={record.id} className="record-item">
                    <div className="record-icon-wrapper">
                      {record.type === 'memo' ? (
                        <div className="icon memo-icon"><FileText size={12} /></div>
                      ) : (
                        <div className="icon visit-icon"><Calendar size={12} /></div>
                      )}
                      {index !== group.records.length - 1 && <div className="timeline-line"></div>}
                    </div>
                    <div className="record-content-box">
                      <div className="record-meta">
                        <span className={`badge ${record.type}`}>
                          {record.type === 'memo' ? '메모' : '방문기록'}
                        </span>
                        <div className="meta-right">
                          <span className="date-text">
                            <Clock size={10} style={{ display: 'inline', marginRight: 2 }} />
                            {new Date(record.date).toLocaleDateString()} {new Date(record.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <button 
                            className="delete-record-btn" 
                            onClick={() => handleDeleteRecord(record.id, record.type)}
                            title="삭제"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="record-text">{record.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .memos-page {
          padding: 15px;
          padding-bottom: 90px;
          min-height: 100vh;
          background: #f8fafc;
        }
        .header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 15px;
          padding: 5px 0;
        }
        .header h1 {
          font-size: 1.3rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }
        .trash-nav-btn {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .trash-nav-btn:hover {
          background: #e2e8f0;
        }
        .controls-bar { 
          margin-bottom: 20px; 
          display: flex;
          gap: 10px;
        }
        .search-input-wrapper { position: relative; display: flex; align-items: center; flex: 1; }
        .search-icon { position: absolute; left: 12px; color: #94a3b8; }
        .clear-icon { position: absolute; right: 12px; color: #cbd5e1; cursor: pointer; }
        .search-input-wrapper input { width: 100%; padding: 12px 40px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff; font-size: 0.95rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); outline: none; }
        .search-input-wrapper input:focus { border-color: var(--primary-color, #3b82f6); }
        .sort-select {
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 0.9rem;
          color: #475569;
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }
        .sort-select:focus { border-color: var(--primary-color, #3b82f6); }
        
        .list-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .customer-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.04);
          border: 1px solid #f1f5f9;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px dashed #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 8px;
          padding: 6px 8px 12px 8px;
          margin-left: -8px;
          margin-right: -8px;
        }
        .card-header:hover {
          background-color: #f8fafc;
        }
        .card-header:hover .customer-name {
          color: #3b82f6;
        }
        .customer-name {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        .customer-num {
          font-size: 0.8rem;
          color: #64748b;
        }
        .detail-btn {
          background: #eff6ff;
          color: #3b82f6;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }
        .detail-btn:active { background: #dbeafe; }
        
        .records-timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .record-item {
          display: flex;
          gap: 12px;
        }
        .record-icon-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 24px;
        }
        .icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 2;
        }
        .memo-icon { background: #8b5cf6; }
        .visit-icon { background: #10b981; }
        .timeline-line {
          width: 2px;
          flex: 1;
          background: #e2e8f0;
          margin-top: 4px;
        }
        
        .record-content-box {
          flex: 1;
          background: #f8fafc;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          margin-bottom: 4px;
        }
        .record-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .badge {
          font-size: 0.65rem;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 700;
        }
        .badge.memo { background: #ede9fe; color: #7c3aed; }
        .badge.visit_log { background: #d1fae5; color: #059669; }
        .date-text {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }
        .meta-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .delete-record-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .delete-record-btn:hover {
          color: #ef4444;
          background: #fee2e2;
        }
        .record-text {
          font-size: 0.9rem;
          color: #334155;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
          background: #fff;
          border-radius: 16px;
        }
      `}</style>
    </div>
  )
}
