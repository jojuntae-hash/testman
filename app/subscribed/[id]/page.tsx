'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useData } from '@/lib/DataContext'
import { ChevronLeft, Phone, MessageCircle, MapPin, Copy, ListPlus, Edit3, Save, X } from 'lucide-react'

export default function SubscribedCustomerDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { subscribedCustomers, updateSubscribedCustomer, addToSmsQueue } = useData()
  
  const customer = subscribedCustomers.find(c => c.id === id)
  
  const [recordText, setRecordText] = useState('')
  const [isEditingRecord, setIsEditingRecord] = useState(false)
  
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  useEffect(() => {
    if (customer) {
      setRecordText(customer.현장메모 || '')
    }
  }, [customer])

  if (!customer) {
    return <div style={{ padding: '20px' }}>고객 정보를 찾을 수 없습니다.</div>
  }

  const handleCopyAddress = (address: string) => {
    if (!address) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(address).then(() => {
        alert('주소가 복사되었습니다.');
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        alert('주소가 복사되었습니다.');
      } catch (err) {
        alert('복사에 실패했습니다.');
      }
      document.body.removeChild(textArea);
    }
  }

  const handleSaveRecord = async () => {
    await updateSubscribedCustomer(customer.id, { 현장메모: recordText })
    setIsEditingRecord(false)
    alert('기록이 저장되었습니다.')
  }

  const handleEditInfoStart = () => {
    setEditForm({
      고객명_상호: customer.고객명_상호 || '',
      이름: customer.이름 || '',
      고객번호: customer.고객번호 || '',
      모델명: customer.모델명 || '',
      계약자구분: customer.계약자구분 || '',
      전화번호: customer.전화번호 || '',
      핸드폰번호: customer.핸드폰번호 || '',
      계약일자: customer.계약일자 || '',
      계약만료일자: customer.계약만료일자 || '',
      주소: customer.주소 || '',
      약정: customer.약정 || '',
      가입유형: customer.가입유형 || '',
      월렌탈료: customer.월렌탈료 || '',
      생년월일: customer.생년월일 || ''
    })
    setIsEditingInfo(true)
  }

  const handleEditInfoSave = async () => {
    await updateSubscribedCustomer(customer.id, editForm)
    setIsEditingInfo(false)
    alert('고객 정보가 수정되었습니다.')
  }

  const handleEditInfoCancel = () => {
    setIsEditingInfo(false)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditForm((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleMapClick = (address: string) => {
    if (!address) return;
    const navApp = localStorage.getItem('navigation_app') || 'tmap';
    const encodedAddress = encodeURIComponent(address);
    if (navApp === 'kakao') {
      window.open(`https://map.kakao.com/link/search/${encodedAddress}`, '_blank');
    } else if (navApp === 'naver') {
      window.open(`https://map.naver.com/v5/search/${encodedAddress}`, '_blank');
    } else {
      window.open(`tmap://search?name=${encodedAddress}`, '_blank');
    }
  }

  const openNaverMap = (address: string) => {
    if (!address) return;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://map.naver.com/v5/search/${encodedAddress}`, '_blank');
  }

  return (
    <div className="detail-page">
      <div className="view-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <div className="header-text">
          <h1>가입고객 상세</h1>
          <p>고객 정보 및 기록 조회</p>
        </div>
      </div>

      <div className="detail-content">
        {/* 상단 액션 카드 */}
        <div className="action-card">
          <div className="title-row">
            {isEditingInfo ? (
              <input 
                className="edit-input name-input"
                name="고객명_상호"
                value={editForm.고객명_상호}
                onChange={handleFormChange}
                placeholder="고객명/상호"
              />
            ) : (
              <h2 className="customer-name">{customer.고객명_상호}</h2>
            )}
            
            {!isEditingInfo ? (
              <button className="edit-btn" onClick={handleEditInfoStart}>
                <Edit3 size={14} /> 정보 수정
              </button>
            ) : (
              <div className="edit-actions">
                <button className="cancel-btn mini" onClick={handleEditInfoCancel}><X size={14}/> 취소</button>
                <button className="save-btn mini" onClick={handleEditInfoSave}><Save size={14}/> 저장</button>
              </div>
            )}
          </div>
        </div>

        {/* 고객 정보 카드 */}
        <div className="info-card">
          <div className="card-title">고객 정보</div>
          
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">이름</span>
              {isEditingInfo ? (
                <input className="edit-input" name="이름" value={editForm.이름} onChange={handleFormChange} />
              ) : (
                <span className="info-value">{customer.이름 || '-'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">고객번호</span>
              {isEditingInfo ? (
                <input className="edit-input" name="고객번호" value={editForm.고객번호} onChange={handleFormChange} />
              ) : (
                <span className="info-value">{customer.고객번호 || '-'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">모델명</span>
              {isEditingInfo ? (
                <input className="edit-input" name="모델명" value={editForm.모델명} onChange={handleFormChange} />
              ) : (
                <span className="info-value">{customer.모델명 || '-'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">계약자구분</span>
              {isEditingInfo ? (
                <input className="edit-input" name="계약자구분" value={editForm.계약자구분} onChange={handleFormChange} />
              ) : (
                <span className="info-value">{customer.계약자구분 || '-'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">전화번호</span>
              {isEditingInfo ? (
                <input className="edit-input" name="전화번호" value={editForm.전화번호} onChange={handleFormChange} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span className="info-value">{customer.전화번호 || '-'}</span>
                  {customer.전화번호 && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <a href={`tel:${String(customer.전화번호).replace(/[^0-9]/g, '')}`} className="mini-call-btn">
                        <Phone size={12} />
                      </a>
                      <a href={`sms:${String(customer.전화번호).replace(/[^0-9]/g, '')}`} className="mini-sms-btn">
                        <MessageCircle size={12} />
                      </a>
                      <button 
                        className="mini-sms-btn queue" 
                        onClick={() => {
                          addToSmsQueue(customer.고객명_상호 || '이름없음', customer.전화번호 || '')
                          alert('문자 전송 목록에 추가되었습니다.')
                        }}
                      >
                        <ListPlus size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">핸드폰번호</span>
              {isEditingInfo ? (
                <input className="edit-input" name="핸드폰번호" value={editForm.핸드폰번호} onChange={handleFormChange} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span className="info-value">{customer.핸드폰번호 || '-'}</span>
                  {customer.핸드폰번호 && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <a href={`tel:${String(customer.핸드폰번호).replace(/[^0-9]/g, '')}`} className="mini-call-btn">
                        <Phone size={12} />
                      </a>
                      <a href={`sms:${String(customer.핸드폰번호).replace(/[^0-9]/g, '')}`} className="mini-sms-btn">
                        <MessageCircle size={12} />
                      </a>
                      <button 
                        className="mini-sms-btn queue" 
                        onClick={() => {
                          addToSmsQueue(customer.고객명_상호 || '이름없음', customer.핸드폰번호 || '')
                          alert('문자 전송 목록에 추가되었습니다.')
                        }}
                      >
                        <ListPlus size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">계약일</span>
              {isEditingInfo ? (
                <input type="date" className="edit-input" name="계약일자" value={editForm.계약일자} onChange={handleFormChange} />
              ) : (
                <span className="info-value">{customer.계약일자 || '-'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">계약만료일</span>
              {isEditingInfo ? (
                <input type="date" className="edit-input" name="계약만료일자" value={editForm.계약만료일자} onChange={handleFormChange} />
              ) : (
                <span className="info-value">{customer.계약만료일자 || '-'}</span>
              )}
            </div>
            
            <div className="info-item">
              <span className="info-label">약정</span>
              {isEditingInfo ? (
                <input className="edit-input" name="약정" value={editForm.약정 || ''} onChange={handleFormChange} placeholder="예: 3년 / 5년" />
              ) : (
                <span className="info-value">{customer.약정 || '-'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">가입유형</span>
              {isEditingInfo ? (
                <select 
                  className="edit-input" 
                  name="가입유형" 
                  value={editForm.가입유형 || ''} 
                  onChange={(e) => setEditForm((prev: any) => ({ ...prev, 가입유형: e.target.value }))}
                  style={{ background: 'white', height: '38px' }}
                >
                  <option value="">선택안함</option>
                  <option value="신규">신규</option>
                  <option value="패키지">패키지</option>
                  <option value="재렌탈">재렌탈</option>
                </select>
              ) : (
                <span className="info-value">{customer.가입유형 || '-'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">월렌탈료</span>
              {isEditingInfo ? (
                <input className="edit-input" name="월렌탈료" value={editForm.월렌탈료 || ''} onChange={handleFormChange} placeholder="예: 29900" />
              ) : (
                <span className="info-value">{customer.월렌탈료 ? (isNaN(Number(customer.월렌탈료)) ? customer.월렌탈료 : `${Number(customer.월렌탈료).toLocaleString()}원`) : '-'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="info-label">생년월일</span>
              {isEditingInfo ? (
                <input className="edit-input" name="생년월일" value={editForm.생년월일 || ''} onChange={handleFormChange} placeholder="예: 950615" />
              ) : (
                <span className="info-value">{customer.생년월일 || '-'}</span>
              )}
            </div>

            <div className="info-item full-width">
              <span className="info-label">고객 주소</span>
              {isEditingInfo ? (
                <input className="edit-input" name="주소" value={editForm.주소} onChange={handleFormChange} />
              ) : (
                <div className="value-with-action">
                  <span className="info-value">{customer.주소 || '-'}</span>
                  {customer.주소 && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="mini-map-btn" onClick={() => handleMapClick(customer.주소)} title="기본 지도 열기">
                        <MapPin size={12} />
                      </button>
                      <button className="mini-map-btn" onClick={() => openNaverMap(customer.주소)} title="네이버 지도 열기">
                        <span style={{ fontSize: '10px', fontWeight: 'bold' }}>N</span>
                      </button>
                      <button className="mini-map-btn" onClick={() => handleCopyAddress(customer.주소)} title="주소 복사">
                        <Copy size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>



        {/* 기록 카드 */}
        <div className="info-card">
          <div className="card-title-row">
            <div className="card-title">현장 메모 및 방문 기록</div>
            {!isEditingRecord && (
              <button className="edit-btn" onClick={() => setIsEditingRecord(true)}>
                <Edit3 size={14} /> 편집
              </button>
            )}
          </div>
          
          <div className="record-container">
            {isEditingRecord ? (
              <div className="record-edit-mode">
                <textarea 
                  className="record-textarea" 
                  value={recordText} 
                  onChange={e => setRecordText(e.target.value)}
                  placeholder="가입고객 관리 기록을 입력하세요."
                />
                <div className="record-actions">
                  <button className="cancel-btn" onClick={() => setIsEditingRecord(false)}>취소</button>
                  <button className="save-btn" onClick={handleSaveRecord}><Save size={14}/> 저장</button>
                </div>
              </div>
            ) : (
              <div className="record-view-mode">
                {recordText ? (
                  <div className="record-text">{recordText}</div>
                ) : (
                  <div className="empty-record">기록이 없습니다.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .detail-page { padding-bottom: 100px; background: #f8fafc; min-height: 100%; }
        .view-header { height: 80px; display: flex; align-items: center; padding: 0 20px; border-bottom: 1px solid #f1f5f9; background: #fff; position: sticky; top: 0; z-index: 100; margin-bottom: 15px; }
        .back-btn { background: none; border: none; width: 40px; height: 40px; display: flex; align-items: center; justify-content: flex-start; cursor: pointer; color: #64748b; margin-left: -10px; }
        .header-text h1 { font-size: 1.25rem; font-weight: 800; margin: 0; color: #1e293b; }
        .header-text p { font-size: 0.8rem; color: #94a3b8; margin: 0; font-weight: 500; }
        
        .detail-content { padding: 0 20px; display: flex; flex-direction: column; gap: 15px; }
        
        .action-card { background: #fff; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; }
        .title-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .customer-name { font-size: 1.2rem; font-weight: 800; color: #1e293b; margin: 0; }
        .name-input { font-size: 1.2rem; font-weight: 800; }
        
        .action-circle-btn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; text-decoration: none; border: none; cursor: pointer; transition: transform 0.2s; }
        .action-circle-btn:active { transform: scale(0.95); }
        .action-circle-btn.phone { background: #10b981; }
        .action-circle-btn.sms { background: #3b82f6; }
        .action-circle-btn.queue { background: #8b5cf6; }

        .info-card { background: #fff; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; }
        .card-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .card-title { font-size: 1rem; font-weight: 800; color: #334155; margin-bottom: 15px; }
        .card-title-row .card-title { margin-bottom: 0; }
        
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .info-item { display: flex; flex-direction: column; gap: 4px; }
        .info-item.full-width { grid-column: 1 / -1; }
        .info-label { font-size: 0.75rem; font-weight: 700; color: #64748b; }
        .info-value { font-size: 0.95rem; font-weight: 500; color: #1e293b; line-height: 1.4; word-break: keep-all; }
        
        .value-with-action { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        
        .edit-input { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; outline: none; }
        .edit-input:focus { border-color: #3b82f6; }

        .edit-actions { display: flex; gap: 6px; }

        .mini-call-btn { width: 28px; height: 28px; background: #ecfdf5; color: #10b981; border: 1px solid #d1fae5; border-radius: 6px; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s; cursor: pointer; }
        .mini-call-btn:active { transform: scale(0.9); }
        .mini-sms-btn { width: 28px; height: 28px; background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; border-radius: 6px; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s; cursor: pointer; }
        .mini-sms-btn:active { transform: scale(0.9); }
        .mini-sms-btn.queue { background: #f5f3ff; color: #8b5cf6; border: 1px solid #ede9fe; }
        .mini-map-btn { width: 28px; height: 28px; background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; border-radius: 6px; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s; cursor: pointer; }
        .mini-map-btn:active { transform: scale(0.9); }
        
        .edit-btn { display: flex; align-items: center; gap: 4px; background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
        
        .record-container { margin-top: 10px; }
        .record-view-mode { background: #f8fafc; padding: 15px; border-radius: 12px; border-left: 3px solid #0f172a; }
        .record-text { font-size: 0.9rem; color: #334155; line-height: 1.6; white-space: pre-wrap; }
        .empty-record { font-size: 0.9rem; color: #94a3b8; text-align: center; padding: 20px 0; }
        
        .record-edit-mode { display: flex; flex-direction: column; gap: 10px; }
        .record-textarea { width: 100%; min-height: 200px; padding: 12px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 0.95rem; resize: vertical; outline: none; line-height: 1.5; color: #334155; }
        .record-textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .record-actions { display: flex; justify-content: flex-end; gap: 8px; }
        .cancel-btn { padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
        .save-btn { padding: 8px 16px; background: #0f172a; color: #fff; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        
        .cancel-btn.mini { padding: 6px 10px; font-size: 0.75rem; border-radius: 6px; display: flex; align-items: center; gap: 4px; }
        .save-btn.mini { padding: 6px 10px; font-size: 0.75rem; border-radius: 6px; display: flex; align-items: center; gap: 4px; }
      `}</style>
    </div>
  )
}
