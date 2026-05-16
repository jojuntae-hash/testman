'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useData } from '@/lib/DataContext'
import { Info, FileText, MapPin, MessageSquare, ChevronLeft, Phone, Save } from 'lucide-react'

export default function DetailPage() {
  const { id } = useParams()
  const { customers } = useData()
  const router = useRouter()
  
  const customer = customers.find(c => c.id === id)
  const [memo, setMemo] = useState('')

  useEffect(() => {
    if (id) {
      const savedMemo = localStorage.getItem(`memo_${id}`)
      if (savedMemo) setMemo(savedMemo)
    }
  }, [id])

  const handleSaveMemo = () => {
    localStorage.setItem(`memo_${id}`, memo)
    alert('메모가 저장되었습니다.')
  }

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
        <div className="title-row">
          <h2 className="customer-name">{customer.고객명_상호}</h2>
          {customer.전화번호 && (
            <a href={`tel:${customer.전화번호.replace(/[^0-9]/g, '')}`} className="action-circle-btn phone">
              <Phone size={18} />
            </a>
          )}
        </div>
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
            <div className="value-with-action">
              <span>{customer.전화번호}</span>
              {customer.전화번호 && (
                <a href={`tel:${customer.전화번호.replace(/[^0-9]/g, '')}`} className="mini-call-btn">
                  <Phone size={12} />
                </a>
              )}
            </div>
          </div>
          <div className="info-item">
            <label>핸드폰번호</label>
            <div className="value-with-action">
              <span>{customer.핸드폰번호}</span>
              {customer.핸드폰번호 && (
                <a href={`tel:${customer.핸드폰번호.replace(/[^0-9]/g, '')}`} className="mini-call-btn">
                  <Phone size={12} />
                </a>
              )}
            </div>
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
            <div className="value-with-action">
              <span>{customer.설치전화번호}</span>
              {customer.설치전화번호 && (
                <a href={`tel:${customer.설치전화번호.replace(/[^0-9]/g, '')}`} className="mini-call-btn">
                  <Phone size={12} />
                </a>
              )}
            </div>
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
      
      {/* 04. 현장 메모 */}
      <div className="card">
        <div className="card-title">
          <FileText size={18} />
          <span>현장 메모</span>
        </div>
        <div className="info-grid">
          <div className="info-item full">
            <textarea 
              className="memo-textarea" 
              placeholder="방문 전/후 특이사항을 기록하세요." 
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
            <button className="save-memo-btn" onClick={handleSaveMemo}>
              <Save size={14} /> 메모 저장
            </button>
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
          min-height: 100%;
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
        .title-row { display: flex; align-items: center; justify-content: space-between; }
        .action-circle-btn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; text-decoration: none; transition: all 0.2s; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); }
        .action-circle-btn:active { transform: scale(0.9); }
        .action-circle-btn.phone { background: #10b981; }
        .memo-textarea { width: 100%; min-height: 80px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; resize: vertical; outline: none; margin-bottom: 8px; }
        .memo-textarea:focus { border-color: var(--accent-blue); }
        .save-memo-btn { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: all 0.2s; }
        .save-memo-btn:hover { background: #e2e8f0; }
        .save-memo-btn:active { transform: scale(0.98); }
        .value-with-action { display: flex; align-items: center; gap: 8px; }
        .mini-call-btn { width: 24px; height: 24px; background: #ecfdf5; color: #10b981; border: 1px solid #d1fae5; border-radius: 6px; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s; }
        .mini-call-btn:active { transform: scale(0.9); }
      `}</style>
    </div>
  )
}
