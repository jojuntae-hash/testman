'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useData, CustomerData } from '@/lib/DataContext'
import { ChevronLeft, Search, MapPin, Clock, Navigation, CheckCircle2, ChevronRight, X, Play, RotateCcw, LocateFixed, ExternalLink, Share2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import Script from 'next/script'
import { Map, CustomOverlayMap, Polyline } from 'react-kakao-maps-sdk'

declare global {
  interface Window {
    daum: any;
    kakao: any;
  }
}

export default function RoutePage() {
  const { customers, updateCustomerCoords } = useData()
  const router = useRouter()
  
  // 상태 관리
  const [markers, setMarkers] = useState<{ id: string; lat: number; lng: number; customer: CustomerData }[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('전체리스트')
  const [isMapReady, setIsMapReady] = useState(false)
  const [source, setSource] = useState('인천 미추홀구 주안동 1467')
  const [destination, setDestination] = useState('별도의 종착지 없음')
  const [kakaoKey, setKakaoKey] = useState('bcf159529047078b426216b892689408')
  const [optimizedRoute, setOptimizedRoute] = useState<any[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [routeStats, setRouteStats] = useState({ distance: 0, duration: 0 })
  const [destinationType, setDestinationType] = useState<'none' | 'start' | 'other'>('start')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // 초기 설정 및 API 키 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultSource = localStorage.getItem('default_source')
      const savedSource = localStorage.getItem('last_source')
      if (defaultSource) setSource(defaultSource)
      else if (savedSource) setSource(savedSource)
      
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

  useEffect(() => {
    prepareMap()
  }, [kakaoKey])

  // 출발지 변경 시 저장
  const handleSetSource = (val: string) => {
    setSource(val)
    localStorage.setItem('last_source', val)
  }

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        alert('현재 위치 좌표를 출발지로 설정합니다.')
        handleSetSource(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
      })
    }
  }

  const openExternalMap = (address: string) => {
    const encodedAddr = encodeURIComponent(address)
    const url = `https://map.kakao.com/link/search/${encodedAddr}`
    window.open(url, '_blank')
  }

  const handleShareRoute = () => {
    if (optimizedRoute.length === 0) {
      alert('공유할 경로가 없습니다. 먼저 경로를 생성해 주세요.')
      return
    }
    const summary = optimizedRoute.map((item, idx) => {
      const name = item.type === 'waypoint' ? item.customer.고객명_상호 : (item.type === 'source' ? '출발지' : '종착지')
      return `${idx + 1}. ${name} (${item.type === 'waypoint' ? (item.customer.설치주소 || item.customer.주소) : item.address})`
    }).join('\n')
    
    const text = `[방문 일정 공유]\n총 ${optimizedRoute.length}개 지점\n\n${summary}`
    
    navigator.clipboard.writeText(text).then(() => {
      alert('경로 리스트가 클립보드에 복사되었습니다.')
    })
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (index === 0 || index === optimizedRoute.length - 1) return
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    if (index === 0 || index === optimizedRoute.length - 1) return
    
    const newRoute = [...optimizedRoute]
    const draggedItem = newRoute[draggedIndex]
    newRoute.splice(draggedIndex, 1)
    newRoute.splice(index, 0, draggedItem)
    
    setDraggedIndex(index)
    setOptimizedRoute(newRoute)
  }

  const handleAddressSearch = (target: 'source' | 'destination') => {
    if (!window.daum) return
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        if (target === 'source') handleSetSource(data.address)
        else setDestination(data.address)
      }
    }).open()
  }

  const folders = useMemo(() => {
    const statuses = Array.from(new Set(customers.map(c => c.status))).filter(s => s !== '삭제됨')
    return ['전체리스트', ...statuses]
  }, [customers])

  const folderCustomers = useMemo(() => {
    if (selectedFolder === '전체리스트') return customers.filter(c => c.status !== '삭제됨')
    return customers.filter(c => c.status === selectedFolder)
  }, [customers, selectedFolder])

  useEffect(() => {
    if (isMapReady && window.kakao && window.kakao.maps.services) {
      const geocoder = new window.kakao.maps.services.Geocoder()
      const newMarkers: any[] = []
      let processedCount = 0
      
      if (folderCustomers.length === 0) { setMarkers([]); return; }
      
      folderCustomers.forEach((customer) => {
        const address = customer.설치주소 || customer.주소
        if (customer.lat && customer.lng) {
          newMarkers.push({ 
            id: customer.id, 
            lat: customer.lat, 
            lng: customer.lng, 
            customer: customer 
          })
          processedCount++;
          if (processedCount === folderCustomers.length) setMarkers(newMarkers)
          return;
        }

        geocoder.addressSearch(address, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const lat = parseFloat(result[0].y)
            const lng = parseFloat(result[0].x)
            newMarkers.push({ 
              id: customer.id, 
              lat, 
              lng, 
              customer: customer 
            })
            // 좌표 캐싱
            updateCustomerCoords(customer.id, lat, lng)
          }
          processedCount++;
          if (processedCount === folderCustomers.length) setMarkers(newMarkers)
        })
      })
    }
  }, [isMapReady, folderCustomers])

  const runOptimization = async () => {
    if (!isMapReady || !window.kakao.maps.services) return
    setIsOptimizing(true)
    
    const geocoder = new window.kakao.maps.services.Geocoder()
    const getCoords = (addr: string): Promise<{lat: number, lng: number} | null> => {
      return new Promise((resolve) => {
        geocoder.addressSearch(addr, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) })
          } else resolve(null)
        })
      })
    }

    const sCoord = await getCoords(source)
    let dCoord: {lat: number, lng: number} | null = null
    
    if (destinationType === 'start') dCoord = sCoord
    else if (destinationType === 'other') dCoord = await getCoords(destination)

    if (!sCoord) { alert('출발지 주소를 정확히 입력해 주세요.'); setIsOptimizing(false); return; }
    
    const waypoints = [...markers]
    const route: any[] = [{ type: 'source', lat: sCoord.lat, lng: sCoord.lng, name: '출발지', address: source }]
    let currentPos = sCoord
    const remaining = [...waypoints]

    while (remaining.length > 0) {
      let closestIdx = 0; let minDistance = Infinity;
      remaining.forEach((wp, idx) => {
        const dist = Math.sqrt(Math.pow(wp.lat - currentPos.lat, 2) + Math.pow(wp.lng - currentPos.lng, 2))
        if (dist < minDistance) { minDistance = dist; closestIdx = idx; }
      })
      const next = remaining.splice(closestIdx, 1)[0]
      route.push({ ...next, type: 'waypoint' })
      currentPos = { lat: next.lat, lng: next.lng }
    }

    if (dCoord) {
      route.push({ type: 'dest', lat: dCoord.lat, lng: dCoord.lng, name: '도착지', address: destinationType === 'start' ? source : destination })
    } else {
      const lastWp = route[route.length - 1]
      if (lastWp && lastWp.type === 'waypoint') {
        route.push({ ...lastWp, type: 'dest', name: '도착지', address: '마지막 작업지 종료' })
      }
    }

    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    let totalDist = 0
    for (let i = 0; i < route.length - 1; i++) {
      totalDist += calculateDistance(route[i].lat, route[i].lng, route[i+1].lat, route[i+1].lng)
    }

    const taskMin = parseInt(localStorage.getItem('task_duration') || '30', 10)
    const roadDist = totalDist * 1.3
    const workTime = route.filter(p => p.type === 'waypoint').length * taskMin
    let duration = (roadDist / 30) * 60 + workTime

    if (localStorage.getItem('exclude_lunch') === 'true' && duration >= 240) {
      duration += 60
    }

    setRouteStats({ distance: roadDist, duration: duration })
    setOptimizedRoute(route)
    setIsOptimizing(false)
  }

  const mapCenter = markers.length > 0 ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: 37.4563, lng: 126.7052 }

  return (
    <div className="route-page">
      <Script 
        id="kakao-map-sdk"
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&libraries=services&autoload=false`}
        strategy="afterInteractive"
        onLoad={prepareMap}
      />
      <Script id="daum-postcode" src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      
      <div className="view-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <div className="header-text">
          <h1>경로 최적화</h1>
          <p>방문 순서 및 최단 경로 탐색</p>
        </div>
        <button className="share-btn" onClick={handleShareRoute} title="경로 공유">
          <Share2 size={22} />
        </button>
      </div>

      <div className="map-section">
        {!isMapReady ? <div className="loading-map">지도를 불러오는 중...</div> : (
          <Map center={mapCenter} style={{ width: '100%', height: '100%' }} level={6}>
            <div className="map-controls">
              <button className="ctrl-btn" onClick={handleGetCurrentLocation} title="현위치">
                <LocateFixed size={20} />
              </button>
            </div>
            {optimizedRoute.length > 0 ? (
              optimizedRoute.map((m, idx) => (
                <CustomOverlayMap key={`${m.type}-${idx}`} position={{ lat: m.lat, lng: m.lng }}>
                  <div className={`marker-wrapper ${m.type}`}>
                    <div className="marker-tooltip">{m.type === 'waypoint' ? m.customer.고객명_상호 : m.name}</div>
                    <div className={`marker-pin ${m.type}`}>
                      <div className="pin-num">{m.type === 'source' ? '출' : m.type === 'dest' ? '종' : idx}</div>
                    </div>
                  </div>
                </CustomOverlayMap>
              ))
            ) : (
              markers.map((m) => (
                <CustomOverlayMap key={m.id} position={{ lat: m.lat, lng: m.lng }}>
                  <div className="marker-wrapper waypoint">
                    <div className="marker-tooltip">{m.customer.고객명_상호}</div>
                    <div className="marker-pin waypoint"><div className="pin-dot"></div></div>
                  </div>
                </CustomOverlayMap>
              ))
            )}
            {optimizedRoute.length > 1 && (
              <Polyline path={optimizedRoute.map(r => ({ lat: r.lat, lng: r.lng }))} strokeWeight={5} strokeColor="#4f46e5" strokeOpacity={0.7} />
            )}
          </Map>
        )}
      </div>

      <div className={`route-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="drag-handle-area" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="drag-handle"></div>
          <span className="drag-text">{isExpanded ? '지도 보기' : '리스트 보기'}</span>
        </div>

        <div className="folder-selector">
          <select 
            className="folder-select-large" 
            value={selectedFolder} 
            onChange={(e) => { setSelectedFolder(e.target.value); setOptimizedRoute([]); setRouteStats({ distance: 0, duration: 0 }); }}
          >
            {folders.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="route-stats">
          <div className="stat-item">
            <span className="stat-label">이동거리</span>
            <span className="stat-value">{routeStats.distance > 0 ? `${routeStats.distance.toFixed(1)}km` : '대기중'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">소요시간 <RotateCcw size={12} /></span>
            <span className="stat-value">{routeStats.duration > 0 ? `${Math.round(routeStats.duration)}분` : '대기중'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">작업</span>
            <span className="stat-value">{folderCustomers.length}건</span>
          </div>
          {optimizedRoute.length > 0 && (
            <button className="reset-route-btn" onClick={() => { setOptimizedRoute([]); setRouteStats({ distance: 0, duration: 0 }); }} title="초기화">
              <RotateCcw size={18} />
            </button>
          )}
        </div>

        <div className="route-list">
          {optimizedRoute.length > 0 ? (
            optimizedRoute.map((item, idx) => (
              <div key={`${item.type}-${idx}`} className={`route-item ${item.type === 'waypoint' ? 'waypoint-row' : 'special-row'}`}>
                <div className={`point-icon ${item.type === 'source' ? 'source' : item.type === 'dest' ? 'destination' : 'waypoint'}`}>
                  {item.type === 'source' ? '출' : item.type === 'dest' ? '종' : idx}
                </div>
                <div className="point-info">
                  <div className="point-name">{item.type === 'waypoint' ? item.customer.고객명_상호 : item.name}</div>
                  <div className="point-addr-sub">{item.type === 'waypoint' ? (item.customer.설치주소 || item.customer.주소) : item.address}</div>
                </div>
                <div className="item-actions">
                  {item.type === 'waypoint' && (
                    <div className="drag-handle-vertical" draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={() => setDraggedIndex(null)}>
                      <GripVertical size={20} color="#94a3b8" />
                    </div>
                  )}
                  {item.type !== 'dest' && (
                    <button className="action-link-btn nav" onClick={() => openExternalMap(item.type === 'waypoint' ? (item.customer.설치주소 || item.customer.주소) : item.address)}>
                      <Navigation size={18} />
                    </button>
                  )}
                  {item.type === 'waypoint' && (
                    <button className="action-link-btn detail" onClick={() => router.push(`/detail/${item.customer.id}`)}>
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="route-item editable-point">
                <div className="point-icon source">출</div>
                <div className="point-info">
                  <input type="text" className="point-input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="출발지 주소" />
                </div>
                <button className="search-btn-mini" onClick={() => handleAddressSearch('source')}><Search size={14} /></button>
              </div>

              <div className="empty-route">
                경로 만들기 버튼을 눌러 최단 경로를 생성하세요. (경유지 {folderCustomers.length}건 포함)
              </div>

              <div className="destination-selector mt-10">
                <div className="dest-type-select-wrapper">
                  <select 
                    className="dest-type-select" 
                    value={destinationType} 
                    onChange={(e) => setDestinationType(e.target.value as any)}
                  >
                    <option value="none">마지막 작업을 마친 곳에서 주행 종료하기</option>
                    <option value="start">출발한 곳에서 주행 종료하기 (왕복)</option>
                    <option value="other">다른 종착지에서 주행 종료하기</option>
                  </select>
                </div>
                {destinationType === 'other' && (
                  <div className="route-item editable-point mt-10">
                    <div className="point-icon destination">종</div>
                    <div className="point-info">
                      <input type="text" className="point-input" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="종착지 주소" />
                    </div>
                    <button className="search-btn-mini" onClick={() => handleAddressSearch('destination')}><Search size={14} /></button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="bottom-action">
          <button 
            className={`optimize-btn ${isOptimizing ? 'loading' : ''}`} 
            onClick={runOptimization} 
            disabled={isOptimizing || folderCustomers.length === 0}
          >
            {isOptimizing ? '최적화 중...' : '경로 만들기'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .route-page { height: 100%; display: flex; flex-direction: column; background: #fff; overflow: hidden; position: relative; }
        .view-header { height: 80px; display: flex; align-items: center; padding: 0 20px; border-bottom: 1px solid #f1f5f9; background: #fff; z-index: 100; flex-shrink: 0; }
        .back-btn { background: none; border: none; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #334155; }
        .header-text { margin-left: 12px; flex: 1; }
        .header-text h1 { font-size: 1.15rem; font-weight: 800; margin: 0; color: #1e293b; }
        .header-text p { font-size: 0.75rem; color: #94a3b8; margin: 0; }
        .share-btn { background: none; border: none; padding: 10px; cursor: pointer; color: #334155; }
        
        .map-section { flex: 1; position: relative; background: #f0f0f0; }
        .loading-map { height: 100%; display: flex; align-items: center; justify-content: center; color: #999; }
        
        .route-container { 
          position: absolute; bottom: 0; left: 0; right: 0; background: #fff; 
          border-radius: 24px 24px 0 0; z-index: 1000; padding: 0 20px 20px; 
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
          max-height: calc(100% - 100px); display: flex; flex-direction: column; 
          box-shadow: 0 -4px 12px rgba(0,0,0,0.05); 
        }
        .route-container.collapsed { transform: translateY(calc(100% - 130px)); }
        
        .drag-handle-area { padding: 10px 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .drag-handle { width: 40px; height: 4px; background: #e2e8f0; border-radius: 2px; }
        .drag-text { font-size: 0.7rem; color: #94a3b8; font-weight: 700; }
        
        .folder-selector { margin-bottom: 15px; }
        .folder-select-large { 
          width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; 
          font-size: 1rem; font-weight: 700; color: #1a1a1a; outline: none; background: #f8fafc; 
          appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E"); 
          background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; 
        }
        
        .route-stats { display: flex; justify-content: space-around; padding: 15px 0; border-bottom: 1px solid #f1f5f9; margin-bottom: 15px; }
        .stat-item { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .stat-label { font-size: 0.75rem; color: #94a3b8; display: flex; align-items: center; gap: 3px; }
        .stat-value { font-size: 1.1rem; font-weight: 800; color: #334155; }
        
        .route-list { flex: 1; overflow-y: auto; margin-top: 10px; padding-bottom: 20px; min-height: 150px; }
        .route-item { display: flex; align-items: center; gap: 15px; margin-bottom: 10px; }
        .point-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: #fff; }
        .point-icon.source { background: #3b82f6; }
        .point-icon.waypoint { background: #fff; color: #64748b; border: 1px solid #e2e8f0; }
        .point-icon.destination { background: #1e293b; }
        
        .point-info { flex: 1; min-width: 0; }
        .point-name { font-size: 0.9rem; font-weight: 700; color: #1e293b; }
        .point-addr-sub { font-size: 0.8rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .item-actions { display: flex; align-items: center; gap: 5px; }
        .action-link-btn { background: #f8fafc; border: 1px solid #e2e8f0; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; }
        .action-link-btn.nav { color: #3b82f6; background: #eff6ff; border-color: #dbeafe; }
        
        .drag-handle-vertical { cursor: grab; padding: 5px; }
        .map-controls { position: absolute; bottom: 20px; right: 20px; z-index: 10; }
        .ctrl-btn { width: 44px; height: 44px; background: #fff; border: none; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; }
        
        .editable-point { background: #f8fafc; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .point-input { flex: 1; border: none; background: transparent; font-size: 0.9rem; font-weight: 600; outline: none; width: 100%; }
        .search-btn-mini { background: #fff; border: 1px solid #e2e8f0; width: 28px; height: 28px; border-radius: 8px; color: #6366f1; }
        .reset-route-btn { background: #fff; border: 1px solid #e2e8f0; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #64748b; margin-left: 5px; }
        
        .dest-type-select-wrapper { position: relative; }
        .dest-type-select { 
          width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; 
          font-size: 0.9rem; font-weight: 600; color: #334155; outline: none; background: #fff; 
          appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E"); 
          background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; 
        }
        
        .mt-10 { margin-top: 10px; }
        .empty-route { padding: 15px 0; text-align: center; color: #94a3b8; font-size: 0.85rem; border-left: 2px dashed #e2e8f0; margin-left: 14px; }
        
        .bottom-action { padding-top: 10px; }
        .optimize-btn { width: 100%; background: #4f46e5; color: #fff; border: none; padding: 18px; border-radius: 16px; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
        .optimize-btn:disabled { background: #cbd5e1; }
        
        .marker-wrapper { display: flex; flex-direction: column; align-items: center; transform: translateY(-50%); position: relative; }
        .marker-tooltip { position: absolute; top: -35px; background: #334155; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
        .marker-pin { width: 30px; height: 30px; border: 3px solid #fff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; }
        .marker-pin.source { background: #6366f1; }
        .marker-pin.dest { background: #1e293b; }
        .marker-pin.waypoint { background: #3b82f6; }
        .pin-num { transform: rotate(45deg); color: #fff; font-size: 0.75rem; font-weight: 800; }
        .pin-dot { width: 8px; height: 8px; background: #fff; border-radius: 50%; transform: rotate(45deg); }
        .waypoint-row { border-left: 2px solid #e2e8f0; margin-left: 14px; padding-left: 15px; }
        .special-row { background: #f8fafc; padding: 10px; border-radius: 12px; }
      `}</style>
    </div>
  )
}
