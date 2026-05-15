'use client'

import React, { useState } from 'react'
import { useData } from '@/lib/DataContext'
import { useRouter } from 'next/navigation'
import { Folder, Clock, Calendar, CheckCircle2, ChevronRight } from 'lucide-react'

export default function StatusPage() {
  const { customers } = useData()
  const router = useRouter()
  const [selectedFolder, setSelectedFolder] = useState<'작업미완료' | '예약완료' | '작업완료' | null>(null)

  const counts = {
    '작업미완료': customers.filter(c => c.status === '작업미완료').length,
    '예약완료': customers.filter(c => c.status === '예약완료').length,
    '작업완료': customers.filter(c => c.status === '작업완료').length,
  }

  const filteredCustomers = selectedFolder 
    ? customers.filter(c => c.status === selectedFolder)
    : []

  return (
    <div className="status-page">
      <div className="status-header">
        <h2 className="title">진행 현황 관리</h2>
        <p className="subtitle">상태별로 고객 리스트를 관리하세요</p>
      </div>

      <div className="folder-grid">
        <div className={`folder-card pending ${selectedFolder === '작업미완료' ? 'active' : ''}`} onClick={() => setSelectedFolder('작업미완료')}>
          <div className="icon-wrapper"><Clock size={24} /></div>
          <div className="folder-info">
            <span className="label">작업 미완료</span>
            <span className="count">{counts['작업미완료']}건</span>
          </div>
        </div>

        <div className={`folder-card reserved ${selectedFolder === '예약완료' ? 'active' : ''}`} onClick={() => setSelectedFolder('예약완료')}>
          <div className="icon-wrapper"><Calendar size={24} /></div>
          <div className="folder-info">
            <span className="label">예약 완료</span>
            <span className="count">{counts['예약완료']}건</span>
          </div>
        </div>

        <div className={`folder-card done ${selectedFolder === '작업완료' ? 'active' : ''}`} onClick={() => setSelectedFolder('작업완료')}>
          <div className="icon-wrapper"><CheckCircle2 size={24} /></div>
          <div className="folder-info">
            <span className="label">작업 완료</span>
            <span className="count">{counts['작업완료']}건</span>
          </div>
        </div>
      </div>

      {selectedFolder && (
        <div className="customer-list-section">
          <div className="section-title flex-between">
            <h3>{selectedFolder} 리스트</h3>
            <button className="close-btn" onClick={() => setSelectedFolder(null)}>닫기</button>
          </div>
          
          <div className="mini-list">
            {filteredCustomers.length === 0 ? (
              <p className="empty-msg">해당 상태의 고객이 없습니다.</p>
            ) : (
              filteredCustomers.map(customer => (
                <div key={customer.id} className="mini-item flex-between" onClick={() => router.push(`/detail/${customer.id}`)}>
                  <div>
                    <p className="name">{customer.고객명_상호}</p>
                    <p className="info">{customer.고객번호}</p>
                  </div>
                  <ChevronRight size={18} color="#ccc" />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .status-page {
          padding: 20px;
          padding-bottom: 100px;
        }
        .status-header {
          margin-bottom: 25px;
        }
        .title {
          font-size: 1.4rem;
          font-weight: 800;
          color: #333;
        }
        .subtitle {
          font-size: 0.85rem;
          color: #888;
          margin-top: 4px;
        }
        .folder-grid {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .folder-card {
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .folder-card:active {
          transform: scale(0.98);
        }
        .folder-card.active {
          border-color: var(--primary-color);
          background: #f8faff;
        }
        .icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pending .icon-wrapper { background: #f5f5f5; color: #888; }
        .reserved .icon-wrapper { background: #eef2ff; color: #4f46e5; }
        .done .icon-wrapper { background: #ecfdf5; color: #10b981; }

        .folder-info {
          display: flex;
          flex-direction: column;
        }
        .folder-info .label {
          font-size: 1rem;
          font-weight: 700;
          color: #333;
        }
        .folder-info .count {
          font-size: 0.85rem;
          color: #888;
          margin-top: 2px;
        }
        
        .customer-list-section {
          margin-top: 30px;
          background: #fff;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.05);
          border: 1px solid #eee;
        }
        .section-title h3 {
          font-size: 1.1rem;
          font-weight: 800;
        }
        .close-btn {
          font-size: 0.8rem;
          color: #888;
          background: #f5f5f5;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .mini-list {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mini-item {
          padding: 12px;
          border-radius: 10px;
          background: #f9f9f9;
          cursor: pointer;
        }
        .mini-item .name {
          font-size: 0.9rem;
          font-weight: 700;
        }
        .mini-item .info {
          font-size: 0.75rem;
          color: #888;
        }
        .empty-msg {
          text-align: center;
          color: #aaa;
          padding: 30px 0;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  )
}
