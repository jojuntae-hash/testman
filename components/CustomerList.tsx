'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Map, ChevronRight } from 'lucide-react'
import { useData } from '@/lib/DataContext'

export default function CustomerList() {
  const { customers, selectedIds, setSelectedIds } = useData()
  const router = useRouter()

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
                <p className="font-bold">{customer.고객명_상호 || '이름 없음'}</p>
                <p className="text-xs text-sub">{customer.고객번호} | {customer.전화번호}</p>
              </div>
            </div>
            <ChevronRight size={20} color="#ccc" onClick={() => handleRowClick(customer.id)} style={{ cursor: 'pointer' }} />
          </div>
        ))}
      </div>

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
      `}</style>
    </div>
  )
}
