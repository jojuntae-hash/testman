'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Map, ChevronRight } from 'lucide-react'
import { useData } from '@/lib/DataContext'

export default function CustomerList() {
  const { customers, setCustomers, selectedIds, setSelectedIds } = useData()
  const router = useRouter()

  const moveSelectedToStatus = (newStatus: '작업미완료' | '예약완료' | '작업완료') => {
    const updatedCustomers = customers.map(customer => {
      if (selectedIds.includes(customer.id)) {
        return { ...customer, status: newStatus }
      }
      return customer
    })
    setCustomers(updatedCustomers)
    setSelectedIds([]) // Clear selection after moving
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleRowClick = (id: string) => {
    router.push(`/detail/${id}`)
  }

  const goToMap = () => {
    if (selectedIds.length > 0) {
      router.push('/map')
    }
  }

  if (customers.length === 0) return null

  return (
    <div className="list-container">
      <div className="list-header flex-between">
        <h2 className="font-bold">고객 리스트 ({customers.length})</h2>
        <button 
          className={`map-btn ${selectedIds.length > 0 ? 'active' : ''}`}
          onClick={goToMap}
          disabled={selectedIds.length === 0}
        >
          <Map size={18} />
          지도보기 ({selectedIds.length})
        </button>
      </div>

      <div className="customer-items">
        {customers.map((customer) => (
          <div key={customer.id} className="customer-item-card flex-between">
            <div className="item-left flex-between" style={{ gap: '15px', flex: 1 }}>
              <input 
                type="checkbox" 
                checked={selectedIds.includes(customer.id)}
                onChange={() => toggleSelect(customer.id)}
                onClick={(e) => e.stopPropagation()}
                className="custom-checkbox"
              />
              <div className="item-info" onClick={() => handleRowClick(customer.id)} style={{ flex: 1, cursor: 'pointer' }}>
                <div className="flex-between">
                  <p className="font-bold">{customer.고객명_상호 || '이름 없음'}</p>
                  <span className={`status-badge ${customer.status === '작업완료' ? 'done' : customer.status === '예약완료' ? 'reserved' : 'pending'}`}>
                    {customer.status}
                  </span>
                </div>
                <p className="text-xs text-sub">{customer.고객번호} | {customer.전화번호}</p>
              </div>
            </div>
            <ChevronRight size={20} color="#ccc" onClick={() => handleRowClick(customer.id)} style={{ cursor: 'pointer' }} />
          </div>
        ))}
      </div>

      {selectedIds.length > 0 && (
        <div className="status-action-bar">
          <div className="selection-info">{selectedIds.length}명 선택됨</div>
          <div className="action-buttons">
            <button onClick={() => moveSelectedToStatus('예약완료')} className="action-btn reserved">예약완료</button>
            <button onClick={() => moveSelectedToStatus('작업완료')} className="action-btn done">작업완료</button>
            <button onClick={() => moveSelectedToStatus('작업미완료')} className="action-btn pending">미완료</button>
          </div>
        </div>
      )}


      <style jsx>{`
        .list-container {
          padding: 0 20px 40px;
        }
        .list-header {
          margin-bottom: 15px;
          position: sticky;
          top: 60px;
          background: #fff;
          padding: 10px 0;
          z-index: 10;
        }
        .map-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f0f0f0;
          color: #888;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .map-btn.active {
          background: var(--primary-color);
          color: #fff;
        }
        .customer-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .customer-item-card {
          background: #fff;
          border: 1px solid var(--border-color);
          padding: 15px;
          border-radius: 12px;
          transition: transform 0.1s;
        }
        .customer-item-card:active {
          transform: scale(0.98);
          background: #f9f9f9;
        }
        .custom-checkbox {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }
        .text-sub {
          color: #666;
          margin-top: 2px;
        }
        .status-badge {
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }
        .status-badge.pending { background: #f5f5f5; color: #888; }
        .status-badge.reserved { background: #eef2ff; color: #4f46e5; }
        .status-badge.done { background: #ecfdf5; color: #10b981; }

        .status-action-bar {
          position: fixed;
          bottom: 85px;
          left: 20px;
          right: 20px;
          background: #333;
          color: #fff;
          padding: 12px 20px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 100;
        }
        .selection-info {
          font-size: 0.9rem;
          font-weight: 600;
        }
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        .action-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
        }
        .action-btn.reserved { background: #4f46e5; color: #fff; }
        .action-btn.done { background: #10b981; color: #fff; }
        .action-btn.pending { background: #666; color: #fff; }

      `}</style>
    </div>
  )
}
