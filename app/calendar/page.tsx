'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData, CustomerData } from '@/lib/DataContext'
import { ChevronLeft, ChevronRight, Calendar, Phone, MapPin, ExternalLink, Save, Clock } from 'lucide-react'

// 예약 정보의 시간 정보를 파싱하는 헬퍼 함수
function parseReservationTime(customer: CustomerData) {
  const dateStr = customer.예약일자
  if (!dateStr) return null

  // 1. 예약일자 자체에 YYYY-MM-DD HH:mm 패턴이 있는지 확인
  const dateTimeRegex = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})/
  const match = dateStr.match(dateTimeRegex)
  if (match) {
    return {
      date: match[1],
      hour: parseInt(match[2], 10),
      minute: parseInt(match[3], 10),
      rawTime: `${match[2].padStart(2, '0')}:${match[3]}`
    }
  }

  // 2. 예약일자는 날짜만 있고(YYYY-MM-DD), 설치시특이사항 등 메모에서 시간 파싱
  const dateOnlyRegex = /^(\d{4}-\d{2}-\d{2})$/
  const dateMatch = dateStr.match(dateOnlyRegex)
  if (dateMatch) {
    const memo = customer.설치시특이사항 || ''
    // 정규식 예: '10시30분', '오전 10시', '오후 2시 30분', '13시'
    const timeRegex = /(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/
    const timeMatch = memo.match(timeRegex)
    if (timeMatch) {
      const ampm = timeMatch[1]
      let hour = parseInt(timeMatch[2], 10)
      const minute = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0

      if (ampm === '오후' && hour < 12) {
        hour += 12
      } else if (ampm === '오전' && hour === 12) {
        hour = 0
      } else if (!ampm && hour < 9) {
        // 오전/오후 구분이 없고 9시 이전이면 대개 오후일 가능성이 높음 (근무시간 고려)
        if (hour >= 1 && hour <= 7) {
          hour += 12
        }
      }

      return {
        date: dateMatch[1],
        hour,
        minute,
        rawTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      }
    }

    // 시간 파싱 안 될 경우 기본값: 오전 9시
    return {
      date: dateMatch[1],
      hour: 9,
      minute: 0,
      rawTime: '09:00'
    }
  }

  return null
}

export default function CalendarPage() {
  const router = useRouter()
  const { customers, setCustomers } = useData()
  const [currentDate, setCurrentDate] = useState<Date>(new Date('2026-05-20')) // 데이터가 있는 2026-05-20 전후를 기본값으로 설정
  
  // 모달 상태
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editDateTime, setEditDateTime] = useState('')

  // 오늘 날짜 구하기 (KST 기준)
  const todayStr = useMemo(() => {
    const today = new Date()
    const offset = today.getTimezoneOffset() * 60000
    const kstToday = new Date(today.getTime() - offset)
    return kstToday.toISOString().split('T')[0]
  }, [])

  // 이번 주의 일요일부터 토요일까지 7일 날짜 리스트 생성
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay() // 0: 일요일, 1: 월요일, ...
    startOfWeek.setDate(startOfWeek.getDate() - day)

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentDate])

  const dateRangeText = useMemo(() => {
    const start = weekDays[0]
    const end = weekDays[6]
    const format = (d: Date) => `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`
    return `${format(start)} ~ ${format(end)}`
  }, [weekDays])

  // 시간대 목록 (오전 8시 ~ 오후 8시)
  const HOURS = useMemo(() => [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], [])

  // 예약일자 포맷에 따른 데이터 가공
  const reservations = useMemo(() => {
    return customers
      .filter(c => c.status !== '삭제됨' && c.예약일자)
      .map(c => {
        const timeInfo = parseReservationTime(c)
        return {
          customer: c,
          timeInfo
        }
      })
      .filter(item => item.timeInfo !== null) as Array<{ customer: CustomerData; timeInfo: { date: string; hour: number; minute: number; rawTime: string } }>
  }, [customers])

  // 특정 날짜 및 시간대의 예약 목록 필터링
  const getReservationsFor = (date: Date, hour: number) => {
    const offset = date.getTimezoneOffset() * 60000
    const dateStr = new Date(date.getTime() - offset).toISOString().split('T')[0]
    
    return reservations.filter(r => r.timeInfo.date === dateStr && r.timeInfo.hour === hour)
  }

  // 주 이동 헬퍼
  const handlePrevWeek = () => {
    const prev = new Date(currentDate)
    prev.setDate(prev.getDate() - 7)
    setCurrentDate(prev)
  }

  const handleNextWeek = () => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + 7)
    setCurrentDate(next)
  }

  const handleGoToday = () => {
    setCurrentDate(new Date())
  }

  // 모달 열기
  const handleOpenDetail = (customer: CustomerData, timeInfo: any) => {
    setSelectedCustomer(customer)
    // input type="datetime-local" 형식에 맞게 세팅 (YYYY-MM-DDTHH:mm)
    const pad = (n: number) => n.toString().padStart(2, '0')
    const formatted = `${timeInfo.date}T${pad(timeInfo.hour)}:${pad(timeInfo.minute)}`
    setEditDateTime(formatted)
    setIsModalOpen(true)
  }

  // 예약 날짜/시간 저장
  const handleSaveDateTime = () => {
    if (!selectedCustomer) return

    // 'YYYY-MM-DDTHH:mm' -> 'YYYY-MM-DD HH:mm'
    const newDateTimeStr = editDateTime.replace('T', ' ')
    
    const updated = customers.map(c => {
      if (c.id === selectedCustomer.id) {
        return {
          ...c,
          예약일자: newDateTimeStr,
          status: c.status === '작업미완료' ? '예약완료' : c.status // 예약을 수정하면 예약완료 상태로 이동 가능
        }
      }
      return c
    })

    setCustomers(updated as any)
    alert('예약 일시가 저장되었습니다.')
    setIsModalOpen(false)
    setSelectedCustomer(null)
  }

  // 외부 지도 연결
  const handleOpenMap = (address?: string) => {
    if (!address) return
    const encoded = encodeURIComponent(address)
    const selectedMap = localStorage.getItem('navigation_app') || 'tmap'

    if (selectedMap === 'tmap') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      if (isMobile) {
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

  // 구글 캘린더 등록 링크 생성 (안 1번 구현)
  const getGoogleCalendarUrl = (customer: CustomerData) => {
    const timeInfo = parseReservationTime(customer)
    if (!timeInfo) return ''

    // 한국 표준시 기준으로 시작 Date 생성
    const startDate = new Date(timeInfo.date)
    startDate.setHours(timeInfo.hour)
    startDate.setMinutes(timeInfo.minute)

    // 소요 시간 (설정값 로드)
    const durationMin = parseInt(localStorage.getItem('task_duration') || '30', 10)
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000)

    // UTC 포맷 문자열 변환 (YYYYMMDDTHHmmSSZ)
    const toUtcString = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const startStr = toUtcString(startDate)
    const endStr = toUtcString(endDate)

    const title = `[방문점검] ${customer.고객명_상호} (${customer.모델명 || ''})`
    const location = customer.설치주소 || customer.주소 || ''
    const details = `고객번호: ${customer.고객번호 || ''}\n당월작업: ${customer.당월작업 || ''}\n특이사항: ${customer.설치시특이사항 || ''}`

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`
  }

  return (
    <div className="calendar-page">
      {/* 헤더 */}
      <div className="view-header">
        <button className="back-btn" onClick={() => router.push('/')}>
          <ChevronLeft size={24} />
        </button>
        <div className="header-text">
          <h1>일정 관리</h1>
          <p>시간대별 예약 및 구글 캘린더 연동</p>
        </div>
        <button className="today-btn" onClick={handleGoToday}>오늘</button>
      </div>

      {/* 날짜 네비게이션 */}
      <div className="date-nav">
        <button className="nav-arrow-btn" onClick={handlePrevWeek}>
          <ChevronLeft size={20} />
        </button>
        <div className="date-range">{dateRangeText}</div>
        <button className="nav-arrow-btn" onClick={handleNextWeek}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 캘린더 영역 */}
      <div className="calendar-container">
        {/* 시간 축 */}
        <div className="time-axis">
          <div className="axis-header">시간</div>
          {HOURS.map(hour => (
            <div key={hour} className="time-label">
              {hour >= 12 ? `오후 ${hour === 12 ? 12 : hour - 12}시` : `오전 ${hour}시`}
            </div>
          ))}
        </div>

        {/* 요일별 시간 그리드 (가로 스크롤 가능) */}
        <div className="weeks-scroll">
          {weekDays.map(date => {
            const dayNum = date.getDay()
            const isToday = date.toISOString().split('T')[0] === todayStr
            const dayNames = ['일', '월', '화', '수', '목', '금', '토']
            const dayName = dayNames[dayNum]

            return (
              <div key={date.toString()} className="day-column">
                {/* 요일 헤더 */}
                <div className={`column-header ${isToday ? 'today' : ''} day-${dayNum}`}>
                  <span className="day-name">{dayName}</span>
                  <span className="day-date">{date.getDate()}</span>
                </div>

                {/* 각 시간 셀 */}
                {HOURS.map(hour => {
                  const dayReservations = getReservationsFor(date, hour)
                  return (
                    <div key={hour} className="grid-cell">
                      {dayReservations.map(({ customer, timeInfo }) => (
                        <div 
                          key={customer.id} 
                          className="reservation-card"
                          onClick={() => handleOpenDetail(customer, timeInfo)}
                        >
                          <div className="res-title">{customer.고객명_상호}</div>
                          <div className="res-time">
                            {timeInfo.hour.toString().padStart(2, '0')}:{timeInfo.minute.toString().padStart(2, '0')}
                          </div>
                          <div className="res-meta">{customer.모델명 ? customer.모델명.split('(')[0] : ''}</div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* 일정 상세 & 날짜 수정 모달 */}
      {isModalOpen && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animated-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>예약 상세 정보</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="info-section">
                <div className="customer-info-header">
                  <span className="customer-title">{selectedCustomer.고객명_상호}</span>
                  <span className={`status-badge status-${selectedCustomer.status}`}>{selectedCustomer.status}</span>
                </div>
                <div className="info-detail-item">
                  <label>고객번호</label>
                  <span>{selectedCustomer.고객번호}</span>
                </div>
                <div className="info-detail-item">
                  <label>모델명</label>
                  <span>{selectedCustomer.모델명 || '-'}</span>
                </div>
                <div className="info-detail-item">
                  <label>당월작업</label>
                  <span>{selectedCustomer.당월작업 || '-'}</span>
                </div>
                {selectedCustomer.전화번호 && (
                  <div className="info-detail-item">
                    <label>연락처</label>
                    <div className="row-action">
                      <span>{selectedCustomer.전화번호}</span>
                      <a href={`tel:${selectedCustomer.전화번호.replace(/[^0-9]/g, '')}`} className="action-circle-btn phone">
                        <Phone size={14} />
                      </a>
                    </div>
                  </div>
                )}
                {(selectedCustomer.설치주소 || selectedCustomer.주소) && (
                  <div className="info-detail-item">
                    <label>주소</label>
                    <div className="row-action">
                      <span className="address-text">{selectedCustomer.설치주소 || selectedCustomer.주소}</span>
                      <button className="action-circle-btn map" onClick={() => handleOpenMap(selectedCustomer.설치주소 || selectedCustomer.주소)}>
                        <MapPin size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {selectedCustomer.설치시특이사항 && (
                  <div className="info-detail-item">
                    <label>특이사항</label>
                    <div className="memo-box">{selectedCustomer.설치시특이사항}</div>
                  </div>
                )}
              </div>

              {/* 예약 시간 편집 */}
              <div className="edit-section">
                <div className="section-title"><Clock size={16} /> 예약 일정 편집</div>
                <input 
                  type="datetime-local" 
                  className="datetime-input"
                  value={editDateTime}
                  onChange={e => setEditDateTime(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <a 
                href={getGoogleCalendarUrl(selectedCustomer)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="google-cal-btn"
              >
                <ExternalLink size={16} />
                구글 캘린더 등록
              </a>
              
              <button className="save-btn" onClick={handleSaveDateTime}>
                <Save size={16} />
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .calendar-page {
          min-height: 100%;
          background: #f8fafc;
          padding-bottom: 100px;
          display: flex;
          flex-direction: column;
        }
        .view-header {
          height: 80px;
          display: flex;
          align-items: center;
          padding: 0 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 99;
        }
        .back-btn {
          background: none;
          border: none;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
        }
        .header-text {
          margin-left: 12px;
          flex: 1;
        }
        .header-text h1 {
          font-size: 1.25rem;
          font-weight: 800;
          margin: 0;
          color: #1e293b;
        }
        .header-text p {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0;
          font-weight: 500;
        }
        .today-btn {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .today-btn:active {
          transform: scale(0.95);
        }

        /* 날짜 네비게이션 */
        .date-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 20px;
          background: #fff;
          border-bottom: 1px solid #f1f5f9;
        }
        .nav-arrow-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }
        .nav-arrow-btn:active {
          background: #f1f5f9;
          transform: scale(0.95);
        }
        .date-range {
          font-size: 0.95rem;
          font-weight: 800;
          color: #1e293b;
        }

        /* 캘린더 그리드 */
        .calendar-container {
          flex: 1;
          display: flex;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          margin: 15px;
          overflow: hidden;
          min-width: 0;
          width: calc(100% - 30px);
        }
        .time-axis {
          width: 65px;
          border-right: 1px solid #e2e8f0;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
        }
        .axis-header {
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 800;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
        }
        .time-label {
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 700;
          color: #64748b;
          text-align: center;
          border-bottom: 1px solid #f1f5f9;
        }

        .weeks-scroll {
          flex: 1;
          display: flex;
          min-width: 0;
        }
        .weeks-scroll::-webkit-scrollbar {
          display: none; /* Safari, Chrome */
        }
        .day-column {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #f1f5f9;
        }
        .day-column:last-child {
          border-right: none;
        }
        .column-header {
          height: 50px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          gap: 2px;
        }
        .column-header.today {
          background: #eff6ff;
        }
        .column-header.today .day-date {
          background: #3b82f6;
          color: #fff;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
        }
        .day-name {
          font-size: 0.7rem;
          font-weight: 700;
          color: #64748b;
        }
        .day-date {
          font-size: 0.8rem;
          font-weight: 800;
          color: #1e293b;
        }
        /* 요일별 컬러 */
        .day-0 .day-name, .day-0 .day-date { color: #ef4444; } /* 일요일 */
        .day-6 .day-name, .day-6 .day-date { color: #3b82f6; } /* 토요일 */

        .grid-cell {
          height: 80px;
          border-bottom: 1px solid #f1f5f9;
          padding: 3px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
          background: #fff;
          min-height: 80px;
        }
        
        /* 예약 카드 */
        .reservation-card {
          background: #eff6ff;
          border-left: 3px solid #3b82f6;
          border-radius: 6px;
          padding: 4px 6px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 48px;
        }
        .reservation-card:hover {
          background: #dbeafe;
          transform: translateY(-1px);
        }
        .res-title {
          font-size: 0.7rem;
          font-weight: 800;
          color: #1e40af;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .res-time {
          font-size: 0.6rem;
          font-weight: 700;
          color: #2563eb;
          margin-top: 1px;
        }
        .res-meta {
          font-size: 0.55rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
        }

        /* 모달 팝업 */
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
          max-width: 420px;
          border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          max-height: 85vh;
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
        .modal-body {
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .customer-info-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .customer-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: #1e293b;
        }
        .status-badge {
          font-size: 0.65rem;
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 700;
        }
        .status-badge.status-예약완료 { background: #eef2ff; color: #4f46e5; }
        .status-badge.status-작업미완료 { background: #f5f5f5; color: #64748b; }
        .status-badge.status-작업완료 { background: #ecfdf5; color: #10b981; }

        .info-detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
        }
        .info-detail-item label {
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .info-detail-item span {
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
        }
        .row-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .address-text {
          flex: 1;
          line-height: 1.4;
        }
        .action-circle-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-circle-btn:active {
          transform: scale(0.9);
        }
        .action-circle-btn.phone { background: #10b981; }
        .action-circle-btn.map { background: #3b82f6; }
        .memo-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          color: #475569;
          line-height: 1.4;
        }

        .edit-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
        }
        .section-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .datetime-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          outline: none;
          color: #334155;
          background: #fff;
        }
        .datetime-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 10px;
        }
        .google-cal-btn {
          flex: 1.2;
          background: #fff;
          color: #4285f4;
          border: 1px solid #4285f4;
          padding: 10px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .google-cal-btn:hover {
          background: #f4f8fe;
        }
        .google-cal-btn:active {
          transform: scale(0.98);
        }
        .save-btn {
          flex: 0.8;
          background: #0f172a;
          color: #fff;
          border: none;
          padding: 10px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .save-btn:hover {
          background: #1e293b;
        }
        .save-btn:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  )
}
