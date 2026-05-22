'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useData } from '@/lib/DataContext'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronRight, Search, Undo2, ArrowUpDown, Calendar, Phone } from 'lucide-react'

export default function CompletedPage() {
  const { customers, changeCustomerStatus } = useData()
  const router = useRouter()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null) // null 이면 '전체'
  const [selectedMonth, setSelectedMonth] = useState<string>('all')

  useEffect(() => {
    const savedState = sessionStorage.getItem('completedPageState')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        setSelectedDateFilter(parsed.date)
        if (parsed.sortOrder) {
          setSortOrder(parsed.sortOrder)
        }
      } catch (e) {
        console.error('Failed to parse completedPageState', e)
      }
    }
  }, [])

  const handleChipClick = (e: React.MouseEvent, date: string | null) => {
    setSelectedDateFilter(date)
    const newSortOrder = date ? 'res-asc' : 'desc'
    setSortOrder(newSortOrder)
    sessionStorage.setItem('completedPageState', JSON.stringify({ date, sortOrder: newSortOrder }))
  }

  // 작업완료 데이터 필터링
  const completedCustomers = useMemo(() => {
    return customers.filter(c => c.status === '작업완료')
  }, [customers])

  // 날짜별 완료 통계 집계
  const dailyStats = useMemo(() => {
    const statsMap: { [date: string]: number } = {}
    completedCustomers.forEach(c => {
      const dateKey = c.작업완료일 || '날짜 미지정'
      statsMap[dateKey] = (statsMap[dateKey] || 0) + 1
    })

    return Object.keys(statsMap)
      .sort((a, b) => {
        if (a === '날짜 미지정') return 1
        if (b === '날짜 미지정') return -1
        return b.localeCompare(a)
      })
      .map(date => {
        let displayDate = date
        if (date !== '날짜 미지정') {
          const parts = date.split('-')
          if (parts.length === 3) {
            displayDate = `${parseInt(parts[1])}월 ${parseInt(parts[2])}일`
          }
        }
        return {
          rawDate: date,
          dateLabel: displayDate,
          count: statsMap[date]
        }
      })
  }, [completedCustomers])

  // 월 목록 추출 (YYYY-MM 형식)
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    completedCustomers.forEach(c => {
      if (c.작업완료일) {
        months.add(c.작업완료일.substring(0, 7))
      }
    })
    return Array.from(months).sort((a, b) => b.localeCompare(a))
  }, [completedCustomers])

  // 선택된 월에 해당하는 날짜 칩만 필터링
  const filteredDailyStats = useMemo(() => {
    return dailyStats.filter(stat => {
      if (selectedMonth === 'all') return true
      if (stat.rawDate === '날짜 미지정') return false // 전체보기가 아니면 날짜 미지정은 숨김
      return stat.rawDate.startsWith(selectedMonth)
    })
  }, [dailyStats, selectedMonth])

  // 월 필터 변경 시 일별 필터 초기화
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value)
    setSelectedDateFilter(null)
  }

  // 검색어 및 날짜 필터링 적용
  const filteredCustomers = useMemo(() => {
    let list = [...completedCustomers]

    // 1. 월 필터 적용
    if (selectedMonth !== 'all') {
      list = list.filter(c => {
        if (!c.작업완료일) return false
        return c.작업완료일.startsWith(selectedMonth)
      })
    }

    // 2. 날짜 칩 필터 적용 (월 필터 내에서 특정 날짜 선택 시)
    if (selectedDateFilter) {
      list = list.filter(c => {
        const dateKey = c.작업완료일 || '날짜 미지정'
        return dateKey === selectedDateFilter
      })
    }

    if (searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase()
      list = list.filter(c => 
        (c.고객명_상호 && c.고객명_상호.toLowerCase().includes(lowerTerm)) ||
        (c.전화번호 && c.전화번호.includes(lowerTerm)) ||
        (c.설치주소 && c.설치주소.toLowerCase().includes(lowerTerm)) ||
        (c.주소 && c.주소.toLowerCase().includes(lowerTerm)) ||
        (c.모델명 && c.모델명.toLowerCase().includes(lowerTerm))
      )
    }

    // 정렬 (작업완료일 기준 또는 예약시간 기준)
    return list.sort((a, b) => {
      if (sortOrder === 'res-asc' || sortOrder === 'res-desc') {
        const timeA = a.예약일자 || (sortOrder === 'res-asc' ? '9999-99-99' : '0000-00-00')
        const timeB = b.예약일자 || (sortOrder === 'res-asc' ? '9999-99-99' : '0000-00-00')
        if (timeA === timeB) {
          return (a.고객명_상호 || '').localeCompare(b.고객명_상호 || '')
        }
        return sortOrder === 'res-asc' ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA)
      }

      const dateA = a.작업완료일 || ''
      const dateB = b.작업완료일 || ''
      
      if (dateA === dateB) {
        return (a.고객명_상호 || '').localeCompare(b.고객명_상호 || '')
      }

      if (sortOrder === 'desc') {
        return dateB.localeCompare(dateA) // 최신 완료일이 위로
      } else {
        return dateA.localeCompare(dateB) // 오래된 완료일이 위로
      }
    })
  }, [completedCustomers, searchTerm, sortOrder, selectedDateFilter])

  // 완료 취소 처리 (작업미완료 상태로 환원)
  const handleUndoComplete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`'${name}' 고객의 작업 완료를 취소하고 작업 미완료 상태로 되돌리시겠습니까?`)) {
      await changeCustomerStatus([id], '작업미완료')
    }
  }

  const getModelTypeBadge = (modelName?: string) => {
    if (!modelName) return null
    const lower = modelName.toLowerCase()
    let text = ''
    let typeClass = ''
    if (lower.startsWith('cp')) {
      text = '정수기'
      typeClass = 'purifier'
    } else if (lower.startsWith('ac')) {
      text = '공기청정기'
      typeClass = 'air-cleaner'
    } else if (lower.startsWith('cbt')) {
      text = '비데'
      typeClass = 'bidet'
    } else {
      return null
    }

    return (
      <span className={`model-badge ${typeClass}`}>
        {text}
      </span>
    )
  }

  const getElapsedMonthsBadge = (contractDate?: string) => {
    if (!contractDate) return null
    const today = new Date()
    const parts = contractDate.split('-')
    if (parts.length < 3) return null
    const cYear = parseInt(parts[0])
    const cMonth = parseInt(parts[1]) - 1
    const cDay = parseInt(parts[2])
    const contract = new Date(cYear, cMonth, cDay)
    
    let months = (today.getFullYear() - contract.getFullYear()) * 12 + (today.getMonth() - contract.getMonth())
    if (today.getDate() < cDay) {
      months--
    }
    if (months < 0) return null
    
    return (
      <span className="model-badge elapsed-months">
        {months}개월
      </span>
    )
  }

  return (
    <div className="completed-page">
      <div className="view-header">
        <div className="header-text no-back">
          <h1>작업완료 목록</h1>
          <p>작업 완료 처리된 고객들을 모아서 확인합니다.</p>
        </div>
      </div>

      <div className="summary-section">
        {/* 일별 완료 통계 보드 */}
        <div className="stats-board">
          <div className="stats-board-header">
            <h4>일별 완료 현황</h4>
            <select 
              className="month-selector" 
              value={selectedMonth} 
              onChange={handleMonthChange}
            >
              <option value="all">모든 달 보기</option>
              {availableMonths.map(month => {
                const parts = month.split('-')
                return (
                  <option key={month} value={month}>
                    {parts[0]}년 {parseInt(parts[1])}월
                  </option>
                )
              })}
            </select>
          </div>
          <div className="stats-chips-container">
            <button 
              className={`stats-chip ${selectedDateFilter === null ? 'active' : ''}`}
              onClick={(e) => handleChipClick(e, null)}
            >
              <span className="stats-date">해당 월 전체</span>
              <span className="stats-count">
                {selectedMonth === 'all' 
                  ? completedCustomers.length 
                  : completedCustomers.filter(c => c.작업완료일?.startsWith(selectedMonth)).length}건
              </span>
            </button>
            
            {filteredDailyStats.map((stat) => (
              <button 
                key={stat.rawDate} 
                className={`stats-chip ${selectedDateFilter === stat.rawDate ? 'active' : ''}`}
                onClick={(e) => handleChipClick(e, stat.rawDate)}
              >
                <span className="stats-date">{stat.dateLabel}</span>
                <span className="stats-count">{stat.count}건</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="search-and-sort-section">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="이름, 전화번호, 주소, 모델명으로 검색" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="customer-list-section">
        <div className="flex-between list-title">
          <h3>
            {selectedDateFilter 
              ? (dailyStats.find(s => s.rawDate === selectedDateFilter)?.dateLabel || selectedDateFilter)
              : '전체'
            }
          </h3>
          <div className="list-title-actions">
            <div className="sort-box">
              <ArrowUpDown size={14} className="sort-icon" />
              <select 
                value={sortOrder} 
                onChange={(e) => {
                  const newSort = e.target.value
                  setSortOrder(newSort)
                  sessionStorage.setItem('completedPageState', JSON.stringify({ date: selectedDateFilter, sortOrder: newSort }))
                }}
                className="sort-select"
              >
                <option value="desc">최신순</option>
                <option value="asc">오래된순</option>
                <option value="res-asc">예약시간 빠른순</option>
                <option value="res-desc">예약시간 오래된순</option>
              </select>
            </div>
          </div>
        </div>

        <div className="status-customer-list">
          {filteredCustomers.length === 0 ? (
            <div className="empty-state">완료된 고객이 없습니다.</div>
          ) : (
            filteredCustomers.map((customer) => (
              <div 
                key={customer.id} 
                className="status-customer-item"
                onClick={() => router.push(`/detail/${customer.id}`)}
              >
                <div className="item-main">
                  <div className="item-title-row">
                    <span className="customer-name font-bold">{customer.고객명_상호}</span>
                    <div className="badge-group">
                      <span className="model-badge completed-date">
                        {customer.작업완료일 ? `${customer.작업완료일.substring(5)} 완료` : '완료'}
                      </span>
                      {getModelTypeBadge(customer.모델명)}
                      {getElapsedMonthsBadge(customer.계약일자)}
                    </div>
                  </div>
                  <p className="text-xs text-sub">{customer.전화번호} | {customer.설치주소 || customer.주소}</p>
                </div>
                <div className="item-actions">
                  <button 
                    className="undo-btn" 
                    onClick={(e) => handleUndoComplete(customer.id, customer.고객명_상호, e)}
                    title="완료 취소"
                  >
                    <Undo2 size={14} />
                    <span>취소</span>
                  </button>
                  <button className="go-detail-mini-btn" onClick={(e) => { e.stopPropagation(); router.push(`/detail/${customer.id}`); }}>
                    상세 <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .completed-page { padding: 0; padding-bottom: 100px; background: #f8fafc; min-height: 100%; }
        .view-header { height: 80px; display: flex; align-items: center; padding: 0 20px; border-bottom: 1px solid #f1f5f9; background: #fff; sticky; top: 0; z-index: 100; margin-bottom: 20px; }
        .header-text.no-back { margin-left: 52px; }
        .header-text h1 { font-size: 1.25rem; font-weight: 800; margin: 0; color: #1e293b; }
        .header-text p { font-size: 0.8rem; color: #94a3b8; margin: 0; font-weight: 500; }
        
        .summary-section { padding: 0 20px; margin-bottom: 20px; }
        .summary-card { background: #10b981; color: #fff; padding: 20px; border-radius: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2); }
        .summary-icon { width: 48px; height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .summary-label { font-size: 0.85rem; color: rgba(255, 255, 255, 0.8); display: block; }
        .summary-count { font-size: 1.5rem; font-weight: 800; }
        
        .stats-board { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 16px 20px; margin-top: 0px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .stats-board-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .stats-board h4 { margin: 0; font-size: 0.85rem; font-weight: 800; color: #475569; }
        
        .month-selector { 
          padding: 6px 10px; 
          border-radius: 8px; 
          border: 1px solid #e2e8f0; 
          background: #f8fafc; 
          font-size: 0.75rem; 
          font-weight: 700; 
          color: #334155; 
          outline: none; 
          cursor: pointer; 
        }
        
        .stats-chips-container { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 4px; user-select: none; }
        .stats-chip { background: #f8fafc; border: 1px solid #f1f5f9; padding: 6px 12px; border-radius: 10px; display: flex; align-items: center; gap: 6px; flex-shrink: 0; cursor: pointer; transition: all 0.2s; font-family: inherit; user-select: none; -webkit-user-drag: none; }
        .stats-chip:hover { border-color: #cbd5e1; background: #f1f5f9; }
        .stats-chip.active { background: #10b981; border-color: #10b981; }
        .stats-chip.active .stats-date { color: #fff; }
        .stats-chip.active .stats-count { color: #10b981; background: #fff; border-color: #fff; }
        .stats-date { font-size: 0.75rem; font-weight: 700; color: #64748b; }
        .stats-count { font-size: 0.75rem; font-weight: 800; color: #10b981; background: #ecfdf5; padding: 2px 6px; border-radius: 6px; border: 1px solid #a7f3d0; }
        .no-stats-text { font-size: 0.75rem; color: #94a3b8; }
        
        .search-and-sort-section { padding: 0 20px 10px 20px; display: flex; flex-direction: column; gap: 10px; }
        .search-box { display: flex; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 15px; }
        .search-icon { color: #94a3b8; margin-right: 10px; }
        .search-box input { flex: 1; border: none; outline: none; font-size: 0.9rem; color: #1e293b; background: transparent; }
        .search-box input::placeholder { color: #94a3b8; }
        
        .sort-box { display: flex; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 4px 8px; width: fit-content; }
        .sort-icon { color: #64748b; margin-right: 4px; }
        .sort-select { border: none; outline: none; font-size: 0.75rem; font-weight: 700; color: #475569; background: transparent; cursor: pointer; }

        .customer-list-section { padding: 0 20px; }
        .list-title { margin-bottom: 15px; align-items: center; }
        .list-title-actions { display: flex; align-items: center; gap: 8px; }
        .count-badge { background: #f0f0f0; padding: 4px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; }
        .status-customer-list { display: flex; flex-direction: column; gap: 10px; }
        .status-customer-item { background: #fff; padding: 18px 20px; border-radius: 18px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s; }
        .status-customer-item:hover { border-color: #cbd5e1; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
        .item-main { flex: 1; min-width: 0; }
        .item-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
        .customer-name { font-size: 0.95rem; color: #1e293b; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .badge-group { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .folder-badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; }
        .folder-badge.status-작업완료 { background: #ecfdf5; color: #10b981; border: 1px solid #a7f3d0; }
        :global(.model-badge.completed-date) { background: #ecfdf5; color: #10b981; border: 1px solid #a7f3d0; }
        
        :global(.model-badge) { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; }
        :global(.model-badge.purifier) { background: #eff6ff; color: #3b82f6; }
        :global(.model-badge.air-cleaner) { background: #ecfdf5; color: #10b981; }
        :global(.model-badge.bidet) { background: #fff7ed; color: #ea580c; }
        :global(.model-badge.elapsed-months) { background: #f1f5f9; color: #475569; }
        
        .item-main p { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .item-actions { display: flex; align-items: center; gap: 8px; }
        
        .undo-btn { display: flex; align-items: center; gap: 4px; padding: 8px 10px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; font-size: 0.75rem; font-weight: 700; color: #e11d48; transition: all 0.2s; }
        .undo-btn:hover { background: #ffe4e6; }
        .undo-btn:active { transform: scale(0.95); }
        
        .go-detail-mini-btn { padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.75rem; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 2px; }
        .empty-state { text-align: center; padding: 40px 0; color: #999; font-size: 0.9rem; }
        .font-bold { font-weight: 700; }
        .text-xs { font-size: 0.75rem; }
        .flex-between { display: flex; align-items: center; justify-content: space-between; }
      `}</style>
    </div>
  )
}
