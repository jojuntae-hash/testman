'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useData, CustomerData } from '@/lib/DataContext'
import { ChevronLeft, ChevronRight, X, Phone, MapPin, ExternalLink, FolderPlus, Trash2, Map as MapIcon, LocateFixed } from 'lucide-react'
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk'
import Script from 'next/script'

export default function MapPage() {
  const { customers, setCustomers, selectedIds, updateCustomerCoords } = useData()
  const router = useRouter()
  
  // 상태 관리
  const [selectedCustomersList, setSelectedCustomersList] = useState<CustomerData[]>([])
  const [markers, setMarkers] = useState<{ id: string; lat: number; lng: number; customer: CustomerData }[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('선택된 항목')
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapDefaultZoom, setMapDefaultZoom] = useState(4)
  const [mapShowNames, setMapShowNames] = useState(false)
  const [kakaoKey, setKakaoKey] = useState('bcf159529047078b426216b892689408') // 기본 키로 초기화
  const [isExpanded, setIsExpanded] = useState(false)

  // 초기 설정 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedZoom = localStorage.getItem('map_default_zoom')
      if (savedZoom) setMapDefaultZoom(parseInt(savedZoom, 10))
      
      setMapShowNames(localStorage.getItem('map_show_names') === 'true')
      
      const savedKey = localStorage.getItem('kakao_app_key')
      if (savedKey) setKakaoKey(savedKey)
    }
  }, [])

  // 카카오맵 SDK 로드 확인 로직
  const prepareMap = () => {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        setIsMapReady(true)
      })
    }
  }

  // 스크립트가 이미 로드되어 있는 경우를 위해 실행
  useEffect(() => {
    prepareMap()
  }, [kakaoKey])

  const folders = useMemo(() => {
    const statuses = Array.from(new Set(customers.map(c => c.status))).filter(s => s !== '삭제됨')
    return ['선택된 항목', '전체리스트', ...statuses]
  }, [customers])

  const displayCustomers = useMemo(() => {
    if (selectedFolder === '선택된 항목') return customers.filter(c => selectedIds.includes(c.id))
    if (selectedFolder === '전체리스트') return customers.filter(c => c.status !== '삭제됨')
    return customers.filter(c => c.status === selectedFolder)
  }, [customers, selectedIds, selectedFolder])

  // 주소를 좌표로 변환
  useEffect(() => {
    if (isMapReady && window.kakao && window.kakao.maps.services) {
      const geocoder = new window.kakao.maps.services.Geocoder()
      const newMarkers: any[] = []
      let processedCount = 0
      
      if (displayCustomers.length === 0) {
        setMarkers([])
        return
      }

      displayCustomers.forEach((customer) => {
        const address = customer.설치주소 || customer.주소
        if (customer.lat && customer.lng) {
          newMarkers.push({
            id: customer.id,
            lat: customer.lat,
            lng: customer.lng,
            customer
          })
          processedCount++
          if (processedCount === displayCustomers.length) setMarkers(newMarkers)
          return
        }

        geocoder.addressSearch(address, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const lat = parseFloat(result[0].y)
            const lng = parseFloat(result[0].x)
            newMarkers.push({
              id: customer.id,
              lat,
              lng,
              customer
            })
            // 좌표 캐싱
            updateCustomerCoords(customer.id, lat, lng)
          }
          processedCount++
          if (processedCount === displayCustomers.length) {
            setMarkers(newMarkers)
          }
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
      case '예약완료': return '#3b82f6';
      case '작업미완료': return '#64748b';
      default: return '#cbd5e1';
    }
  }

  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedCustomersList.length === 0) return
    const msg = newStatus === '삭제됨' ? '선택한 고객을 삭제하시겠습니까?' : '상태를 변경하시겠습니까?'
    if (confirm(msg)) {
      const selectedListIds = selectedCustomersList.map(c => c.id)
      const updated = customers.map(c => selectedListIds.includes(c.id) ? { ...c, status: newStatus } : c)
      setCustomers(updated as any)
      setSelectedCustomersList([])
    }
  }

  const handleCreateFolder = () => {
    if (selectedCustomersList.length === 0) return
    const folderName = prompt('새로운 폴더 이름을 입력해 주세요.')
    if (!folderName || folderName.trim() === '') return
    const selectedListIds = selectedCustomersList.map(c => c.id)
    const updated = customers.map(c => selectedListIds.includes(c.id) ? { ...c, status: folderName.trim() } : c)
    setCustomers(updated as any)
    setSelectedCustomersList([])
  }

  const center = markers.length > 0 ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: 37.5665, lng: 126.9780 }

  return (
    <div className="map-page">
      <Script 
        id="kakao-map-sdk"
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=services&autoload=false`}
        strategy="afterInteractive"
        onLoad={prepareMap}
      />
      <div className="view-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <div className="header-text">
          <h1>지도 관리</h1>
          <p>고객 위치 확인 및 관리</p>
        </div>
      </div>

      <div className="map-area">
        {!isMapReady ? (
          <div className="loading-map">
            <div className="loading-spinner"></div>
            <p>지도를 불러오는 중...</p>
          </div>
        ) : (
          <Map center={center} style={{ width: "100%", height: "100%" }} level={mapDefaultZoom}>
            {markers.map((marker) => (
              <CustomOverlayMap key={marker.id} position={{ lat: marker.lat, lng: marker.lng }}>
                <div 
                  className={`marker-wrapper ${isSelected(marker.id) ? 'active' : ''}`} 
                  onClick={() => toggleCustomerSelection(marker.customer)} 
                  style={{ '--m-color': getMarkerColor(marker.customer.status) } as any}
                >
                  <div className="marker-pin"><div className="marker-core"></div></div>
                  {(isSelected(marker.id) || mapShowNames) && <div className="marker-tooltip">{marker.customer.고객명_상호}</div>}
                </div>
              </CustomOverlayMap>
            ))}
          </Map>
        )}
      </div>

      <div className={`list-area shadow-lg ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="drag-handle-area" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="drag-handle"></div>
          <span className="drag-text">{isExpanded ? '지도 보기' : '리스트 보기'}</span>
        </div>
        <div className="list-header">
          <span className="list-title">선택됨 <strong>{selectedCustomersList.length}</strong></span>
          <div className="list-controls">
            {selectedCustomersList.length > 0 ? (
              <div className="header-actions">
                <button className="act-btn-mini folder" onClick={handleCreateFolder}>폴더</button>
                <button className="act-btn-mini" onClick={() => handleBulkStatusChange('작업미완료')}>미완료</button>
                <button className="act-btn-mini reserved" onClick={() => handleBulkStatusChange('예약완료')}>예약</button>
                <button className="act-btn-mini complete" onClick={() => handleBulkStatusChange('작업완료')}>완료</button>
                <button className="act-btn-mini danger" onClick={() => handleBulkStatusChange('삭제됨')}>삭제</button>
              </div>
            ) : (
              <select 
                className="folder-select-mini" 
                value={selectedFolder} 
                onChange={(e) => { setSelectedFolder(e.target.value); setSelectedCustomersList([]); }}
              >
                {folders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
            {displayCustomers.length > 0 && (
              <button 
                className="select-all-btn" 
                onClick={() => setSelectedCustomersList(selectedCustomersList.length === displayCustomers.length ? [] : [...displayCustomers])}
              >
                {selectedCustomersList.length === displayCustomers.length ? '전체해제' : '전체선택'}
              </button>
            )}
          </div>
        </div>
        <div className="list-scroll">
          {selectedCustomersList.length === 0 ? (
            <div className="empty-guide">
              <MapPin size={24} color="#ddd" />
              <p>핀을 클릭하여 고객을 선택하세요.</p>
            </div>
          ) : (
            <div className="vertical-list">
              {selectedCustomersList.map((customer) => (
                <div key={customer.id} className="customer-row">
                  <div className="row-info">
                    <div className="row-badge" style={{ background: getMarkerColor(customer.status) }}>{customer.status}</div>
                    <div className="row-name">{customer.고객명_상호}</div>
                    <div className="row-addr">{customer.설치주소 || customer.주소}</div>
                  </div>
                  <button className="detail-btn" onClick={() => router.push(`/detail/${customer.id}`)}>상세</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>



      <style jsx>{`
        .map-page { height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
        .view-header { height: 70px; display: flex; align-items: center; padding: 0 15px; border-bottom: 1px solid #eee; background: #fff; z-index: 100; }
        .back-btn { background: none; border: none; cursor: pointer; color: #333; padding: 5px; }
        .header-text { margin-left: 10px; }
        .header-text h1 { font-size: 1.1rem; font-weight: 800; margin: 0; color: #1a1a1a; }
        .header-text p { font-size: 0.7rem; color: #999; margin: 0; }
        
        .map-area { flex: 1; position: relative; background: #f8f9fa; }
        .loading-map { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999; gap: 10px; }
        .loading-spinner { width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .marker-wrapper { display: flex; flex-direction: column; align-items: center; transform: translateY(-50%); cursor: pointer; position: relative; }
        .marker-pin { width: 24px; height: 24px; background: var(--m-color); border: 2px solid #fff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .marker-core { width: 8px; height: 8px; background: #fff; border-radius: 50%; }
        .marker-wrapper.active .marker-pin { background: #3b82f6 !important; transform: rotate(-45deg) scale(1.2); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .marker-tooltip { position: absolute; top: -35px; background: #333; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; white-space: nowrap; font-weight: 600; z-index: 10; }
        
        .list-area { 
          position: absolute; bottom: 0; left: 0; right: 0; background: #fff; 
          border-radius: 24px 24px 0 0; z-index: 1000; padding: 0 0 20px; 
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
          max-height: calc(100% - 100px); display: flex; flex-direction: column; 
          box-shadow: 0 -4px 12px rgba(0,0,0,0.05); 
        }
        .list-area.collapsed { transform: translateY(calc(100% - 130px)); }
        
        .drag-handle-area { padding: 10px 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .drag-handle { width: 40px; height: 4px; background: #e2e8f0; border-radius: 2px; }
        .drag-text { font-size: 0.7rem; color: #94a3b8; font-weight: 700; }
        .list-header { padding: 12px 15px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f5f5f5; }
        .list-title { font-size: 0.85rem; font-weight: 700; color: #333; }
        .list-title strong { color: #3b82f6; margin-left: 4px; }
        .list-controls { display: flex; align-items: center; gap: 10px; }
        .folder-select-mini { padding: 4px 8px; border-radius: 8px; border: 1px solid #ddd; font-size: 0.8rem; outline: none; background: #f8f9fa; }
        .select-all-btn { font-size: 0.75rem; color: #3b82f6; background: #f0f7ff; border: 1px solid #dbeafe; padding: 4px 10px; border-radius: 6px; font-weight: 700; }
        
        .list-scroll { flex: 1; overflow-y: auto; padding: 10px 15px; }
        .empty-guide { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ccc; font-size: 0.8rem; gap: 8px; }
        .customer-row { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #f8fafc; border-radius: 12px; margin-bottom: 8px; border: 1px solid #f1f5f9; }
        .row-info { flex: 1; min-width: 0; }
        .row-badge { display: inline-block; font-size: 0.6rem; color: #fff; padding: 1px 6px; border-radius: 4px; font-weight: 700; margin-bottom: 4px; }
        .row-name { font-size: 0.95rem; font-weight: 700; color: #1a1a1a; }
        .row-addr { font-size: 0.75rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
        .detail-btn { font-size: 0.75rem; padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; color: #666; font-weight: 600; }
        
        .header-actions { display: flex; gap: 6px; }
        .act-btn-mini { background: #f1f5f9; color: #475569; border: none; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .act-btn-mini:active { transform: scale(0.95); }
        .act-btn-mini.folder { background: #fef3c7; color: #92400e; }
        .act-btn-mini.reserved { background: #eef2ff; color: #3730a3; }
        .act-btn-mini.complete { background: #d1fae5; color: #065f46; }
        .act-btn-mini.danger { background: #fee2e2; color: #991b1b; }
      `}</style>
    </div>
  )
}
