'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useData, CustomerData } from '@/lib/DataContext'
import { ChevronLeft, X, Phone, MapPin, ExternalLink, FolderPlus, Trash2, Map as MapIcon } from 'lucide-react'
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk'

export default function MapPage() {
  const { customers, setCustomers, selectedIds } = useData()
  const router = useRouter()
  const [selectedCustomersList, setSelectedCustomersList] = useState<CustomerData[]>([])
  const [markers, setMarkers] = useState<{ id: string; lat: number; lng: number; customer: CustomerData }[]>([])
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)

  const selectedCustomers = useMemo(() => customers.filter(c => selectedIds.includes(c.id)), [customers, selectedIds])

  useEffect(() => {
    const checkKakao = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => setIsMapReady(true))
        return true
      }
      return false
    }
    if (!checkKakao()) {
      const interval = setInterval(() => { if (checkKakao()) clearInterval(interval) }, 500)
      return () => clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (isMapReady && window.kakao && window.kakao.maps.services) {
      const geocoder = new window.kakao.maps.services.Geocoder()
      const newMarkers: any[] = []
      let processedCount = 0
      if (selectedCustomers.length === 0) { setMarkers([]); return; }
      selectedCustomers.forEach((customer) => {
        const address = customer.설치주소 || customer.주소
        if (!address) {
          processedCount++; if (processedCount === selectedCustomers.length) setMarkers(newMarkers);
          return
        }
        geocoder.addressSearch(address, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            newMarkers.push({ id: customer.id, lat: parseFloat(result[0].y), lng: parseFloat(result[0].x), customer: customer })
          }
          processedCount++; if (processedCount === selectedCustomers.length) setMarkers(newMarkers);
        })
      })
    }
  }, [isMapReady, selectedCustomers])

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
      case '예약완료': return '#4f46e5';
      case '작업미완료': return '#64748b';
      case '삭제됨': return '#ff4d4f';
      default: return '#f1c40f'; 
    }
  }

  // 일괄 상태 변경 (지도 리스트 대상)
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
    <div className="map-view-container">
      <div className="view-header">
        <button className="back-btn" onClick={() => router.back()}><ChevronLeft size={24} /></button>
        <div className="header-text"><h1>서비스 관리</h1><p>대상: {selectedCustomers.length}건</p></div>
      </div>

      <div className="map-area">
        {!isMapReady ? <div className="loading-map">지도를 불러오는 중...</div> : (
          <Map center={center} style={{ width: "100%", height: "100%" }} level={4}>
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
          {selectedCustomersList.length > 0 && <button className="reset-btn" onClick={() => setSelectedCustomersList([])}>전체 해제</button>}
        </div>
        <div className="list-scroll-view">
          {selectedCustomersList.length === 0 ? <div className="empty-guide"><MapPin size={24} color="#ddd" /><p>핀을 클릭하여 고객을 선택하세요.</p></div> : (
            <div className="horizontal-cards">
              {selectedCustomersList.map((customer) => (
                <div key={customer.id} className="customer-info-card shadow-sm">
                  <div className="card-badge" style={{ background: getMarkerColor(customer.status) }}>{customer.status}</div>
                  <h4 className="card-name">{customer.고객명_상호}</h4>
                  <div className="card-details">
                    <div className="row"><Phone size={12} /> <span>{customer.전화번호}</span></div>
                    <div className="row"><MapPin size={12} /> <span className="truncate">{customer.설치주소 || customer.주소}</span></div>
                  </div>
                  <button className="detail-link-btn" onClick={() => router.push(`/detail/${customer.id}`)}>상세 <ExternalLink size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar (Map Version) */}
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
        .map-view-container { height: 100vh; display: flex; flex-direction: column; background: #fff; overflow: hidden; }
        .view-header { height: 60px; display: flex; align-items: center; padding: 0 15px; border-bottom: 1px solid #eee; background: #fff; flex-shrink: 0; }
        .header-text { margin-left: 12px; }
        .header-text h1 { font-size: 1.1rem; font-weight: 800; margin: 0; color: #1a1a1a; }
        .header-text p { font-size: 0.75rem; color: #888; margin: 0; }
        .map-area { flex: 1; position: relative; background: #f0f0f0; overflow: hidden; }
        .loading-map { height: 100%; display: flex; align-items: center; justify-content: center; color: #999; }
        .marker-wrapper { display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translateY(-50%); }
        .marker-pin { width: 24px; height: 24px; background: var(--m-color); border: 2px solid #fff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
        .marker-core { width: 8px; height: 8px; background: #fff; border-radius: 50%; }
        .marker-wrapper.active .marker-pin { width: 32px; height: 32px; border-width: 3px; box-shadow: 0 0 0 4px rgba(255,255,255,0.4), 0 4px 10px rgba(0,0,0,0.4); }
        .marker-tooltip { position: absolute; top: -35px; background: #334155; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
        .list-area { height: 260px; background: #fff; border-top: 1px solid #eee; display: flex; flex-direction: column; flex-shrink: 0; z-index: 100; padding-bottom: 40px; }
        .list-header { padding: 15px 20px 10px; }
        .list-title { font-size: 0.95rem; font-weight: 700; color: #333; }
        .list-title strong { color: var(--primary-color); margin-left: 4px; }
        .reset-btn { font-size: 0.75rem; color: #999; text-decoration: underline; background: none; border: none; cursor: pointer; }
        .list-scroll-view { flex: 1; padding: 0 15px 15px; overflow: hidden; }
        .empty-guide { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #bbb; font-size: 0.85rem; gap: 10px; }
        .horizontal-cards { display: flex; gap: 12px; overflow-x: auto; height: 100%; padding: 5px 0; }
        .horizontal-cards::-webkit-scrollbar { height: 4px; }
        .horizontal-cards::-webkit-scrollbar-thumb { background: #eee; border-radius: 2px; }
        .customer-info-card { min-width: 240px; max-width: 240px; background: #f8fafc; border-radius: 16px; padding: 15px; position: relative; display: flex; flex-direction: column; border: 1px solid #e2e8f0; }
        .card-badge { align-self: flex-start; font-size: 0.65rem; color: #fff; padding: 2px 8px; border-radius: 6px; font-weight: 700; margin-bottom: 8px; }
        .card-name { font-size: 1.05rem; font-weight: 800; margin: 0 0 10px 0; color: #1e293b; }
        .card-details { flex: 1; display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
        .row { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #64748b; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .detail-link-btn { width: 100%; background: #fff; border: 1px solid #e2e8f0; padding: 10px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; color: #475569; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
        
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
