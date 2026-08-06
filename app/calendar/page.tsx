'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData, CustomerData } from '@/lib/DataContext'
import { ChevronLeft, ChevronRight, Calendar, Phone, MapPin, ExternalLink, Save, Clock, Copy, CheckCircle2, MessageCircle, ListPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import VisitLogModal from '@/components/VisitLogModal'

// 예약 정보의 시간 정보를 파싱하는 헬퍼 함수
// 예약일자에 날짜+시간이 명시된 경우(YYYY-MM-DD HH:mm)만 파싱.
// 메모·방문기록 등 다른 필드는 무시.
function parseReservationTime(customer: CustomerData) {
  const dateStr = customer.예약일자 ? String(customer.예약일자) : ''
  if (!dateStr) return null

  // 예약일자에 YYYY-MM-DD HH:mm 형식이 있어야만 캘린더에 표시
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

  // 날짜만 있거나 시간이 없으면 캘린더에 표시하지 않음
  return null
}

// 커스텀 시간 피커용 헬퍼: 오전 8시~오후 8시(8~20) 슬롯 생성
const TIME_SLOTS = (() => {
  const slots: { label: string; hour: number; minute: number }[] = []
  for (let h = 8; h <= 20; h++) {
    const ampm = h < 12 ? '오전' : h === 12 ? '오후' : '오후'
    const display = h <= 12 ? h : h - 12
    slots.push({ label: `${ampm} ${display}시 00분`, hour: h, minute: 0 })
    if (h < 20) {
      slots.push({ label: `${ampm} ${display}시 30분`, hour: h, minute: 30 })
    }
  }
  return slots
})()

export default function CalendarPage() {
  const router = useRouter()
  const { customers, setCustomers, addToSmsQueue } = useData()
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  
  // 모달 상태
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  // 커스텀 피커: 날짜(YYYY-MM-DD) + 시(hour) + 분(minute)
  const [editDate, setEditDate] = useState('')
  const [editHour, setEditHour] = useState(9)
  const [editMinute, setEditMinute] = useState(0)
  const [isVisitLogModalOpen, setIsVisitLogModalOpen] = useState(false)

  const [memo, setMemo] = useState<string>('')
  const [visitLogs, setVisitLogs] = useState<any[]>([])
  const [loadingExtra, setLoadingExtra] = useState(false)

  const handleSaveMemo = async () => {
    if (!selectedCustomer) return
    const { data: existing } = await supabase.from('memos').select('id').eq('customer_id', selectedCustomer.id).limit(1)
    if (existing && existing.length > 0) {
      await supabase.from('memos').update({ content: memo, is_deleted: !memo.trim(), updated_at: new Date().toISOString() }).eq('id', existing[0].id)
    } else {
      if (memo.trim()) {
        await supabase.from('memos').insert([{ customer_id: selectedCustomer.id, content: memo, is_deleted: false }])
      }
    }
    alert('메모가 저장되었습니다.')
  }

  useEffect(() => {
    if (isModalOpen && selectedCustomer) {
      loadExtraInfo(selectedCustomer.id)
    }
  }, [isModalOpen, selectedCustomer])

  const loadExtraInfo = async (id: string) => {
    setLoadingExtra(true)
    const { data: memoData } = await supabase.from('memos').select('*').eq('customer_id', id).order('updated_at', { ascending: false }).limit(1)
    if (memoData && memoData.length > 0 && !memoData[0].is_deleted) {
      setMemo(memoData[0].content || '')
    } else {
      setMemo('')
    }
    const { data: logsData } = await supabase.from('visit_logs').select('*').eq('customer_id', id).order('visit_date', { ascending: false })
    if (logsData) {
      setVisitLogs(logsData.filter((log: any) => !log.is_deleted))
    } else {
      setVisitLogs([])
    }
    setLoadingExtra(false)
  }

  // 오늘 날짜 구하기 (KST 기준)
  const todayStr = useMemo(() => {
    const today = new Date()
    const offset = today.getTimezoneOffset() * 60000
    const kstToday = new Date(today.getTime() - offset)
    return kstToday.toISOString().split('T')[0]
  }, [])

  // 기준일(currentDate)부터 연속된 4일 날짜 리스트 생성 (빽빽함 해결)
  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 4; i++) {
      const d = new Date(currentDate)
      d.setDate(currentDate.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentDate])

  const dateRangeText = useMemo(() => {
    if (weekDays.length === 0) return ''
    const start = weekDays[0]
    const end = weekDays[weekDays.length - 1]
    const format = (d: Date) => `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`
    return `${format(start)} ~ ${format(end)}`
  }, [weekDays])

  // 시간대 목록 (오전 8시 ~ 오후 8시)
  const HOURS = useMemo(() => [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], [])

  // 예약일자 포맷에 따른 데이터 가공
  const reservations = useMemo(() => {
    return customers
      .filter(c => c.status !== '삭제됨' && c.status !== '작업미완료' && c.예약일자)
      .map(c => {
        const timeInfo = parseReservationTime(c)
        return {
          customer: c,
          timeInfo
        }
      })
      .filter(item => item.timeInfo !== null) as Array<{ customer: CustomerData; timeInfo: { date: string; hour: number; minute: number; rawTime: string } }>
  }, [customers])

  // 특정 날짜 및 시간대의 예약 목록 필터링 (분 기준 오름차순 정렬)
  const getReservationsFor = (date: Date, hour: number) => {
    const offset = date.getTimezoneOffset() * 60000
    const dateStr = new Date(date.getTime() - offset).toISOString().split('T')[0]
    
    return reservations
      .filter(r => r.timeInfo.date === dateStr && r.timeInfo.hour === hour)
      .sort((a, b) => a.timeInfo.minute - b.timeInfo.minute)
  }

  // 4일 단위로 주 이동
  const handlePrevWeek = () => {
    const prev = new Date(currentDate)
    prev.setDate(prev.getDate() - 4)
    setCurrentDate(prev)
  }

  const handleNextWeek = () => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + 4)
    setCurrentDate(next)
  }

  const handleGoToday = () => {
    setCurrentDate(new Date())
  }

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isLongPressed, setIsLongPressed] = useState(false)
  const [activeDropCell, setActiveDropCell] = useState<{ date: string; hour: number } | null>(null)
  const [dragTouch, setDragTouch] = useState<{x: number, y: number} | null>(null)
  const longPressTimer = React.useRef<any>(null)
  const touchStartPos = React.useRef({ x: 0, y: 0 })
  const dragStartCellInfo = React.useRef<{
    dateIndex: number;
    hour: number;
    colWidth: number;
    cellHeight: number;
  } | null>(null)

  // 드래그 중 네이티브 스크롤 방지 (패시브 이벤트 우회)
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      if (isLongPressed) {
        e.preventDefault()
      }
    }
    document.addEventListener('touchmove', preventScroll, { passive: false })
    return () => document.removeEventListener('touchmove', preventScroll)
  }, [isLongPressed])

  // 캘린더 스와이프 제스처 관련 (클릭 간섭 문제로 기능 비활성화)
  const swipeStartPos = React.useRef({ x: 0, y: 0 })
  const [isSwiping, setIsSwiping] = useState(false)
  const [slideAnim, setSlideAnim] = useState('')

  const handleCalendarTouchStart = (e: React.TouchEvent) => {
    // 비활성화
  }

  const handleCalendarTouchEnd = (e: React.TouchEvent) => {
    // 비활성화
  }

  const handleDropToCell = (customerId: string, targetDateStr: string, targetHour: number) => {
    const targetCustomer = customers.find(c => c.id === customerId)
    let targetMinute = 0
    if (targetCustomer) {
      const timeInfo = parseReservationTime(targetCustomer)
      if (timeInfo) targetMinute = timeInfo.minute
    }
    const pad = (n: number) => n.toString().padStart(2, '0')
    const newDateTimeStr = `${targetDateStr} ${pad(targetHour)}:${pad(targetMinute)}`

    const updated = customers.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          예약일자: newDateTimeStr,
          status: c.status === '작업미완료' ? '예약완료' : c.status
        }
      }
      return c
    })
    setCustomers(updated as any)
  }

  // 좌표를 기반으로 드롭될 칸(Cell)을 수학적으로 계산 (DOM 오버레이/트랜지션 무시)
  const findDropCellFromTouch = (clientX: number, clientY: number) => {
    const container = document.querySelector('.weeks-scroll')
    if (!container) return null

    const columns = Array.from(container.querySelectorAll('.day-column'))
    const targetCol = columns.find(col => {
      const rect = col.getBoundingClientRect()
      return clientX >= rect.left && clientX <= rect.right
    })

    if (!targetCol) return null

    const cells = Array.from(targetCol.querySelectorAll('.grid-cell'))
    const targetCell = cells.find(cell => {
      const rect = cell.getBoundingClientRect()
      return clientY >= rect.top && clientY <= rect.bottom
    })

    if (!targetCell) return null

    const date = targetCell.getAttribute('data-date')
    const hour = targetCell.getAttribute('data-hour')
    
    if (date && hour) {
      return { date, hour: parseInt(hour, 10) }
    }
    return null
  }

  const handleTouchStart = (e: React.TouchEvent, customerId: string, originalDateStr: string, originalHour: number) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      setDraggingId(customerId)
      setIsLongPressed(true)
      setDragTouch({ x: touch.clientX, y: touch.clientY })
      
      const container = document.querySelector('.weeks-scroll')
      let colWidth = 80
      let cellHeight = 80
      if (container) {
        const firstCol = container.querySelector('.day-column')
        if (firstCol) {
          const rect = firstCol.getBoundingClientRect()
          colWidth = rect.width
        }
        const firstCell = container.querySelector('.grid-cell')
        if (firstCell) {
          const rect = firstCell.getBoundingClientRect()
          cellHeight = rect.height
        }
      }

      const dateIndex = weekDays.findIndex(d => d.toISOString().split('T')[0] === originalDateStr)
      dragStartCellInfo.current = {
        dateIndex: dateIndex !== -1 ? dateIndex : 0,
        hour: originalHour,
        colWidth: colWidth > 0 ? colWidth : 80,
        cellHeight: cellHeight > 0 ? cellHeight : 80
      }

      if (navigator.vibrate) navigator.vibrate(50)
    }, 400) // 0.4초로 좀 더 빠르게 반응하도록 수정
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!longPressTimer.current && !isLongPressed) return
    const touch = e.touches[0]
    const dist = Math.hypot(touch.clientX - touchStartPos.current.x, touch.clientY - touchStartPos.current.y)
    
    if (!isLongPressed && dist > 15) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
      return
    }

    if (isLongPressed && draggingId && dragStartCellInfo.current) {
      setDragTouch({ x: touch.clientX, y: touch.clientY })
      
      const { dateIndex, hour, colWidth, cellHeight } = dragStartCellInfo.current
      const deltaX = touch.clientX - touchStartPos.current.x
      const deltaY = touch.clientY - touchStartPos.current.y

      const colDelta = Math.round(deltaX / colWidth)
      const rowDelta = Math.round(deltaY / cellHeight)

      const newColIndex = Math.min(3, Math.max(0, dateIndex + colDelta))
      const newHour = Math.min(20, Math.max(8, hour + rowDelta))

      const targetDate = weekDays[newColIndex]
      if (targetDate) {
        const targetDateStr = targetDate.toISOString().split('T')[0]
        setActiveDropCell({ date: targetDateStr, hour: newHour })
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    if (isLongPressed && draggingId) {
      if (activeDropCell) {
        handleDropToCell(draggingId, activeDropCell.date, activeDropCell.hour)
      } else if (dragStartCellInfo.current) {
        const touch = e.changedTouches[0]
        const { dateIndex, hour, colWidth, cellHeight } = dragStartCellInfo.current
        const deltaX = touch.clientX - touchStartPos.current.x
        const deltaY = touch.clientY - touchStartPos.current.y
        
        const colDelta = Math.round(deltaX / colWidth)
        const rowDelta = Math.round(deltaY / cellHeight)
        
        const newColIndex = Math.min(3, Math.max(0, dateIndex + colDelta))
        const newHour = Math.min(20, Math.max(8, hour + rowDelta))
        
        const targetDate = weekDays[newColIndex]
        if (targetDate) {
          const targetDateStr = targetDate.toISOString().split('T')[0]
          handleDropToCell(draggingId, targetDateStr, newHour)
        }
      }
    }

    setDraggingId(null)
    setIsLongPressed(false)
    setActiveDropCell(null)
    setDragTouch(null)
    dragStartCellInfo.current = null
  }

  // 모달 열기
  const handleOpenDetail = (customer: CustomerData, timeInfo: any) => {
    setSelectedCustomer(customer)
    setEditDate(timeInfo.date)
    // 가장 가까운 유효 시간(8~20, 0/30분)으로 반올림
    const clampedHour = Math.min(20, Math.max(8, timeInfo.hour))
    const clampedMinute = timeInfo.minute >= 30 ? 30 : 0
    setEditHour(clampedHour)
    setEditMinute(clampedMinute)
    setIsModalOpen(true)
  }

  // 예약 날짜/시간 저장
  const handleSaveDateTime = () => {
    if (!selectedCustomer) return

    const pad = (n: number) => n.toString().padStart(2, '0')
    const newDateTimeStr = `${editDate} ${pad(editHour)}:${pad(editMinute)}`
    
    const updated = customers.map(c => {
      if (c.id === selectedCustomer.id) {
        return {
          ...c,
          예약일자: newDateTimeStr,
          status: c.status === '작업미완료' ? '예약완료' : c.status
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

  const handleCopyAddress = (address?: string) => {
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

  const handleSetComplete = () => {
    if (!selectedCustomer) return;
    const today = new Date().toLocaleDateString('sv-SE');
    const updated = customers.map(c => {
      if (c.id === selectedCustomer.id) {
        return {
          ...c,
          status: '작업완료',
          작업완료일: today
        };
      }
      return c;
    });
    setCustomers(updated as any);
    alert('작업이 완료되었습니다.');
    setIsModalOpen(false);
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

    const title = `${customer.고객명_상호}`
    const location = customer.설치주소 || customer.주소 || ''
    const details = `고객번호: ${customer.고객번호 || ''}\n당월작업: ${customer.당월작업 || ''}\n모델명: ${customer.모델명 || ''}`

    // src=캘린더ID → '예약고객' 캘린더에 직접 등록
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&src=137de0a07ebdb855f85fd0e902b1d814b6f7fb4a63a426b89f1c1f2b817dc127%40group.calendar.google.com`
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
      <div className={`calendar-container ${slideAnim}`}>
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
                  const isOver = activeDropCell && activeDropCell.date === date.toISOString().split('T')[0] && activeDropCell.hour === hour
                  
                  return (
                    <div 
                      key={hour} 
                      className={`grid-cell ${isOver ? 'drag-over' : ''}`}
                      data-date={date.toISOString().split('T')[0]}
                      data-hour={hour}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setActiveDropCell({ date: date.toISOString().split('T')[0], hour })
                      }}
                      onDragLeave={() => setActiveDropCell(null)}
                      onDrop={(e) => {
                        e.preventDefault()
                        const droppedId = e.dataTransfer.getData('text/plain')
                        if (droppedId) {
                          handleDropToCell(droppedId, date.toISOString().split('T')[0], hour)
                        }
                        setActiveDropCell(null)
                        setDraggingId(null)
                      }}
                    >
                      {dayReservations.map(({ customer, timeInfo }) => {
                        const isDraggingThis = draggingId === customer.id
                        return (
                          <div 
                            id={`card-${customer.id}`}
                            key={customer.id} 
                            className={`reservation-card ${isDraggingThis ? 'dragging' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(customer, timeInfo);
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              handleTouchStart(e, customer.id, timeInfo.date, timeInfo.hour);
                            }}
                            onTouchMove={(e) => {
                              e.stopPropagation();
                              handleTouchMove(e);
                            }}
                            onTouchEnd={(e) => {
                              e.stopPropagation();
                              handleTouchEnd(e);
                            }}
                            onTouchCancel={(e) => {
                              e.stopPropagation();
                              handleTouchEnd(e);
                            }}
                            draggable={true}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDraggingId(customer.id);
                              e.dataTransfer.setData('text/plain', customer.id);
                            }}
                            onDragEnd={() => {
                              setDraggingId(null);
                              setActiveDropCell(null);
                            }}
                          >
                            <div className="res-inline-info">
                              <span className="res-name">{customer.고객명_상호}</span>
                              <span className="res-time-pill">
                                {timeInfo.hour.toString().padStart(2, '0')}:{timeInfo.minute.toString().padStart(2, '0')}
                              </span>
                            </div>
                          </div>
                        )
                      })}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="customer-title">{selectedCustomer.고객명_상호}</span>
                    <button 
                      onClick={() => {
                        setIsModalOpen(false)
                        router.push(`/detail/${selectedCustomer.id}`)
                      }}
                      style={{
                        padding: '4px 8px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <ExternalLink size={10} />
                      상세보기
                    </button>
                  </div>
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
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a href={`tel:${String(selectedCustomer.전화번호).replace(/[^0-9]/g, '')}`} className="action-circle-btn phone">
                          <Phone size={14} />
                        </a>
                        <a href={`sms:${String(selectedCustomer.전화번호).replace(/[^0-9]/g, '')}`} className="action-circle-btn sms">
                          <MessageCircle size={14} />
                        </a>
                        <button 
                          onClick={() => {
                            addToSmsQueue(selectedCustomer.고객명_상호, selectedCustomer.전화번호 || '');
                            alert('문자 전송 목록에 추가되었습니다.');
                          }}
                          className="action-circle-btn queue"
                          title="단체 문자 목록에 추가"
                        >
                          <ListPlus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {(selectedCustomer.설치주소 || selectedCustomer.주소) && (
                  <div className="info-detail-item">
                    <label>주소</label>
                    <div className="row-action">
                      <span className="address-text">{selectedCustomer.설치주소 || selectedCustomer.주소}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="action-circle-btn map" onClick={() => handleOpenMap(selectedCustomer.설치주소 || selectedCustomer.주소)}>
                          <MapPin size={14} />
                        </button>
                        <button className="action-circle-btn copy-btn" onClick={() => handleCopyAddress(selectedCustomer.설치주소 || selectedCustomer.주소)}>
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {selectedCustomer.설치시특이사항 && (
                  <div className="info-detail-item">
                    <label>특이사항</label>
                    <div className="memo-box">{selectedCustomer.설치시특이사항}</div>
                  </div>
                )}
                {!loadingExtra && (
                  <div className="info-detail-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ marginBottom: 0 }}>현장 메모</label>
                      <button 
                        onClick={handleSaveMemo}
                        style={{ fontSize: '0.7rem', padding: '3px 8px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', cursor: 'pointer', color: '#b45309', fontWeight: 600 }}
                      >
                        메모 저장
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea 
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="현장 메모를 입력하세요"
                        style={{ width: '100%', minHeight: '80px', padding: '12px', border: '1px solid #fde68a', borderRadius: '8px', background: '#fffbeb', resize: 'vertical', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                )}
                {!loadingExtra && (
                  <div className="info-detail-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ marginBottom: 0 }}>방문 기록 ({visitLogs.length}건)</label>
                      <button 
                        onClick={() => setIsVisitLogModalOpen(true)}
                        style={{ fontSize: '0.7rem', padding: '3px 8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#475569', fontWeight: 600 }}
                      >
                        기록 관리
                      </button>
                    </div>
                    {visitLogs.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {visitLogs.slice(0, 3).map(log => (
                          <div key={log.id} style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '2px' }}>{log.visit_date}</div>
                            <div style={{ color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{log.content}</div>
                          </div>
                        ))}
                        {visitLogs.length > 3 && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '4px' }}>
                            + 외 {visitLogs.length - 3}건 (상세보기에서 확인)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '10px 0', background: '#f8fafc', borderRadius: '6px' }}>등록된 방문 기록이 없습니다.</div>
                    )}
                  </div>
                )}
              </div>

              {/* 예약 시간 편집 - 커스텀 피커 */}
              <div className="edit-section">
                <div className="section-title"><Clock size={16} /> 예약 일정 편집</div>
                {/* 날짜 선택 */}
                <input 
                  type="date" max="9999-12-31" 
                  className="datetime-input"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                {/* 시간 선택: 오전 8시 ~ 오후 8시, 00/30분만 */}
                <select
                  className="datetime-input time-select"
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

            <div className="modal-footer">
              <a 
                href={getGoogleCalendarUrl(selectedCustomer)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="google-cal-btn"
              >
                <ExternalLink size={16} />
                캘린더 등록
              </a>
              
              <button className="complete-work-btn" onClick={handleSetComplete}>
                <CheckCircle2 size={16} />
                작업완료
              </button>

              <button className="save-btn" onClick={handleSaveDateTime}>
                <Save size={16} />
                일정저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모바일 드래그 고스트 (시각적 피드백) */}
      {isLongPressed && draggingId && dragTouch && (
        <div 
          style={{
            position: 'fixed',
            left: dragTouch.x,
            top: dragTouch.y,
            pointerEvents: 'none',
            zIndex: 99999,
            background: '#ffffff',
            border: '2px solid #3b82f6',
            padding: '8px 12px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.5)',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            color: '#1e293b',
            opacity: 0.95,
            transform: 'translate(-50%, -50%) scale(1.05)',
            whiteSpace: 'nowrap',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'center'
          }}
        >
          {customers.find(c => c.id === draggingId)?.고객명_상호}
        </div>
      )}

      {selectedCustomer && (
        <VisitLogModal 
          customerId={selectedCustomer.id}
          isOpen={isVisitLogModalOpen}
          onClose={() => {
            setIsVisitLogModalOpen(false)
            loadExtraInfo(selectedCustomer.id)
          }}
        />
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
          padding: 4px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          background: #fff;
          min-height: 80px;
          transition: background 0.15s, border 0.15s;
        }
        .grid-cell.drag-over {
          background: #f0fdf4 !important;
          border: 2px dashed #10b981 !important;
        }
        
        /* 예약 카드 (1줄 컴팩트 레이아웃) */
        .reservation-card {
          background: #eff6ff;
          border-left: 3px solid #3b82f6;
          border-radius: 6px;
          padding: 4px 6px;
          cursor: grab;
          transition: all 0.2s;
          min-height: 28px;
          display: flex;
          align-items: center;
          user-select: none;
        }
        .reservation-card:active {
          cursor: grabbing;
        }
        .reservation-card:hover {
          background: #dbeafe;
        }
        .reservation-card.dragging {
          opacity: 0.65;
          transform: scale(1.05);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          border: 1px dashed #3b82f6;
          animation: cardShake 0.15s infinite alternate;
          z-index: 999;
        }
        @keyframes cardShake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          100% { transform: translate(-1px, -1px) rotate(-0.5deg); }
        }
        
        .res-inline-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 6px;
        }
        /* 모바일: 시간 뱃지 숨기고 이름만 한 줄 */
        @media (max-width: 640px) {
          .res-time-pill {
            display: none;
          }
          .res-name {
            font-size: 0.75rem;
          }
        }
        .res-name {
          font-size: 0.72rem;
          font-weight: 800;
          color: #1e40af;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .res-time-pill {
          font-size: 0.6rem;
          font-weight: 700;
          color: #2563eb;
          background: #dbeafe;
          padding: 1px 4px;
          border-radius: 4px;
          white-space: nowrap;
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
          justify-content: flex-start;
          gap: 10px;
        }
        .address-text {
          line-height: 1.4;
        }
        .action-circle-btn { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; text-decoration: none; transition: all 0.2s; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3); }
        .action-circle-btn.phone { background: #10b981; }
        .action-circle-btn.sms { background: #3b82f6; }
        .action-circle-btn.queue { background: #8b5cf6; border: none; }
        .action-circle-btn.map { background: #3b82f6; }
        .action-circle-btn.map {
          background: #eff6ff;
          color: #3b82f6;
          border-color: #dbeafe;
        }
        .action-circle-btn.copy-btn {
          background: #f1f5f9;
          color: #64748b;
          border-color: #e2e8f0;
        }
        .action-circle-btn.copy-btn:hover { background: #e2e8f0; }
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
          box-sizing: border-box;
          display: block;
        }
        .datetime-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .time-select {
          cursor: pointer;
          appearance: auto;
          font-family: inherit;
        }

        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .google-cal-btn, .save-btn, .complete-work-btn {
          flex: 1;
          min-width: 100px;
          padding: 12px;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .google-cal-btn {
          background: #eff6ff;
          color: #3b82f6;
          border: 1px solid #bfdbfe;
          text-decoration: none;
        }
        .google-cal-btn:hover {
          background: #dbeafe;
          transform: translateY(-1px);
        }
        .google-cal-btn:active {
          transform: translateY(0);
        }
        .complete-work-btn {
          background: #ecfdf5;
          color: #10b981;
          border: 1px solid #a7f3d0;
        }
        .complete-work-btn:hover {
          background: #d1fae5;
          transform: translateY(-1px);
        }
        .complete-work-btn:active {
          transform: translateY(0);
        }
        .save-btn {
          background: #f8fafc;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .save-btn:hover {
          background: #f1f5f9;
          transform: translateY(-1px);
        }
        .save-btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  )
}
