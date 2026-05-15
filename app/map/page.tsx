'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useData, CustomerData } from '@/lib/DataContext'
import { ChevronLeft, ChevronRight, X, Phone, MapPin, ExternalLink, FolderPlus, Trash2, Map as MapIcon, LocateFixed } from 'lucide-react'
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk'
import Script from 'next/script'

export default function MapPage() {
  const { customers, setCustomers, selectedIds } = useData()
  const router = useRouter()
  const [selectedCustomersList, setSelectedCustomersList] = useState<CustomerData[]>([])
  const [markers, setMarkers] = useState<{ id: string; lat: number; lng: number; customer: CustomerData }[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('선택된 항목')
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        setIsMapReady(true)
      })
    }
  }, [])

  const folders = useMemo(() => {
    const statuses = Array.from(new Set(customers.map(c => c.status))).filter(s => s !== '삭제됨')
    return ['선택된 항목', '전체리스트', ...statuses]
  }, [customers])

  const displayCustomers = useMemo(() => {
    if (selectedFolder === '선택된 항목') {
      return customers.filter(c => selectedIds.includes(c.id))
    }
    if (selectedFolder === '전체리스트') {
      return customers.filter(c => c.status !== '삭제됨')
    }
    return customers.filter(c => c.status === selectedFolder)
  }, [customers, selectedIds, selectedFolder])

  useEffect(() => {
    if (isMapReady && window.kakao && window.kakao.maps.services) {
      const geocoder = new window.kakao.maps.services.Geocoder()
      const newMarkers: any[] = []
      let processedCount = 0
      if (displayCustomers.length === 0) { setMarkers([]); return; }
      displayCustomers.forEach((customer) => {
        const address = customer.설치주소 || customer.주소
        if (!address) {
          processedCount++; if (processedCount === displayCustomers.length) setMarkers(newMarkers);
          return
        }
        geocoder.addressSearch(address, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            newMarkers.push({ id: customer.id, lat: parseFloat(result[0].y), lng: parseFloat(result[0].x), customer: customer })
          }
          processedCount++; if (processedCount === displayCustomers.length) setMarkers(newMarkers);
        })
      })
    }
  }, [isMapReady, displayCustomers])

  const toggleCustomerSelection = (customer: CustomerData) => {
    setSelectedCustomersList(prev => {
      const isExist = prev.find(c => c.id === customer.id)
      return isExist ? prev.filter(c => c.id !== customer.id) : [...prev, customer]
    })
  }

  const isSelected = (id: string) => selectedCustomersList.some(c => c.id === id)

  const getMarkerColor = (status: string) => {
    switch(status) {
      case '작업완료': return '#10b981';
      case '예약완료': return '#94a3b8';
      case '작업미완료': return '#64748b';
      case '삭제됨': return '#ff4d4f';
      default: return '#cbd5e1';
    }
  }

  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedCustomersList.length === 0) return
    const msg = newStatus === '삭제됨' ? '삭제하시겠습니까?' : `'${newStatus}' 상태로 변경하시겠습니까?`
    if (confirm(msg)) {
      const selectedListIds = selectedCustomersList.map(c => c.id)
      const updated = customers.map(c => selectedListIds.includes(c.id) ? { ...c, status: newStatus } : c)
      setCustomers(updated as any); setSelectedCustomersList([]);
    }
  }

  const handleCreateFolder = () => {
    const folderName = prompt('새로운 폴더 이름을 입력해 주세요.')
    if (!folderName || folderName.trim() === '') return
    const selectedListIds = selectedCustomersList.map(c => c.id)
    const updated = customers.map(c => selectedListIds.includes(c.id) ? { ...c, status: folderName.trim() } : c)
    setCustomers(updated as any); setSelectedCustomersList([]);
  }

  const center = markers.length > 0 ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: 37.566826, lng: 126.9786567 }

  return (
    <div className="map-page">
      <Script 
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || 'bcf159529047078b426216b892689408'}&libraries=services&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => {
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(() => {
              setIsMapReady(true)
            })
          }
        }}
      />
      <div className="view-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <div className="header-text">
          <h1>지도 관리</h1>
          <p>고객 위치 확인 및 경로 탐색</p>
        </div>
      </div>

      <div className="map-area">
        {!isMapReady ? <div className="loading-map">지도를 불러오는 중...</div> : (
          <Map center={center} style={{ width: "100%", height: "100%" }} level={4}>
            {/* 현위치 버튼 */}
            <div className="map-controls">
              <button className="ctrl-btn" onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    alert('현재 위치로 지도를 이동합니다.')
                    // 실제 이동 로직은 state center 업데이트 필요
                  })
                }
              }} title="현위치">
                <LocateFixed size={20} />
              </button>
            </div>
            {markers.map((marker) => (
              <CustomOverlayMap key={marker.id} position={{ lat: marker.lat, lng: marker.lng }} zIndex={isSelected(marker.id) ? 10 : 1}>
                <div className={`marker-wrapper ${isSelected(marker.id) ? 'active' : ''}`} onClick={() => toggleCustomerSelection(marker.customer)} style={{ '--m-color': getMarkerColor(marker.customer.status) } as any}>
                  <div className="marker-pin"><div className="marker-core"></div></div>
                  {isSelected(marker.id) && <div className="marker-tooltip">{marker.customer.고객명_상호}</div>}
                </div>
              </CustomOverlayMap>
            ))}
          </Map>
        )}
      </div>

      <div className="list-area shadow-lg">
        <div className="list-header flex-between">
          <span className="list-title">지도에서 선택됨 <strong>{selectedCustomersList.length}</strong></span>
          <div className="list-header-right">
            <select 
              className="folder-select-mini" 
              value={selectedFolder} 
              onChange={(e) => { setSelectedFolder(e.target.value); setSelectedCustomersList([]); }}
            >
              {folders.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            {selectedCustomersList.length > 0 && <button className="reset-btn" onClick={() => setSelectedCustomersList([])}>해제</button>}
          </div>
        </div>
        <div className="list-scroll-view">
          {selectedCustomersList.length === 0 ? <div className="empty-guide"><MapPin size={24} color="#ddd" /><p>핀을 클릭하여 고객을 선택하세요.</p></div> : (
            <div className="vertical-list">
              {selectedCustomersList.map((customer) => (
                <div key={customer.id} className="customer-row shadow-sm">
                  <div className="row-main">
                    <div className="row-badge" style={{ background: getMarkerColor(customer.status) }}>{customer.status}</div>
                    <h4 className="row-name">{customer.고객명_상호}</h4>
                    <p className="row-addr">{customer.전화번호} | {customer.설치주소 || customer.주소}</p>
                  </div>
                  <button className="row-detail-btn" onClick={() => router.push(`/detail/${customer.id}`)}>상세 <ChevronRight size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedCustomersList.length > 0 && (
        <div className="floating-bar animated-up shadow-lg">
          <div className="selection-info"><span className="count">{selectedCustomersList.length}</span>명</div>
          <div className="action-buttons">
            <button className="action-btn folder-btn" onClick={handleCreateFolder}><FolderPlus size={18} /> 폴더</button>
            <div className="divider"></div>
            <button className="action-btn status-btn" onClick={() => handleBulkStatusChange('작업미완료')}>미완료</button>
            <button className="action-btn status-btn reserved" onClick={() => handleBulkStatusChange('예약완료')}>예약</button>
            <button className="action-btn status-btn complete" onClick={() => handleBulkStatusChange('작업완료')}>완료</button>
            <div className="divider"></div>
            <button className="action-btn delete-btn" onClick={() => handleBulkStatusChange('삭제됨')}><Trash2 size={18} /> 삭제</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .map-page { height: 100vh; display: flex; flex-direction: column; background: #fff; overflow: hidden; }
        .view-header { height: 80px; display: flex; align-items: center; padding: 0 20px; border-bottom: 1px solid #f1f5f9; background: #fff; z-index: 100; flex-shrink: 0; }
        .back-btn { background: none; border: none; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #334155; }
        .header-text { margin-left: 12px; }
        .header-text h1 { font-size: 1.15rem; font-weight: 800; margin: 0; color: #1e293b; }
        .header-text p { font-size: 0.75rem; color: #94a3b8; margin: 0; font-weight: 500; }
        .map-area { flex: 1; position: relative; background: #f0f0f0; overflow: hidden; }
        .map-controls { position: absolute; bottom: 20px; right: 20px; z-index: 10; display: flex; flex-direction: column; gap: 10px; }
        .ctrl-btn { width: 44px; height: 44px; background: #fff; border: none; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; color: #334155; transition: all 0.2s; }
        .ctrl-btn:active { transform: scale(0.9); }
        .loading-map { height: 100%; display: flex; align-items: center; justify-content: center; color: #999; }
        .marker-wrapper { display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translateY(-50%); }
        .marker-pin { width: 24px; height: 24px; background: var(--m-color); border: 2px solid #fff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
        .marker-core { width: 8px; height: 8px; background: #fff; border-radius: 50%; }
        .marker-wrapper.active .marker-pin { width: 32px; height: 32px; border-width: 3px; background: #3b82f6 !important; box-shadow: 0 0 0 4px rgba(255,255,255,0.4), 0 4px 10px rgba(0,0,0,0.4); }
        .marker-tooltip { position: absolute; top: -35px; background: #334155; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
        .list-area { height: 280px; background: #fff; border-top: 1px solid #eee; display: flex; flex-direction: column; flex-shrink: 0; z-index: 100; padding-bottom: 40px; }
        .list-header { padding: 15px 15px 10px; }
        .list-header-right { display: flex; align-items: center; gap: 8px; }
        .folder-select-mini { padding: 4px 8px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.8rem; font-weight: 700; color: #333; outline: none; background: #f8fafc; max-width: 120px; }
        .list-title { font-size: 0.85rem; font-weight: 700; color: #333; white-space: nowrap; }
        .list-title strong { color: var(--accent-blue); margin-left: 4px; }
        .reset-btn { font-size: 0.75rem; color: #999; background: none; border: none; cursor: pointer; white-space: nowrap; }
        .list-scroll-view { flex: 1; padding: 0 15px 15px; overflow-y: auto; }
        .empty-guide { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #bbb; font-size: 0.85rem; gap: 10px; }
        .vertical-list { display: flex; flex-direction: column; gap: 10px; padding-top: 5px; }
        .customer-row { background: #f8fafc; border-radius: 14px; padding: 12px 15px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .row-main { flex: 1; min-width: 0; }
        .row-badge { display: inline-block; font-size: 0.6rem; color: #fff; padding: 1px 6px; border-radius: 4px; font-weight: 700; margin-bottom: 4px; }
        .row-name { font-size: 0.95rem; font-weight: 800; margin: 0; color: #1e293b; }
        .row-addr { font-size: 0.75rem; color: #64748b; margin: 2px 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .row-detail-btn { background: #fff; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: #475569; display: flex; align-items: center; gap: 3px; flex-shrink: 0; }
        
        .floating-bar { position: fixed; bottom: 85px; left: 5px; right: 5px; background: #2c3e50; color: #fff; padding: 12px 10px; border-radius: 20px; display: flex; align-items: center; justify-content: space-between; z-index: 1000; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .selection-info { font-size: 0.75rem; white-space: nowrap; padding-left: 5px; }
        .selection-info .count { font-weight: 800; color: #3498db; margin-right: 2px; }
        .action-buttons { display: flex; align-items: center; gap: 8px; }
        .action-btn { background: transparent; color: #fff; border: none; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 3px; cursor: pointer; white-space: nowrap; }
        .action-btn.folder-btn { color: #f1c40f; }
        .action-btn.reserved { color: #a5b4fc; }
        .action-btn.complete { color: #2ecc71; }
        .action-btn.delete-btn { color: #ff4d4f; }
        .divider { width: 1px; height: 14px; background: rgba(255,255,255,0.2); }
        
        .flex-between { display: flex; align-items: center; justify-content: space-between; }
        .shadow-lg { box-shadow: 0 -10px 25px rgba(0,0,0,0.05); }
        .animated-up { animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  )
}
