'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useData } from '@/lib/DataContext'
import { Info, FileText, MapPin, MessageSquare, ChevronLeft, Phone, Save, Calendar, Clock, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import VisitLogModal from '@/components/VisitLogModal'

// 오전 8시 ~ 오후 8시, 00/30분 슬롯
const TIME_SLOTS = (() => {
  const slots: { label: string; hour: number; minute: number }[] = []
  for (let h = 8; h <= 20; h++) {
    const ampm = h < 12 ? '오전' : '오후'
    const display = h <= 12 ? h : h - 12
    slots.push({ label: `${ampm} ${display}시 00분`, hour: h, minute: 0 })
    if (h < 20) {
      slots.push({ label: `${ampm} ${display}시 30분`, hour: h, minute: 30 })
    }
  }
  return slots
})()

export default function DetailPage() {
  const { id } = useParams()
  const { customers, setCustomers, changeCustomerStatus } = useData()
  const router = useRouter()
  
  const customer = customers.find(c => c.id === id)
  const [memo, setMemo] = useState('')
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false)
  const [isResModalOpen, setIsResModalOpen] = useState(false)
  // 커스텀 피커 상태
  const [editDate, setEditDate] = useState('')
  const [editHour, setEditHour] = useState(9)
  const [editMinute, setEditMinute] = useState(0)
  
  const [isCompModalOpen, setIsCompModalOpen] = useState(false)
  const [editCompDate, setEditCompDate] = useState('')

  const handleOpenResModal = () => {
    if (!customer) return
    // 기존 예약일자 파싱
    let initDate = ''
    let initHour = 9
    let initMinute = 0
    if (customer.예약일자) {
      const parts = String(customer.예약일자).replace('T', ' ').split(' ')
      initDate = parts[0] || ''
      if (parts[1]) {
        const [hStr, mStr] = parts[1].split(':')
        const parsedH = parseInt(hStr, 10)
        const parsedM = parseInt(mStr, 10)
        initHour = Math.min(20, Math.max(8, isNaN(parsedH) ? 9 : parsedH))
        initMinute = parsedM >= 30 ? 30 : 0
      }
    } else {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = (today.getMonth() + 1).toString().padStart(2, '0')
      const dd = today.getDate().toString().padStart(2, '0')
      initDate = `${yyyy}-${mm}-${dd}`
    }
    setEditDate(initDate)
    setEditHour(initHour)
    setEditMinute(initMinute)
    setIsResModalOpen(true)
  }

  const handleSaveResDateTime = async () => {
    if (!customer || !editDate) return
    const pad = (n: number) => n.toString().padStart(2, '0')
    const newDateTimeStr = `${editDate} ${pad(editHour)}:${pad(editMinute)}`
    
    const newStatus = customer.status === '작업미완료' ? '예약완료' : customer.status

    const updated = customers.map(c => {
      if (c.id === customer.id) {
        return {
          ...c,
          예약일자: newDateTimeStr,
          status: newStatus
        }
      }
      return c
    })
    
    // 로컬 상태 업데이트
    setCustomers(updated as any)
    
    // Supabase에 해당 고객만 단일 업데이트 처리
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        
        const target = updated.find(c => c.id === customer.id)
        if (target) {
          await supabase.from('customers').upsert([target])
        }
      } catch (err) {
        console.error('Supabase save error:', err)
      }
    }

    alert('예약 일정이 저장되었습니다.')
    setIsResModalOpen(false)
  }

  const handleOpenCompModal = () => {
    if (!customer) return
    let initDate = ''
    if (customer.작업완료일) {
      initDate = customer.작업완료일
    } else {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = (today.getMonth() + 1).toString().padStart(2, '0')
      const dd = today.getDate().toString().padStart(2, '0')
      initDate = `${yyyy}-${mm}-${dd}`
    }
    setEditCompDate(initDate)
    setIsCompModalOpen(true)
  }

  const handleSaveCompDate = () => {
    if (!customer || !editCompDate) return
    const updated = customers.map(c => {
      if (c.id === customer.id) {
        return {
          ...c,
          작업완료일: editCompDate
        }
      }
      return c
    })
    setCustomers(updated as any)
    alert('작업 완료일이 저장되었습니다.')
    setIsCompModalOpen(false)
  }

  const uniqueFolders = React.useMemo(() => {
    const statuses = Array.from(new Set(customers.map(c => c.status)))
    const base = ['작업미완료', '예약완료', '작업완료']
    const customs = statuses.filter(s => !['작업미완료', '예약완료', '작업완료', '삭제됨'].includes(s))
    return [...base, ...customs]
  }, [customers])

  const handleFolderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!customer) return
    const newStatus = e.target.value
    if (newStatus === '__NEW__') {
      const newFolder = prompt('새로운 폴더 이름을 입력하세요.')
      if (newFolder && newFolder.trim() !== '') {
        await changeCustomerStatus([customer.id], newFolder.trim(), true)
      }
    } else {
      await changeCustomerStatus([customer.id], newStatus, true)
    }
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

  useEffect(() => {
    if (id) {
      loadMemo()
    }
  }, [id])

  const loadMemo = async () => {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .eq('customer_id', id)
      .order('updated_at', { ascending: false })
      .limit(1)
    
    if (data && data.length > 0 && !data[0].is_deleted) {
      setMemo(data[0].content || '')
    } else {
      setMemo('')
    }
  }

  const handleSaveMemo = async () => {
    const { data: existing, error: selectError } = await supabase.from('memos').select('id, is_deleted').eq('customer_id', id).limit(1)
    
    if (selectError) {
      alert(`조회 오류: ${selectError.message}`);
      return;
    }

    if (existing && existing.length > 0) {
      const { error } = await supabase.from('memos').update({ content: memo, is_deleted: false, updated_at: new Date().toISOString() }).eq('id', existing[0].id)
      if (!error) alert('메모가 저장되었습니다.')
      else alert(`메모 저장에 실패했습니다: ${error.message || JSON.stringify(error)}`)
    } else {
      const { error } = await supabase.from('memos').insert([{ customer_id: id, content: memo, is_deleted: false }])
      if (!error) alert('메모가 저장되었습니다.')
      else alert(`메모 저장에 실패했습니다: ${error.message || JSON.stringify(error)}`)
    }
  }

  const openMap = (address: string) => {
    if (!address) return
    const encoded = encodeURIComponent(address)
    const selectedMap = localStorage.getItem('navigation_app') || 'tmap'

    if (selectedMap === 'tmap') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      if (isMobile) {
        // intent scheme 대신 범용적인 tmap:// scheme을 사용하여 호환성 향상
        window.location.href = `tmap://search?name=${encoded}`
      } else {
        alert('Tmap은 모바일 기기에서만 실행 가능합니다. 카카오맵으로 연결합니다.')
        window.open(`https://map.kakao.com/link/search/${encoded}`, '_blank')
      }
    } else if (selectedMap === 'naver') {
      window.open(`https://map.naver.com/v5/search/${encoded}`, '_blank')
    } else {
      window.open(`https://map.kakao.com/link/search/${encoded}`, '_blank')
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="badge-simple">정기 관리 대상</span>
          <div className="folder-select-container">
            <label style={{ fontSize: '0.75rem', color: '#666', marginRight: 6, fontWeight: 700 }}>폴더 이동:</label>
            <select 
              value={customer.status} 
              onChange={handleFolderChange}
              className="folder-select-detail"
            >
              {uniqueFolders.map(folder => (
                <option key={folder} value={folder}>
                  {folder === '작업미완료' ? '작업 미완료' : folder === '예약완료' ? '예약 완료' : folder === '작업완료' ? '작업 완료' : folder}
                </option>
              ))}
              <option value="__NEW__">+ 새 폴더 만들기</option>
            </select>
          </div>
        </div>
        <div className="title-row">
          <h2 className="customer-name">{customer.고객명_상호}</h2>
          {customer.전화번호 && (
            <a href={`tel:${String(customer.전화번호).replace(/[^0-9]/g, '')}`} className="action-circle-btn phone">
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, color: customer.예약일자 ? '#1e293b' : '#94a3b8' }}>
                {customer.예약일자 || '미지정'}
              </span>
              <button 
                onClick={handleOpenResModal}
                style={{ 
                  padding: '4px 8px', 
                  background: '#eff6ff', 
                  border: '1px solid #dbeafe', 
                  borderRadius: '6px', 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  cursor: 'pointer'
                }}
              >
                <Calendar size={12} />
                설정
              </button>
            </div>
          </div>
          <div className="info-item">
            <label>당월작업</label>
            <span>{customer.당월작업}</span>
          </div>
          {customer.status === '작업완료' && (
            <div className="info-item" style={{ borderLeft: '3px solid #10b981', paddingLeft: 8 }}>
              <label style={{ color: '#10b981', fontWeight: 700 }}>작업 완료일</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: customer.작업완료일 ? '#10b981' : '#64748b', fontWeight: 700 }}>
                  {customer.작업완료일 || '미지정'}
                </span>
                <button 
                  onClick={handleOpenCompModal}
                  style={{ 
                    padding: '4px 8px', 
                    background: '#ecfdf5', 
                    border: '1px solid #a7f3d0', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    cursor: 'pointer'
                  }}
                >
                  <Calendar size={12} />
                  설정
                </button>
              </div>
            </div>
          )}
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
                <a href={`tel:${String(customer.전화번호).replace(/[^0-9]/g, '')}`} className="mini-call-btn">
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
                <a href={`tel:${String(customer.핸드폰번호).replace(/[^0-9]/g, '')}`} className="mini-call-btn">
                  <Phone size={12} />
                </a>
              )}
            </div>
          </div>
          <div className="info-item full">
            <label>주소</label>
            <div className="value-with-action">
              <span>{customer.주소}</span>
              {customer.주소 && (
                <button className="mini-map-btn" onClick={() => openMap(customer.주소)}>
                  <MapPin size={12} />
                </button>
              )}
            </div>
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
                <a href={`tel:${String(customer.설치전화번호).replace(/[^0-9]/g, '')}`} className="mini-call-btn">
                  <Phone size={12} />
                </a>
              )}
            </div>
          </div>
          {(customer.설치주소 || customer.주소) && (
            <div className="info-item full">
              <label>주소</label>
              <div className="value-with-action">
                <span>{customer.설치주소 || customer.주소}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="mini-map-btn" onClick={() => openMap(customer.설치주소 || customer.주소)}>
                    <MapPin size={12} />
                  </button>
                  <button className="mini-map-btn" onClick={() => handleCopyAddress(customer.설치주소 || customer.주소)}>
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
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
        <button className="submit-btn" onClick={() => setIsVisitModalOpen(true)}>
          <MessageSquare size={18} />
          방문 관리 기록 작성
        </button>
      </div>

      <VisitLogModal 
        customerId={id as string} 
        isOpen={isVisitModalOpen} 
        onClose={() => setIsVisitModalOpen(false)} 
      />

      {/* 예약 일정 설정/수정 모달 */}
      {isResModalOpen && (
        <div className="modal-overlay" onClick={() => setIsResModalOpen(false)}>
          <div className="modal-content animated-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>예약 일정 설정</h2>
              <button className="close-btn" onClick={() => setIsResModalOpen(false)}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> 예약 날짜 및 시간 선택
                </div>
                {/* 날짜 선택 */}
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    color: '#334155',
                    background: '#fff',
                    boxSizing: 'border-box',
                    display: 'block',
                    marginBottom: '8px'
                  }}
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                />
                {/* 시간 선택: 오전 8시 ~ 오후 8시, 00/30분만 */}
                <select
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    color: '#334155',
                    background: '#fff',
                    boxSizing: 'border-box',
                    display: 'block',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    appearance: 'auto'
                  }}
                  value={`${editHour}:${editMinute}`}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':').map(Number)
                    setEditHour(h)
                    setEditMinute(m)
                  }}
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={`${slot.hour}:${slot.minute}`} value={`${slot.hour}:${slot.minute}`}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setIsResModalOpen(false)} 
                style={{ padding: '10px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
              >
                취소
              </button>
              <button 
                onClick={handleSaveResDateTime} 
                style={{ padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={14} /> 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 작업 완료일 설정/수정 모달 */}
      {isCompModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCompModalOpen(false)}>
          <div className="modal-content animated-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>작업 완료일 설정</h2>
              <button className="close-btn" onClick={() => setIsCompModalOpen(false)}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} /> 완료 날짜 선택
                </div>
                <input
                  type="date"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    color: '#334155',
                    background: '#fff',
                    boxSizing: 'border-box',
                    display: 'block'
                  }}
                  value={editCompDate}
                  onChange={e => setEditCompDate(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setIsCompModalOpen(false)} 
                style={{ padding: '10px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
              >
                취소
              </button>
              <button 
                onClick={handleSaveCompDate} 
                style={{ padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={14} /> 저장
              </button>
            </div>
          </div>
        </div>
      )}

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
          font-weight: 600;
          color: #1e293b;
          word-break: break-all;
          overflow-wrap: anywhere;
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
        .value-with-action { display: flex; align-items: center; gap: 8px; justify-content: flex-start; }
        .mini-call-btn { width: 28px; height: 28px; background: #ecfdf5; color: #10b981; border: 1px solid #d1fae5; border-radius: 6px; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s; cursor: pointer; }
        .mini-call-btn:active { transform: scale(0.9); }
        .mini-map-btn { width: 28px; height: 28px; background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; border-radius: 6px; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s; cursor: pointer; }
        .mini-map-btn:active { transform: scale(0.9); }
        
        /* 모달 공통 스타일 */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-content {
          background: #fff;
          width: 100%;
          max-width: 400px;
          border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .animated-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          0% { transform: translateY(15px) scale(0.97); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-header h2 {
          font-size: 1rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.3rem;
          color: #94a3b8;
          cursor: pointer;
        }

        .folder-select-container {
          display: flex;
          align-items: center;
          background: #f1f5f9;
          padding: 4px 10px;
          border-radius: 8px;
        }
        .folder-select-detail {
          border: none;
          background: transparent;
          font-size: 0.8rem;
          font-weight: 700;
          color: #3b82f6;
          outline: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
