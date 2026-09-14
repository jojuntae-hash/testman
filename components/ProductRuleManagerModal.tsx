'use client'

import React, { useState } from 'react'
import { useData } from '@/lib/DataContext'
import { X, Trash2, RotateCcw, Plus, Sliders, Tag } from 'lucide-react'

interface ProductRuleManagerModalProps {
  onClose: () => void
}

export default function ProductRuleManagerModal({ onClose }: ProductRuleManagerModalProps) {
  const { productCategoryRules, updateProductCategoryRules, resetProductCategoryRules } = useData()

  // 상태 관리
  const [newCatName, setNewCatName] = useState('')
  const [newCatPrefixes, setNewCatPrefixes] = useState('')
  const [newCatKeywords, setNewCatKeywords] = useState('')
  const [isAddCatOpen, setIsAddCatOpen] = useState(false)
  const [activeInputPrefixRuleId, setActiveInputPrefixRuleId] = useState<string | null>(null)
  const [prefixInputVal, setPrefixInputVal] = useState('')
  const [activeInputKeywordRuleId, setActiveInputKeywordRuleId] = useState<string | null>(null)
  const [keywordInputVal, setKeywordInputVal] = useState('')

  // 장비 분류 핸들러들
  const handleAddPrefixToRule = (ruleId: string) => {
    if (!prefixInputVal.trim()) return
    const val = prefixInputVal.trim().toUpperCase()
    const updated = productCategoryRules.map(r => {
      if (r.id === ruleId) {
        if (!r.prefixes.includes(val)) {
          return { ...r, prefixes: [...r.prefixes, val] }
        }
      }
      return r
    })
    updateProductCategoryRules(updated)
    setPrefixInputVal('')
    setActiveInputPrefixRuleId(null)
  }

  const handleRemovePrefixFromRule = (ruleId: string, pfx: string) => {
    const updated = productCategoryRules.map(r => {
      if (r.id === ruleId) {
        return { ...r, prefixes: r.prefixes.filter(p => p !== pfx) }
      }
      return r
    })
    updateProductCategoryRules(updated)
  }

  const handleAddKeywordToRule = (ruleId: string) => {
    if (!keywordInputVal.trim()) return
    const val = keywordInputVal.trim()
    const updated = productCategoryRules.map(r => {
      if (r.id === ruleId) {
        if (!r.keywords.includes(val)) {
          return { ...r, keywords: [...r.keywords, val] }
        }
      }
      return r
    })
    updateProductCategoryRules(updated)
    setKeywordInputVal('')
    setActiveInputKeywordRuleId(null)
  }

  const handleRemoveKeywordFromRule = (ruleId: string, kw: string) => {
    const updated = productCategoryRules.map(r => {
      if (r.id === ruleId) {
        return { ...r, keywords: r.keywords.filter(k => k !== kw) }
      }
      return r
    })
    updateProductCategoryRules(updated)
  }

  const handleDeleteRule = (ruleId: string, categoryName: string) => {
    if (confirm(`'${categoryName}' 분류를 정말로 삭제하시겠습니까?`)) {
      const updated = productCategoryRules.filter(r => r.id !== ruleId)
      updateProductCategoryRules(updated)
    }
  }

  const handleCreateNewCategory = () => {
    if (!newCatName.trim()) {
      alert('장비/제품 분류명을 입력해주세요.')
      return
    }
    const pfxList = newCatPrefixes.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    const kwList = newCatKeywords.split(',').map(s => s.trim()).filter(Boolean)
    
    // 키워드가 없으면 카테고리명을 기본 키워드로 추가
    if (kwList.length === 0) {
      kwList.push(newCatName.trim())
    }

    const newRule = {
      id: `custom_${Date.now()}`,
      category: newCatName.trim(),
      prefixes: pfxList,
      keywords: kwList
    }

    updateProductCategoryRules([...productCategoryRules, newRule])
    setNewCatName('')
    setNewCatPrefixes('')
    setNewCatKeywords('')
    setIsAddCatOpen(false)
    alert(`'${newCatName.trim()}' 분류가 추가되었습니다.`)
  }

  const handleResetProductRules = () => {
    if (confirm('장비별 분류 설정을 기본값(쿠쿠 표준 정수기/비데/공청기 등)으로 초기화하시겠습니까?')) {
      resetProductCategoryRules()
      alert('장비 분류 설정이 기본값으로 초기화되었습니다.')
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content">
        <div className="modal-header">
          <div className="header-title-group">
            <Sliders size={20} color="#3b82f6" />
            <h2>장비(제품) 분류 규칙 관리</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="modal-top-bar">
            <p className="rules-desc">
              모델명 앞자리 접두사(예: CP, CBT, AC)나 특정 키워드를 기반으로 제품 카테고리(정수기, 비데 등)를 자동 분류합니다.
            </p>
            <button 
              className="reset-rules-btn" 
              onClick={handleResetProductRules}
              title="쿠쿠 표준 기본 설정으로 되돌립니다"
            >
              <RotateCcw size={13} />
              <span>기본값 초기화</span>
            </button>
          </div>

          <div className="rules-grid">
            {productCategoryRules.map(rule => (
              <div key={rule.id} className="rule-card">
                <div className="rule-header">
                  <div className="cat-title-badge">
                    <Tag size={15} color="#3b82f6" />
                    <span className="rule-cat-name">{rule.category}</span>
                  </div>
                  <button 
                    className="rule-del-btn" 
                    onClick={() => handleDeleteRule(rule.id, rule.category)}
                    title="이 분류 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* 모델 접두사 목록 */}
                <div className="rule-tag-section">
                  <span className="rule-tag-label">모델 접두사 (시작코드):</span>
                  <div className="rule-tags">
                    {rule.prefixes.length === 0 ? (
                      <span className="no-tag-text">설정된 접두사 없음</span>
                    ) : (
                      rule.prefixes.map(pfx => (
                        <span key={pfx} className="pfx-tag">
                          {pfx}
                          <button onClick={() => handleRemovePrefixFromRule(rule.id, pfx)}>×</button>
                        </span>
                      ))
                    )}
                    
                    {activeInputPrefixRuleId === rule.id ? (
                      <div className="tag-input-box">
                        <input 
                          type="text" 
                          placeholder="접두사(예: CP)" 
                          value={prefixInputVal}
                          onChange={(e) => setPrefixInputVal(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddPrefixToRule(rule.id)}
                          autoFocus
                          className="mini-tag-input"
                        />
                        <button className="mini-tag-btn add" onClick={() => handleAddPrefixToRule(rule.id)}>추가</button>
                        <button className="mini-tag-btn cancel" onClick={() => { setActiveInputPrefixRuleId(null); setPrefixInputVal('') }}>취소</button>
                      </div>
                    ) : (
                      <button 
                        className="add-tag-trigger"
                        onClick={() => { setActiveInputPrefixRuleId(rule.id); setPrefixInputVal('') }}
                      >
                        + 접두사 추가
                      </button>
                    )}
                  </div>
                </div>

                {/* 포함 키워드 목록 */}
                <div className="rule-tag-section mt-2">
                  <span className="rule-tag-label">포함 단어(키워드):</span>
                  <div className="rule-tags">
                    {rule.keywords.length === 0 ? (
                      <span className="no-tag-text">설정된 키워드 없음</span>
                    ) : (
                      rule.keywords.map(kw => (
                        <span key={kw} className="kw-tag">
                          {kw}
                          <button onClick={() => handleRemoveKeywordFromRule(rule.id, kw)}>×</button>
                        </span>
                      ))
                    )}

                    {activeInputKeywordRuleId === rule.id ? (
                      <div className="tag-input-box">
                        <input 
                          type="text" 
                          placeholder="키워드(예: 정수기)" 
                          value={keywordInputVal}
                          onChange={(e) => setKeywordInputVal(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddKeywordToRule(rule.id)}
                          autoFocus
                          className="mini-tag-input"
                        />
                        <button className="mini-tag-btn add" onClick={() => handleAddKeywordToRule(rule.id)}>추가</button>
                        <button className="mini-tag-btn cancel" onClick={() => { setActiveInputKeywordRuleId(null); setKeywordInputVal('') }}>취소</button>
                      </div>
                    ) : (
                      <button 
                        className="add-tag-trigger"
                        onClick={() => { setActiveInputKeywordRuleId(rule.id); setKeywordInputVal('') }}
                      >
                        + 단어 추가
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 새 장비 분류 추가 영역 */}
          {isAddCatOpen ? (
            <div className="add-category-form">
              <div className="form-header">
                <h4>새 장비/제품 분류 추가</h4>
                <button onClick={() => setIsAddCatOpen(false)}>×</button>
              </div>
              <div className="add-cat-inputs">
                <input 
                  type="text" 
                  placeholder="분류명 (예: 식기세척기, 인덕션)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="setting-input-full"
                />
                <input 
                  type="text" 
                  placeholder="모델 접두사(콤마로 구분, 예: CDW, CIHR)"
                  value={newCatPrefixes}
                  onChange={(e) => setNewCatPrefixes(e.target.value)}
                  className="setting-input-full mt-2"
                />
                <input 
                  type="text" 
                  placeholder="포함 키워드(콤마로 구분, 예: 식기세척기, 세척기)"
                  value={newCatKeywords}
                  onChange={(e) => setNewCatKeywords(e.target.value)}
                  className="setting-input-full mt-2"
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button className="btn-secondary" onClick={() => setIsAddCatOpen(false)}>취소</button>
                  <button className="btn-primary" onClick={handleCreateNewCategory}>분류 등록</button>
                </div>
              </div>
            </div>
          ) : (
            <button className="add-new-rule-btn" onClick={() => setIsAddCatOpen(true)}>
              <Plus size={16} />
              <span>새 장비/제품 분류 추가</span>
            </button>
          )}
        </div>

        <div className="modal-footer">
          <button className="close-bottom-btn" onClick={onClose}>닫기</button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5); z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          backdrop-filter: blur(2px);
        }
        .modal-content {
          background: #fff; width: 100%; max-width: 580px; border-radius: 20px;
          display: flex; flex-direction: column; max-height: 88vh;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 18px 22px; border-bottom: 1px solid #f1f5f9;
          background: #fff;
        }
        .header-title-group {
          display: flex; align-items: center; gap: 10px;
        }
        .header-title-group h2 {
          margin: 0; font-size: 1.15rem; font-weight: 800; color: #1e293b;
        }
        .close-btn {
          background: none; border: none; cursor: pointer; color: #64748b;
          padding: 4px; display: flex; border-radius: 6px;
        }
        .close-btn:hover { background: #f1f5f9; color: #1e293b; }
        
        .modal-body {
          padding: 20px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;
          background: #f8fafc;
        }
        .modal-top-bar {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
          background: #fff; padding: 12px 14px; border-radius: 12px; border: 1px solid #e2e8f0;
        }
        .rules-desc {
          font-size: 0.8rem; color: #64748b; margin: 0; line-height: 1.4; flex: 1;
        }
        .reset-rules-btn {
          display: flex; align-items: center; gap: 4px; white-space: nowrap;
          background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;
          padding: 6px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .reset-rules-btn:hover { background: #e2e8f0; color: #1e293b; }

        .rules-grid {
          display: flex; flex-direction: column; gap: 10px;
        }
        .rule-card {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
          padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .rule-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #f8fafc;
        }
        .cat-title-badge {
          display: flex; align-items: center; gap: 6px;
        }
        .rule-cat-name {
          font-weight: 800; font-size: 0.95rem; color: #1e293b;
        }
        .rule-del-btn {
          background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 4px;
          border-radius: 4px; transition: all 0.15s;
        }
        .rule-del-btn:hover { color: #ef4444; background: #fee2e2; }

        .rule-tag-section {
          display: flex; flex-direction: column; gap: 6px;
        }
        .rule-tag-label {
          font-size: 0.75rem; font-weight: 700; color: #64748b;
        }
        .rule-tags {
          display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
        }
        .pfx-tag {
          display: inline-flex; align-items: center; gap: 4px;
          background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;
          font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 6px;
        }
        .pfx-tag button {
          background: none; border: none; color: #93c5fd; cursor: pointer; font-size: 0.9rem; line-height: 1; padding: 0;
        }
        .pfx-tag button:hover { color: #ef4444; }
        .kw-tag {
          display: inline-flex; align-items: center; gap: 4px;
          background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;
          font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;
        }
        .kw-tag button {
          background: none; border: none; color: #86efac; cursor: pointer; font-size: 0.9rem; line-height: 1; padding: 0;
        }
        .kw-tag button:hover { color: #ef4444; }
        .no-tag-text {
          font-size: 0.75rem; color: #cbd5e1;
        }
        .add-tag-trigger {
          background: #f8fafc; border: 1px dashed #cbd5e1; color: #64748b;
          padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
        }
        .add-tag-trigger:hover {
          border-color: #3b82f6; color: #3b82f6; background: #eff6ff;
        }
        .tag-input-box {
          display: flex; align-items: center; gap: 4px;
        }
        .mini-tag-input {
          padding: 3px 8px; border: 1px solid #3b82f6; border-radius: 6px;
          font-size: 0.75rem; font-weight: 700; outline: none; width: 100px;
        }
        .mini-tag-btn {
          border: none; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer;
        }
        .mini-tag-btn.add { background: #3b82f6; color: white; }
        .mini-tag-btn.cancel { background: #f1f5f9; color: #64748b; }

        .add-new-rule-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
          background: #fff; border: 1px dashed #93c5fd; color: #2563eb; padding: 12px;
          border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
        }
        .add-new-rule-btn:hover { background: #eff6ff; border-color: #3b82f6; }

        .add-category-form {
          background: #fff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 16px;
        }
        .form-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
        }
        .form-header h4 { font-size: 0.9rem; font-weight: 800; color: #1e293b; margin: 0; }
        .form-header button { background: none; border: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer; }
        
        .setting-input-full {
          width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;
          font-size: 0.85rem; font-weight: 600; outline: none; transition: all 0.2s;
        }
        .setting-input-full:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        .mt-2 { margin-top: 8px; }

        .btn-primary {
          background: #3b82f6; color: white; border: none; padding: 8px 14px;
          border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer;
        }
        .btn-secondary {
          background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;
          padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer;
        }

        .modal-footer {
          padding: 14px 22px; border-top: 1px solid #f1f5f9; background: #fff;
          display: flex; justify-content: flex-end;
        }
        .close-bottom-btn {
          background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;
          padding: 8px 18px; border-radius: 10px; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .close-bottom-btn:hover { background: #e2e8f0; color: #1e293b; }
      `}</style>
    </div>
  )
}
