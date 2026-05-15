'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useData } from '@/lib/DataContext'
import { Info, FileText, MapPin, MessageSquare, ChevronLeft } from 'lucide-react'

export default function DetailPage() {
  const { id } = useParams()
  const { customers } = useData()
  const router = useRouter()
  
  const customer = customers.find(c => c.id === id)

  if (!customer) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>고객 정보를 찾을 수 없습니다.</p>
        <button onClick={() => router.push('/')} style={{ marginTop: '20px', color: 'var(--accent-blue)' }}>홈으로 이동</button>
      </div>
    )
  }

  return (
    <div className="detail-page">
      <header className="header" style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button className="back-btn-simple" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: '1.1rem' }}>서비스 관리 상세</h1>
        <div style={{ width: 24 }}></div>
      </header>

      <div className="customer-title-section">
        <span className="badge-simple">정기 관리 대상</span>
        <h2 className="customer-name">{customer.고객명_상호}</h2>
      </div>

      {/* 01. 일반사항 */}
      <div className="card">
        <div className="card-title">
          <Info size={18} />
          <span>일반사항</span>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <label>고객번호</label>
            <span>{customer.고객번호}</span>
          </div>
          <div className="info-item">
            <label>모델명</label>
            <span>{customer.모델명}</span>
          </div>
          <div className="info-item">
            <label>계약일자</label>
            <span>{customer.계약일자}</span>
          </div>
          <div className="info-item">
            <label>계약만료예정일</label>
            <span>{customer.계약만료일자}</span>
          </div>
          <div className="info-item">
            <label>최종점검일</label>
            <span>{customer.최종점검일}</span>
          </div>
          <div className="info-item">
            <label>예약일자</label>
            <span>{customer.예약일자 || '-'}</span>
          </div>
          <div className="info-item">
            <label>당월작업</label>
            <span>{customer.당월작업}</span>
          </div>
          <div className="info-item full">
            <label>최종작업내용</label>
            <span>{customer.최종작업내용}</span>
          </div>
        </div>
      </div>

      {/* 02. 계약정보 */}
      <div className="card">
        <div className="card-title">
          <FileText size={18} />
          <span>계약정보</span>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <label>계약자 구분</label>
            <span>{customer.계약자구분}</span>
          </div>
          <div className="info-item">
            <label>고객명/상호</label>
            <span>{customer.고객명_상호}</span>
          </div>
          <div className="info-item">
            <label>사업자번호</label>
            <span>{customer.사업자번호}</span>
          </div>
          <div className="info-item">
            <label>전화번호</label>
            <span>{customer.전화번호}</span>
          </div>
          <div className="info-item">
            <label>핸드폰번호</label>
            <span>{customer.핸드폰번호}</span>
          </div>
          <div className="info-item full">
            <label>주소</label>
            <span>{customer.주소}</span>
          </div>
        </div>
      </div>

      {/* 03. 설치정보 */}
      <div className="card">
        <div className="card-title">
          <MapPin size={18} />
          <span>[이전] 설치정보</span>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <label>설치처구분</label>
            <span>{customer.설치처구분}</span>
          </div>
          <div className="info-item">
            <label>설치자명</label>
            <span>{customer.설치자명}</span>
          </div>
          <div className="info-item">
            <label>설치구분</label>
            <span>{customer.설치구분}</span>
          </div>
          <div className="info-item">
            <label>전화번호</label>
            <span>{customer.설치전화번호}</span>
          </div>
          <div className="info-item full">
            <label>주소</label>
            <span>{customer.설치주소}</span>
          </div>
          <div className="info-item full memo">
            <label>설치시 특이사항</label>
            <div className="memo-box">
              {customer.설치시특이사항}
            </div>
          </div>
        </div>
      </div>

      <div className="action-area">
        <button className="submit-btn">
          <MessageSquare size={18} />
          방문 관리 기록 작성
        </button>
      </div>

      <style jsx>{`
        .detail-page {
          padding-bottom: 20px;
          background: #fff;
          min-height: 100vh;
        }
        .customer-title-section {
          padding: 25px 20px;
          background: #fff;
        }
        .badge-simple {
          background: #eef2ff;
          color: var(--accent-blue);
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          display: inline-block;
          margin-bottom: 8px;
        }
        .customer-name {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--primary-color);
        }
        .back-btn-simple {
          padding: 5px;
          margin-left: -10px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .info-item.full {
          grid-column: span 2;
        }
        .info-item label {
          font-size: 0.75rem;
          color: #888;
        }
        .info-item span {
          font-size: 0.9rem;
          font-weight: 500;
        }
        .memo-box {
          background: #f8faff;
          border-left: 4px solid var(--accent-blue);
          padding: 12px;
          font-size: 0.85rem;
          margin-top: 5px;
          color: #444;
          line-height: 1.4;
        }
        .action-area {
          padding: 0 15px 20px;
        }
        .submit-btn {
          width: 100%;
          background: var(--primary-color);
          color: #fff;
          padding: 16px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-weight: 700;
          font-size: 1rem;
        }
      `}</style>
    </div>
  )
}
