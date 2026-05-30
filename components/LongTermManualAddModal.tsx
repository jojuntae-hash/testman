import React, { useState } from 'react'
import { X } from 'lucide-react'

interface LongTermManualAddModalProps {
  onClose: () => void
  onAdd: (data: any) => void
}

export default function LongTermManualAddModal({ onClose, onAdd }: LongTermManualAddModalProps) {
  const [formData, setFormData] = useState({
    고객번호: '',
    고객명_상호: '',
    이름: '',
    전화번호: '',
    핸드폰번호: '',
    주소: '',
    모델명: '',
    계약자구분: '',
    설치자명: '',
    설치전화번호: '',
    설치주소: '',
    작업완료일: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.고객명_상호) {
      alert('고객명/상호를 입력해 주세요.')
      return
    }
    
    onAdd({
      ...formData,
      id: Date.now().toString(),
      status: '장기고객',
      기록: '',
      lat: null,
      lng: null,
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>장기 고객 수동 추가</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>고객명/상호 *</label>
            <input 
              type="text" 
              name="고객명_상호" 
              value={formData.고객명_상호} 
              onChange={handleChange} 
              placeholder="예: 홍길동상사"
              required
            />
          </div>
          <div className="form-group">
            <label>이름</label>
            <input 
              type="text" 
              name="이름" 
              value={formData.이름} 
              onChange={handleChange} 
              placeholder="예: 홍길동"
            />
          </div>
          <div className="form-group">
            <label>고객번호</label>
            <input 
              type="text" 
              name="고객번호" 
              value={formData.고객번호} 
              onChange={handleChange} 
              placeholder="예: 1234567"
            />
          </div>
          <div className="form-group">
            <label>모델명</label>
            <input 
              type="text" 
              name="모델명" 
              value={formData.모델명} 
              onChange={handleChange} 
              placeholder="예: CP-1234"
            />
          </div>
          <div className="form-group">
            <label>계약자구분</label>
            <input 
              type="text" 
              name="계약자구분" 
              value={formData.계약자구분} 
              onChange={handleChange} 
              placeholder="예: 개인 / 사업자"
            />
          </div>
          <div className="form-group">
            <label>연락처 (전화번호)</label>
            <input 
              type="text" 
              name="전화번호" 
              value={formData.전화번호} 
              onChange={handleChange} 
              placeholder="예: 010-1234-5678"
            />
          </div>
          <div className="form-group">
            <label>연락처 (핸드폰번호)</label>
            <input 
              type="text" 
              name="핸드폰번호" 
              value={formData.핸드폰번호} 
              onChange={handleChange} 
              placeholder="예: 010-1234-5678"
            />
          </div>
          <div className="form-group">
            <label>주소</label>
            <input 
              type="text" 
              name="주소" 
              value={formData.주소} 
              onChange={handleChange} 
              placeholder="전체 주소 입력"
            />
          </div>
          <div className="form-group">
            <label>설치자명</label>
            <input 
              type="text" 
              name="설치자명" 
              value={formData.설치자명} 
              onChange={handleChange} 
              placeholder="예: 김설치"
            />
          </div>
          <div className="form-group">
            <label>설치 전화번호</label>
            <input 
              type="text" 
              name="설치전화번호" 
              value={formData.설치전화번호} 
              onChange={handleChange} 
              placeholder="예: 010-1111-2222"
            />
          </div>
          <div className="form-group">
            <label>설치 주소</label>
            <input 
              type="text" 
              name="설치주소" 
              value={formData.설치주소} 
              onChange={handleChange} 
              placeholder="설치 주소 입력"
            />
          </div>
          <div className="form-group">
            <label>작업완료일</label>
            <input 
              type="date" 
              name="작업완료일" 
              value={formData.작업완료일} 
              onChange={handleChange} 
            />
          </div>
          <button type="submit" className="submit-btn">추가하기</button>
        </form>
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
          border-radius: 16px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }
        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #1e293b;
        }
        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }
        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
        }
        .form-group input {
          padding: 10px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.95rem;
          outline: none;
        }
        .form-group input:focus {
          border-color: #3b82f6;
        }
        .submit-btn {
          margin-top: 10px;
          padding: 14px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
