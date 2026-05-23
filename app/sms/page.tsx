'use client'

import React, { useState } from 'react'
import { useData } from '@/lib/DataContext'
import { Trash2, UserPlus, Save, Edit, X, MessageSquare, Send } from 'lucide-react'

export default function SmsPage() {
  const { 
    smsQueue, addToSmsQueue, removeFromSmsQueue, clearSmsQueue,
    smsTemplates, addSmsTemplate, updateSmsTemplate, deleteSmsTemplate
  } = useData()

  // 수동 추가 상태
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  // 템플릿 관련 상태
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateContent, setTemplateContent] = useState('')

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const handleManualAdd = () => {
    if (!newPhone.trim()) {
      alert('전화번호를 입력해주세요.')
      return
    }
    addToSmsQueue(newName.trim() || '이름없음', newPhone.trim())
    setNewName('')
    setNewPhone('')
  }

  const handleOpenAddTemplate = () => {
    setEditingTemplateId(null)
    setTemplateTitle('')
    setTemplateContent('')
    setIsTemplateModalOpen(true)
  }

  const handleOpenEditTemplate = (template: { id: string; title: string; content: string }) => {
    setEditingTemplateId(template.id)
    setTemplateTitle(template.title)
    setTemplateContent(template.content)
    setIsTemplateModalOpen(true)
  }

  const handleSaveTemplate = () => {
    if (!templateTitle.trim() || !templateContent.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }
    if (editingTemplateId) {
      updateSmsTemplate(editingTemplateId, templateTitle, templateContent)
    } else {
      addSmsTemplate(templateTitle, templateContent)
    }
    setIsTemplateModalOpen(false)
  }

  const handleSendSms = () => {
    if (smsQueue.length === 0) {
      alert('전송할 대상이 없습니다. 번호를 추가해주세요.')
      return
    }
    if (!selectedTemplateId) {
      alert('전송할 자주 쓰는 문구를 선택해주세요.')
      return
    }

    const selectedTemplate = smsTemplates.find(t => t.id === selectedTemplateId)
    if (!selectedTemplate) return

    const phones = smsQueue.map(item => String(item.phone).replace(/[^0-9]/g, '')).filter(p => p).join(',')
    if (!phones) {
      alert('유효한 전화번호가 없습니다.')
      return
    }

    const body = encodeURIComponent(selectedTemplate.content)
    
    // iOS/Android에 따른 sms 프로토콜 분기
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const separator = isIOS ? '&' : '?'
    
    // iOS의 경우 번호 구분자를 컴마(,) 대신 앰퍼샌드(&)나 세미콜론(;)을 요구하는 버전이 있을 수 있으나 최근 iOS는 컴마(,)도 지원.
    // iOS 15 이하의 경우 세미콜론이 필요한 경우가 있지만, 최신 범용은 컴마입니다.
    window.location.href = `sms:${phones}${separator}body=${body}`
  }

  return (
    <div className="sms-page pb-[100px]">
      <header className="header" style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: 800 }}>단체 문자 전송</h1>
      </header>

      <div style={{ padding: '20px' }}>
        
        {/* 1. 수동 입력 영역 */}
        <div className="card">
          <div className="card-title">
            <UserPlus size={18} />
            <span>수동 번호 추가</span>
          </div>
          <div className="add-form">
            <input 
              type="text" 
              placeholder="고객명 (선택)" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="form-input"
            />
            <input 
              type="tel" 
              placeholder="전화번호 (필수)" 
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="form-input"
            />
            <button className="add-btn" onClick={handleManualAdd}>추가</button>
          </div>
        </div>

        {/* 2. 전송 대상 목록 */}
        <div className="card mt-4">
          <div className="card-title" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} />
              <span>전송 대상 목록 ({smsQueue.length}명)</span>
            </div>
            {smsQueue.length > 0 && (
              <button className="clear-btn" onClick={() => confirm('목록을 모두 지우시겠습니까?') && clearSmsQueue()}>
                전체 초기화
              </button>
            )}
          </div>
          
          <div className="queue-list">
            {smsQueue.length === 0 ? (
              <p className="empty-text">전송할 고객을 추가해주세요.</p>
            ) : (
              smsQueue.map(item => (
                <div key={item.id} className="queue-item">
                  <div className="queue-info">
                    <span className="queue-name">{item.name}</span>
                    <span className="queue-phone">{item.phone}</span>
                  </div>
                  <button className="delete-btn" onClick={() => removeFromSmsQueue(item.id)}>
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. 자주 보내는 문구 */}
        <div className="card mt-4">
          <div className="card-title" style={{ justifyContent: 'space-between', display: 'flex', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={18} />
              <span>자주 보내는 문구 선택</span>
            </div>
            <button className="add-template-btn" onClick={handleOpenAddTemplate}>+ 새 문구</button>
          </div>

          <div className="template-list">
            {smsTemplates.length === 0 ? (
              <p className="empty-text">저장된 문구가 없습니다. 새 문구를 추가해주세요.</p>
            ) : (
              smsTemplates.map(template => (
                <div 
                  key={template.id} 
                  className={`template-item ${selectedTemplateId === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <div className="template-header">
                    <span className="template-title">{template.title}</span>
                    <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                      <button className="icon-btn edit" onClick={() => handleOpenEditTemplate(template)}><Edit size={14} /></button>
                      <button className="icon-btn delete" onClick={() => confirm('삭제하시겠습니까?') && deleteSmsTemplate(template.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="template-content">{template.content}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. 전송 버튼 */}
        <button 
          className="send-btn mt-6"
          onClick={handleSendSms}
          disabled={smsQueue.length === 0 || !selectedTemplateId}
        >
          <Send size={20} />
          <span>기본 문자 앱으로 전송하기</span>
        </button>
      </div>

      {/* 템플릿 추가/수정 모달 */}
      {isTemplateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTemplateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTemplateId ? '문구 수정' : '새 문구 추가'}</h2>
              <button className="close-btn" onClick={() => setIsTemplateModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="form-group">
                <label>제목 (어떤 상황인지 등)</label>
                <input 
                  type="text" 
                  value={templateTitle} 
                  onChange={e => setTemplateTitle(e.target.value)} 
                  placeholder="예: 방문 예정 안내"
                  className="modal-input"
                />
              </div>
              <div className="form-group mt-3">
                <label>문자 내용</label>
                <textarea 
                  value={templateContent} 
                  onChange={e => setTemplateContent(e.target.value)}
                  placeholder="고객에게 전송될 메시지 내용..."
                  className="modal-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={() => setIsTemplateModalOpen(false)}>취소</button>
              <button className="modal-save-btn" onClick={handleSaveTemplate}>저장</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mt-3 { margin-top: 12px; }
        .mt-4 { margin-top: 16px; }
        .mt-6 { margin-top: 24px; }
        .add-form {
          display: flex;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .form-input {
          flex: 1;
          min-width: 0;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          outline: none;
        }
        .form-input:focus { border-color: #3b82f6; }
        .add-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .clear-btn {
          background: #fee2e2;
          color: #ef4444;
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        .empty-text {
          color: #94a3b8;
          font-size: 0.85rem;
          text-align: center;
          padding: 10px 0;
        }
        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
          max-height: 200px;
          overflow-y: auto;
        }
        .queue-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }
        .queue-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .queue-name { font-weight: 700; font-size: 0.9rem; color: #1e293b; }
        .queue-phone { color: #64748b; font-size: 0.85rem; }
        .delete-btn {
          background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 4px;
        }
        .delete-btn:hover { color: #ef4444; }

        .add-template-btn {
          background: #f1f5f9;
          color: #3b82f6;
          border: 1px solid #e2e8f0;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        .template-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        .template-item {
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .template-item.selected {
          border-color: #3b82f6;
          background: #eff6ff;
        }
        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .template-title {
          font-weight: 800;
          font-size: 0.95rem;
          color: #0f172a;
        }
        .icon-btn {
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 4px;
          border-radius: 4px;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:hover { background: #f8fafc; }
        .template-content {
          font-size: 0.85rem;
          color: #475569;
          white-space: pre-wrap;
          line-height: 1.4;
        }

        .send-btn {
          width: 100%;
          background: var(--primary-color, #1e293b);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 1.05rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .send-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }
        .send-btn:not(:disabled):active {
          transform: scale(0.98);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px);
          z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal-content {
          background: #fff; width: 100%; max-width: 400px; border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px; border-bottom: 1px solid #f1f5f9;
        }
        .modal-header h2 { font-size: 1.1rem; font-weight: 800; margin: 0; }
        .close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0; }
        .form-group label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 6px; }
        .modal-input, .modal-textarea {
          width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 10px;
          font-size: 0.9rem; outline: none; box-sizing: border-box;
        }
        .modal-input:focus, .modal-textarea:focus { border-color: #3b82f6; }
        .modal-textarea { min-height: 120px; resize: vertical; }
        .modal-footer {
          padding: 16px 20px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; background: #f8fafc;
        }
        .modal-cancel-btn {
          padding: 10px 16px; background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; font-weight: 700; color: #475569; cursor: pointer;
        }
        .modal-save-btn {
          padding: 10px 20px; background: #3b82f6; border: none; border-radius: 10px; font-weight: 700; color: #fff; cursor: pointer;
        }
      `}</style>
    </div>
  )
}
