'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useData, CustomerData } from '@/lib/DataContext'
import { ChevronLeft, Phone, User, Hash, MapPin } from 'lucide-react'
import { Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk'

export default function MapPage() {
  const { customers, selectedIds } = useData()
  const router = useRouter()
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null)
  const [markers, setMarkers] = useState<{ id: string; lat: number; lng: number; customer: CustomerData }[]>([])

  const selectedCustomers = useMemo(() => customers.filter(c => selectedIds.includes(c.id)), [customers, selectedIds])

  const [loading, error] = useKakaoLoader({
    appkey: "bcf159529047078b426216b892689408",
    libraries: ["services"],
  })

  useEffect(() => {
    if (!loading && window.kakao && window.kakao.maps.services) {
      const geocoder = new window.kakao.maps.services.Geocoder()
      const newMarkers: any[] = []
      let processedCount = 0

      if (selectedCustomers.length === 0) {
        setMarkers([])
        return
      }

      selectedCustomers.forEach((customer) => {
        const address = customer.설치주소 || customer.주소
        if (!address) {
          processedCount++
          if (processedCount === selectedCustomers.length) {
            setMarkers(newMarkers)
          }
          return
        }

        geocoder.addressSearch(address, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            newMarkers.push({
              id: customer.id,
              lat: parseFloat(result[0].y),
              lng: parseFloat(result[0].x),
              customer: customer
            })
          }
          processedCount++
          if (processedCount === selectedCustomers.length) {
            setMarkers(newMarkers)
          }
        })
      })
    }
  }, [loading, selectedCustomers])

  if (loading) {
    return (
      <div className="map-placeholder">
        <div className="spinner"></div>
        <p>카카오 지도를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="map-placeholder">
        <p>지도를 불러오는 데 실패했습니다.</p>
        <p className="text-xs text-sub">API 키 및 도메인 등록 여부를 확인해 주세요.</p>
        <button onClick={() => router.back()} className="mt-10">뒤로 가기</button>
      </div>
    )
  }

  const center = markers.length > 0 
    ? { lat: markers[0].lat, lng: markers[0].lng }
    : { lat: 37.566826, lng: 126.9786567 }

  return (
    <div className="map-page">
      <div className="map-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <h2>카카오 지도 확인 ({selectedCustomers.length}곳)</h2>
      </div>

      <div className="map-container">
        <Map
          center={center}
          style={{ width: "100%", height: "100%" }}
          level={4}
        >
          {markers.map((marker) => (
            <MapMarker
              key={marker.id}
              position={{ lat: marker.lat, lng: marker.lng }}
              onClick={() => setSelectedCustomer(marker.customer)}
            />
          ))}
        </Map>
      </div>

      {/* Info Panel */}
      {selectedCustomer && (
        <div className="info-panel animated-up">
          <div className="panel-header flex-between">
            <div className="flex-row">
              <h3 className="font-bold">{selectedCustomer.고객명_상호}</h3>
              <span className={`status-badge-small ${selectedCustomer.status === '작업완료' ? 'done' : selectedCustomer.status === '예약완료' ? 'reserved' : 'pending'}`}>
                {selectedCustomer.status}
              </span>
            </div>
            <button className="close-btn" onClick={() => setSelectedCustomer(null)}>×</button>
          </div>
          <div className="panel-body">
            <div className="panel-item">
              <Hash size={16} />
              <span>고객번호: {selectedCustomer.고객번호}</span>
            </div>
            <div className="panel-item">
              <User size={16} />
              <span>계약자: {selectedCustomer.계약자구분}</span>
            </div>
            <div className="panel-item">
              <Phone size={16} />
              <span>연락처: {selectedCustomer.전화번호}</span>
            </div>
            <div className="panel-item address">
              <div className="flex-row" style={{ gap: '5px', color: '#888', marginBottom: '4px' }}>
                <MapPin size={14} />
                <p className="text-xs">설치 주소</p>
              </div>
              <p>{selectedCustomer.설치주소 || selectedCustomer.주소}</p>
            </div>
          </div>
          <button 
            className="detail-view-btn"
            onClick={() => router.push(`/detail/${selectedCustomer.id}`)}
          >
            상세정보 보기
          </button>
        </div>
      )}

      <style jsx>{`
        .map-page {
          height: calc(100vh - var(--nav-height));
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .map-header {
          height: 60px;
          display: flex;
          align-items: center;
          padding: 0 15px;
          background: #fff;
          border-bottom: 1px solid var(--border-color);
        }
        .map-header h2 {
          font-size: 1.1rem;
          margin-left: 10px;
        }
        .map-container {
          flex: 1;
          background: #f0f0f0;
        }
        .map-placeholder {
          height: calc(100vh - 130px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .info-panel {
          position: absolute;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 -5px 25px rgba(0,0,0,0.15);
          z-index: 100;
          padding: 20px;
        }
        .animated-up {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .panel-header {
          margin-bottom: 15px;
        }
        .close-btn {
          font-size: 24px;
          color: #ccc;
        }
        .panel-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }
        .panel-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
        }
        .address {
          flex-direction: column;
          align-items: flex-start;
          background: #f9f9f9;
          padding: 10px;
          border-radius: 8px;
        }
        .flex-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-badge-small {
          font-size: 0.6rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }
        .status-badge-small.pending { background: #f5f5f5; color: #888; }
        .status-badge-small.reserved { background: #eef2ff; color: #4f46e5; }
        .status-badge-small.done { background: #ecfdf5; color: #10b981; }

        .detail-view-btn {
          width: 100%;
          background: var(--primary-color);
          color: #fff;
          padding: 12px;
          border-radius: 10px;
          font-weight: 700;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #ddd;
          border-top: 4px solid var(--accent-blue);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
