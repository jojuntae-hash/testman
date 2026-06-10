'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useData, CustomerData, LongTermCustomer } from '@/lib/DataContext'
import { ChevronLeft, ChevronRight, X, Phone, MapPin, ExternalLink, FolderPlus, Trash2, Map as MapIcon, LocateFixed, Star } from 'lucide-react'
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk'
import Script from 'next/script'

const formatShortAddress = (addr: string) => {
  if (!addr) return ''
  return addr.replace(/^(?:[가-힣]+(?:시|도)\s+)?(?:[가-힣]+(?:구|군|시)\s+)?/, '').trim()
}

export default function MapPage() {
  const { customers, longTermCustomers, setCustomers, changeLongTermCustomerStatus, updateLongTermCustomerCoords, deleteLongTermCustomers, selectedIds, updateCustomerCoords, changeCustomerStatus, folderColors, updateFolderColor } = useData()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isLongTerm = searchParams?.get('type') === 'longTerm'
  
  // 상태 관리
  const [selectedCustomersList, setSelectedCustomersList] = useState<any[]>([])
  const [markers, setMarkers] = useState<{ key: string; lat: number; lng: number; customers: any[]; isGroup: boolean }[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('선택된 항목')
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapDefaultZoom, setMapDefaultZoom] = useState(4)
  const [mapShowNames, setMapShowNames] = useState(false)
  const [kakaoKey, setKakaoKey] = useState('bcf159529047078b426216b892689408') // 기본 키로 초기화
  const [isExpanded, setIsExpanded] = useState(false)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 37.5665, lng: 126.9780 })
  const [mapRef, setMapRef] = useState<any>(null)
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null)
  // 상태 복원 완료 여부 (복원 전에 markers 이펙트 중복 실행 방지)
  const [stateRestored, setStateRestored] = useState(false)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6')
  const [defaultSource, setDefaultSource] = useState<string>('')
  const [defaultSourceCoords, setDefaultSourceCoords] = useState<{ lat: number; lng: number } | null>(null)

  const [sessionSelectedIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const savedIds = sessionStorage.getItem('map_selected_ids')
      if (savedIds) {
        try { return JSON.parse(savedIds) } catch (e) {}
      }
    }
    return []
  })

  // 초기 설정 로드 + sessionStorage에서 이전 상태 복원
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedZoom = localStorage.getItem('map_default_zoom')
      if (savedZoom) setMapDefaultZoom(parseInt(savedZoom, 10))
      
      setMapShowNames(localStorage.getItem('map_show_names') === 'true')
      
      const savedKey = localStorage.getItem('kakao_app_key')
      if (savedKey) setKakaoKey(savedKey)

      // 이전에 선택했던 폴더 복원
      const savedFolder = sessionStorage.getItem('map_selected_folder')
      if (savedFolder) setSelectedFolder(savedFolder)

      // 리스트 패널 확장 상태 복원
      const savedExpanded = sessionStorage.getItem('map_is_expanded')
      if (savedExpanded === 'true') setIsExpanded(true)
      
      const savedDefaultSource = localStorage.getItem('default_source') || '인천 미추홀구 주안동 1467'
      setDefaultSource(savedDefaultSource)
    }
    setStateRestored(true)
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

  // 기존 커스텀 폴더 목록
  const uniqueFolders = useMemo(() => {
    const dataList = isLongTerm ? longTermCustomers : customers
    return Array.from(new Set(dataList.map(c => c.status)))
      .filter((s): s is string => !!s && s !== '미분류' && !['작업미완료', '예약완료', '작업완료', '삭제됨'].includes(s))
  }, [customers, longTermCustomers, isLongTerm])

  const folders = useMemo(() => {
    const dataList = isLongTerm ? longTermCustomers : customers
    const statuses = Array.from(new Set(dataList.map(c => c.status || '미분류'))).filter(s => s !== '삭제됨')
    return ['선택된 항목', '전체리스트', ...statuses]
  }, [customers, longTermCustomers, isLongTerm])

  const displayCustomers = useMemo(() => {
    const dataList = isLongTerm ? longTermCustomers : customers
    if (selectedFolder === '선택된 항목') {
      const idsToUse = sessionSelectedIds.length > 0 ? sessionSelectedIds : selectedIds
      return dataList.filter(c => idsToUse.includes(c.id))
    }
    if (selectedFolder === '전체리스트') return dataList.filter(c => c.status !== '삭제됨')
    return dataList.filter(c => (c.status || '미분류') === selectedFolder)
  }, [customers, longTermCustomers, selectedIds, sessionSelectedIds, selectedFolder, isLongTerm])

  // 주소를 좌표로 변환 (상태 복원 완료 후 실행)
  useEffect(() => {
    if (!stateRestored) return
    if (isMapReady && window.kakao && window.kakao.maps.services) {
      const geocoder = new window.kakao.maps.services.Geocoder()
      
      // 기본 출발지 주소 변환
      if (defaultSource) {
        geocoder.addressSearch(defaultSource, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            setDefaultSourceCoords({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) })
          }
        })
      }

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
          if (processedCount === displayCustomers.length) {
            const grouped = newMarkers.reduce((acc: any, cur: any) => {
              const key = `${cur.lat.toFixed(5)}_${cur.lng.toFixed(5)}`
              if (!acc[key]) acc[key] = { key, lat: cur.lat, lng: cur.lng, customers: [] }
              acc[key].customers.push(cur.customer)
              return acc
            }, {})
            setMarkers(Object.values(grouped).map((g: any) => ({ ...g, isGroup: g.customers.length > 1 })))
          }
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
            if (isLongTerm) {
              updateLongTermCustomerCoords(customer.id, lat, lng)
            } else {
              updateCustomerCoords(customer.id, lat, lng)
            }
          }
          processedCount++
          if (processedCount === displayCustomers.length) {
            const grouped = newMarkers.reduce((acc: any, cur: any) => {
              const key = `${cur.lat.toFixed(5)}_${cur.lng.toFixed(5)}`
              if (!acc[key]) acc[key] = { key, lat: cur.lat, lng: cur.lng, customers: [] }
              acc[key].customers.push(cur.customer)
              return acc
            }, {})
            setMarkers(Object.values(grouped).map((g: any) => ({ ...g, isGroup: g.customers.length > 1 })))
          }
        })
      })
    }
  }, [isMapReady, displayCustomers, stateRestored])

  const toggleCustomerSelection = (customer: any) => {
    setSelectedCustomersList(prev => {
      const isExist = prev.find(c => c.id === customer.id)
      return isExist ? prev.filter(c => c.id !== customer.id) : [...prev, customer]
    })
  }

  const isSelected = (id: string) => selectedCustomersList.some(c => c.id === id)

  const getMarkerColor = (status: string | undefined) => {
    if (!status || status === '미분류') return '#94a3b8';
    switch(status) {
      case '작업완료': return '#10b981';
      case '예약완료': return '#3b82f6';
      case '작업미완료': return '#64748b';
      default: return folderColors[status] || '#cbd5e1';
    }
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedCustomersList.length === 0) return
    const msg = newStatus === '삭제됨' ? '선택한 고객을 삭제하시겠습니까?' : '상태를 변경하시겠습니까?'
    if (confirm(msg)) {
      const selectedListIds = selectedCustomersList.map(c => c.id)
      if (isLongTerm) {
        if (newStatus === '삭제됨') {
          await deleteLongTermCustomers(selectedListIds)
        } else {
          await changeLongTermCustomerStatus(selectedListIds, newStatus)
        }
      } else {
        await changeCustomerStatus(selectedListIds, newStatus)
      }
      setSelectedCustomersList([])
    }
  }

  // 새 폴더 만들기
  const handleCreateNewFolder = () => {
    if (!newFolderName || newFolderName.trim() === '') return
    const folderName = newFolderName.trim()
    const selectedListIds = selectedCustomersList.map(c => c.id)
    if (isLongTerm) {
      changeLongTermCustomerStatus(selectedListIds, folderName)
    } else {
      const updated = customers.map(c => selectedListIds.includes(c.id) ? { ...c, status: folderName } : c)
      setCustomers(updated as any)
    }
    updateFolderColor(folderName, newFolderColor)
    setSelectedCustomersList([])
    setNewFolderName('')
    setIsFolderModalOpen(false)
  }

  // 기존 폴더로 이동
  const handleMoveToExistingFolder = (folderName: string) => {
    const selectedListIds = selectedCustomersList.map(c => c.id)
    if (isLongTerm) {
      changeLongTermCustomerStatus(selectedListIds, folderName)
    } else {
      const updated = customers.map(c => selectedListIds.includes(c.id) ? { ...c, status: folderName } : c)
      setCustomers(updated as any)
    }
    setSelectedCustomersList([])
    setIsFolderModalOpen(false)
  }

  // markers가 준비되면 지도 중심 이동 + 이전에 선택했던 마커들 복원
  useEffect(() => {
    if (markers.length > 0) {
      // 이전에 선택된 마커 ID들 복원
      const savedIds = sessionStorage.getItem('map_selected_ids')
      if (savedIds) {
        try {
          const ids: string[] = JSON.parse(savedIds)
          const restored = markers
            .flatMap(m => m.customers)
            .filter(c => ids.includes(c.id))
          if (restored.length > 0) {
            setSelectedCustomersList(restored)
            // 복원된 마커 중 첫 번째로 지도 중심 이동
            const firstRestoredMarker = markers.find(m => m.customers.some(c => ids.includes(c.id)))
            if (firstRestoredMarker) setMapCenter({ lat: firstRestoredMarker.lat, lng: firstRestoredMarker.lng })
          } else {
            setMapCenter({ lat: markers[0].lat, lng: markers[0].lng })
          }
        } catch {
          setMapCenter({ lat: markers[0].lat, lng: markers[0].lng })
        }
        // 한 번 복원하면 삭제 (다음 진입 시 초기화)
        sessionStorage.removeItem('map_selected_ids')
        sessionStorage.removeItem('map_selected_folder')
        sessionStorage.removeItem('map_is_expanded')
      } else {
        setMapCenter({ lat: markers[0].lat, lng: markers[0].lng })
      }
    }
  }, [markers])

  const getElapsedMonths = (contractDate?: string) => {
    if (!contractDate) return -1
    const start = new Date(contractDate)
    const end = new Date()
    if (isNaN(start.getTime())) return -1
    let diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    if (end.getDate() < start.getDate()) diff--
    return Math.max(0, diff)
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
    const months = getElapsedMonths(contractDate)
    if (months === -1) return null

    return (
      <span className="model-badge elapsed-months">
        {months}개월
      </span>
    )
  }

  const moveToCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          
          setCurrentPosition({ lat, lng })
          
          if (mapRef) {
            const moveLatLng = new window.kakao.maps.LatLng(lat, lng)
            mapRef.setCenter(moveLatLng)
          } else {
            setMapCenter({ lat, lng })
          }
        },
        (error) => {
          alert('현재 위치를 가져올 수 없습니다. 위치 권한을 확인해 주세요.')
        },
        { enableHighAccuracy: true }
      )
    } else {
      alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.')
    }
  }

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
          <>
            <Map 
              ref={setMapRef}
              center={mapCenter} 
              style={{ width: "100%", height: "100%" }} 
              level={mapDefaultZoom}
            >
              {markers.map((marker) => {
                const isActive = marker.customers.some((c: any) => isSelected(c.id))
                return (
                  <CustomOverlayMap key={marker.key} position={{ lat: marker.lat, lng: marker.lng }}>
                    <div 
                      className={`marker-wrapper ${isActive ? 'active' : ''} ${marker.isGroup ? 'group-marker' : ''}`} 
                      onClick={() => {
                        if (marker.isGroup) {
                          const allSelected = marker.customers.every((c: any) => isSelected(c.id))
                          if (allSelected) {
                            setSelectedCustomersList(prev => prev.filter(p => !marker.customers.some((c: any) => c.id === p.id)))
                          } else {
                            setSelectedCustomersList(prev => {
                              const newArr = [...prev]
                              marker.customers.forEach((c: any) => {
                                if (!newArr.some(p => p.id === c.id)) newArr.push(c)
                              })
                              return newArr
                            })
                          }
                        } else {
                          toggleCustomerSelection(marker.customers[0])
                        }
                      }} 
                      style={{ '--m-color': getMarkerColor(marker.customers[0].status) } as any}
                    >
                      <div className="marker-pin">
                        {marker.isGroup ? <div className="group-count">{marker.customers.length}</div> : <div className="marker-core"></div>}
                      </div>
                      {(isActive || mapShowNames) && (
                        <div className="marker-tooltip">
                          {marker.isGroup ? `${marker.customers.length}명 겹침` : marker.customers[0].고객명_상호}
                        </div>
                      )}
                    </div>
                  </CustomOverlayMap>
                )
              })}
              
              {currentPosition && (
                <CustomOverlayMap position={currentPosition}>
                  <div className="current-location-marker">
                    <div className="pulse-ring"></div>
                    <div className="center-dot"></div>
                  </div>
                </CustomOverlayMap>
              )}
              
              {defaultSourceCoords && (
                <CustomOverlayMap position={defaultSourceCoords}>
                  <div className="default-source-marker" title={`기본출발지: ${defaultSource}`}>
                    <div className="marker-pin-star">
                      <Star size={16} fill="#fff" color="#fff" />
                    </div>
                    {(mapShowNames) && (
                      <div className="marker-tooltip">
                        기본출발지
                      </div>
                    )}
                  </div>
                </CustomOverlayMap>
              )}
            </Map>
            <button className="current-location-btn" onClick={moveToCurrentLocation} title="현재 위치 보기">
              <LocateFixed size={20} />
            </button>
          </>
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
                <button className="act-btn-mini folder" onClick={() => setIsFolderModalOpen(true)}>폴더</button>
                {!isLongTerm && <button className="act-btn-mini" onClick={() => handleBulkStatusChange('작업미완료')}>미완료</button>}
                {!isLongTerm && <button className="act-btn-mini reserved" onClick={() => handleBulkStatusChange('예약완료')}>예약</button>}
                {!isLongTerm && <button className="act-btn-mini complete" onClick={() => handleBulkStatusChange('작업완료')}>완료</button>}
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
                    <div className="row-name-container">
                      <div className="row-name">{customer.고객명_상호}</div>
                      <div className="row-badge" style={{ background: getMarkerColor(customer.status) }}>{customer.status || '미분류'}</div>
                      {getModelTypeBadge(customer.모델명)}
                      {getElapsedMonthsBadge(customer.계약일자)}
                    </div>
                    <div className="row-addr">{(customer.전화번호 || customer.핸드폰번호 || customer.설치전화번호 || '').replace(/-/g, '') + ' | ' + formatShortAddress(customer.설치주소 || customer.주소 || '')}</div>
                  </div>
                  <button className="detail-btn" onClick={() => {
                    // 상세 페이지 이동 전 현재 상태 sessionStorage에 저장
                    sessionStorage.setItem('map_selected_folder', selectedFolder)
                    sessionStorage.setItem('map_selected_ids', JSON.stringify(selectedCustomersList.map(c => c.id)))
                    sessionStorage.setItem('map_is_expanded', String(isExpanded))
                    if (isLongTerm) {
                      router.push(`/customers/${customer.id}`)
                    } else {
                      router.push(`/detail/${customer.id}`)
                    }
                  }}>상세</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>



      {/* 폴더 이동 모달 */}
      {isFolderModalOpen && (
        <div className="map-folder-modal-overlay" onClick={() => setIsFolderModalOpen(false)}>
          <div className="map-folder-modal-content" onClick={e => e.stopPropagation()}>
            <div className="map-modal-header">
              <h3>선택한 {selectedCustomersList.length}명을 폴더로 이동</h3>
              <button className="map-modal-close-btn" onClick={() => setIsFolderModalOpen(false)}>×</button>
            </div>
            <div className="map-modal-section">
              <label className="map-section-label">새 폴더 만들기</label>
              <div className="map-new-folder-group">
                <input 
                  type="color" 
                  className="map-new-folder-color" 
                  value={newFolderColor} 
                  onChange={e => setNewFolderColor(e.target.value)}
                  title="폴더 색상 선택"
                />
                <input
                  type="text"
                  placeholder="새 폴더 이름을 입력하세요..."
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateNewFolder()}
                />
                <button className="map-create-submit-btn" onClick={handleCreateNewFolder}>만들기</button>
              </div>
            </div>
            <div className="map-modal-section">
              <label className="map-section-label">기존 폴더에 넣기</label>
              {uniqueFolders.length === 0 ? (
                <p className="map-no-folders-text">생성된 폴더가 없습니다.</p>
              ) : (
                <div className="map-existing-folders-list">
                  {uniqueFolders.map(folder => (
                    <button
                      key={folder}
                      className="map-existing-folder-item"
                      onClick={() => handleMoveToExistingFolder(folder)}
                    >
                      <FolderPlus size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
                      <span>{folder}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .map-page { height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #fff; }
        .view-header { height: 70px; display: flex; align-items: center; padding: 0 15px; border-bottom: 1px solid #eee; background: #fff; z-index: 100; }
        .back-btn { background: none; border: none; cursor: pointer; color: #333; padding: 5px; }
        .header-text { margin-left: 10px; }
        .header-text h1 { font-size: 1.1rem; font-weight: 800; margin: 0; color: #1a1a1a; }
        .header-text p { font-size: 0.7rem; color: #999; margin: 0; }
        
        .map-area { flex: 1; position: relative; background: #f8f9fa; }
        .current-location-btn { position: absolute; bottom: 145px; right: 15px; z-index: 10; width: 42px; height: 42px; border-radius: 50%; background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569; transition: all 0.2s; }
        .current-location-btn:hover { color: #3b82f6; background: #f8fafc; transform: scale(1.05); }
        .current-location-btn:active { transform: scale(0.95); }
        
        .current-location-marker { position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
        .center-dot { width: 12px; height: 12px; background: #3b82f6; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8); z-index: 2; }
        .pulse-ring { position: absolute; width: 36px; height: 36px; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: pulse-ring-anim 1.5s cubic-bezier(0.24, 0, 0.38, 1) infinite; z-index: 1; }
        @keyframes pulse-ring-anim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }

        .loading-map { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #999; gap: 10px; }
        .loading-spinner { width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .marker-wrapper { display: flex; flex-direction: column; align-items: center; transform: translateY(-50%); cursor: pointer; position: relative; }
        .marker-pin { width: 24px; height: 24px; background: var(--m-color); border: 2px solid #fff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .marker-core { width: 8px; height: 8px; background: #fff; border-radius: 50%; }
        .marker-wrapper.active .marker-pin { background: #3b82f6 !important; transform: rotate(-45deg) scale(1.2); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .marker-tooltip { position: absolute; top: -35px; background: #333; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; white-space: nowrap; font-weight: 600; z-index: 10; }
        .group-count { color: #fff; font-size: 0.75rem; font-weight: 800; transform: rotate(45deg); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; margin-top: -1px; margin-left: -1px; }
        
        .default-source-marker { display: flex; flex-direction: column; align-items: center; transform: translateY(-50%); position: relative; z-index: 20; }
        .marker-pin-star { width: 32px; height: 32px; background: #eab308; border: 2px solid #fff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(234,179,8,0.5); }
        .marker-pin-star > svg { transform: rotate(45deg); }

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
        .row-badge { display: inline-block; font-size: 0.65rem; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
        .row-name-container { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px; }
        .row-name { font-size: 0.95rem; font-weight: 800; color: #1a1a1a; }
        :global(.model-badge) { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; }
        :global(.model-badge.purifier) { background: #eff6ff; color: #3b82f6; }
        :global(.model-badge.air-cleaner) { background: #ecfdf5; color: #10b981; }
        :global(.model-badge.bidet) { background: #fff7ed; color: #ea580c; }
        :global(.model-badge.elapsed-months) { background: #f1f5f9; color: #475569; }
        .row-addr { font-size: 0.75rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
        .detail-btn { font-size: 0.75rem; padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; color: #666; font-weight: 600; }
        
        .header-actions { display: flex; gap: 6px; }
        .act-btn-mini { background: #f1f5f9; color: #475569; border: none; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .act-btn-mini:active { transform: scale(0.95); }
        .act-btn-mini.folder { background: #fef3c7; color: #92400e; }
        .act-btn-mini.reserved { background: #eef2ff; color: #3730a3; }
        .act-btn-mini.complete { background: #d1fae5; color: #065f46; }
        .act-btn-mini.danger { background: #fee2e2; color: #991b1b; }

        /* 폴더 모달 */
        .map-folder-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .map-folder-modal-content { background: #fff; width: 100%; max-width: 360px; border-radius: 20px; padding: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); animation: mapModalIn 0.2s cubic-bezier(0.16,1,0.3,1); color: #1e293b; }
        @keyframes mapModalIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .map-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .map-modal-header h3 { font-size: 0.95rem; font-weight: 800; margin: 0; color: #0f172a; }
        .map-modal-close-btn { background: none; border: none; font-size: 1.3rem; color: #94a3b8; cursor: pointer; padding: 0; line-height: 1; }
        .map-modal-section { margin-bottom: 16px; }
        .map-modal-section:last-child { margin-bottom: 0; }
        .map-section-label { display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
        .map-new-folder-group { display: flex; gap: 6px; }
        .map-new-folder-color { width: 34px; height: 34px; padding: 0; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; flex-shrink: 0; background: #fff; }
        .map-new-folder-color::-webkit-color-swatch-wrapper { padding: 0; }
        .map-new-folder-color::-webkit-color-swatch { border: none; border-radius: 9px; }
        .map-new-folder-group input[type="text"] { flex: 1; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.8rem; outline: none; color: #1e293b; background: #fff; }
        .map-new-folder-group input[type="text"]:focus { border-color: #3b82f6; }
        .map-create-submit-btn { background: #3b82f6; color: #fff; border: none; padding: 0 14px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .map-create-submit-btn:hover { background: #2563eb; }
        .map-no-folders-text { font-size: 0.75rem; color: #94a3b8; margin: 6px 0; text-align: center; }
        .map-existing-folders-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; max-height: 120px; overflow-y: auto; }
        .map-existing-folder-item { background: #f8fafc; border: 1px solid #f1f5f9; padding: 8px 10px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; color: #334155; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s; text-align: left; width: 100%; min-width: 0; }
        .map-existing-folder-item:hover { background: #eff6ff; border-color: #bfdbfe; color: #1e3a8a; }
        .map-existing-folder-item span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
      `}</style>
    </div>
  )
}
