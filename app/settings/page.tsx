'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/lib/DataContext'
import { ChevronLeft, Save, Trash2, Download, Upload, Map as MapIcon, Clock, Key, Home, Settings as SettingsIcon, Search, Lock, Unlock } from 'lucide-react'
import * as XLSX from 'xlsx'
import Script from 'next/script'

export default function SettingsPage() {
  const router = useRouter()
  const { customers, setCustomers } = useData()
  
  // 기본 설정 상태
  const [defaultSource, setDefaultSource] = useState('')
  const [taskDuration, setTaskDuration] = useState(30)
  const [excludeLunch, setExcludeLunch] = useState(false)
  const [mapDefaultZoom, setMapDefaultZoom] = useState(4)
  const [mapShowNames, setMapShowNames] = useState(false)
  const [kakaoKey, setKakaoKey] = useState('')
  const [isKeyLocked, setIsKeyLocked] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDefaultSource(localStorage.getItem('default_source') || '인천 미추홀구 주안동 1467')
      setTaskDuration(parseInt(localStorage.getItem('task_duration') || '30', 10))
      setExcludeLunch(localStorage.getItem('exclude_lunch') === 'true')
      setMapDefaultZoom(parseInt(localStorage.getItem('map_default_zoom') || '4', 10))
      setMapShowNames(localStorage.getItem('map_show_names') === 'true')
      setKakaoKey(localStorage.getItem('kakao_app_key') || 'bcf159529047078b426216b892689408')
    }
  }, [])

  const saveSettings = () => {
    localStorage.setItem('default_source', defaultSource)
    localStorage.setItem('task_duration', taskDuration.toString())
    localStorage.setItem('exclude_lunch', excludeLunch.toString())
    localStorage.setItem('map_default_zoom', mapDefaultZoom.toString())
    localStorage.setItem('map_show_names', mapShowNames.toString())
    localStorage.setItem('kakao_app_key', kakaoKey)
    alert('설정이 저장되었습니다.')
  }

  const handleAddressSearch = () => {
    const daum = (window as any).daum
    if (!daum || !daum.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    new daum.Postcode({
      oncomplete: (data: any) => {
        setDefaultSource(data.address)
      }
    }).open()
  }

  // 데이터 백업 (JSON)
  const handleBackupJSON = () => {
    const data = {
      customers,
      settings: {
        defaultSource,
        taskDuration,
        excludeLunch,
        mapDefaultZoom,
        mapShowNames,
        kakaoKey
      },
      backupDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customer_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  // 데이터 백업 (Excel)
  const handleBackupExcel = () => {
    const ws = XLSX.utils.json_to_sheet(customers)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Customers")
    XLSX.writeFile(wb, `customer_list_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // 데이터 복원
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (json.customers) {
          setCustomers(json.customers)
          if (json.settings) {
            if (json.settings.defaultSource) setDefaultSource(json.settings.defaultSource)
            if (json.settings.kakaoKey) setKakaoKey(json.settings.kakaoKey)
          }
          alert('데이터가 성공적으로 복원되었습니다.')
        }
      } catch (err) {
        alert('올바른 백업 파일이 아닙니다.')
      }
    }
    reader.readAsText(file)
  }

  const handleReset = () => {
    if (confirm('모든 고객 데이터와 설정이 초기화됩니다. 계속하시겠습니까?')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  return (
    <div className="settings-page">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      <div className="view-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <div className="header-text">
          <h1>환경 설정</h1>
          <p>앱 기능 및 데이터 관리</p>
        </div>
        <button className="save-btn" onClick={saveSettings}>
          <Save size={20} />
          저장
        </button>
      </div>

      <div className="settings-content">
        {/* 일반 설정 */}
        <section className="settings-section">
          <div className="section-title"><Home size={18} /> 일반 설정</div>
          <div className="setting-card">
            <div className="setting-info">
              <h3>기본 출발지 주소</h3>
              <p>경로 탐색 시 자동으로 입력될 출발지입니다.</p>
            </div>
            <div className="setting-control-group">
              <input 
                type="text" 
                className="setting-input-full" 
                value={defaultSource} 
                onChange={(e) => setDefaultSource(e.target.value)}
                placeholder="주소를 입력하거나 검색하세요"
              />
              <button className="search-addr-btn" onClick={handleAddressSearch}>
                <Search size={16} />
                주소 검색
              </button>
            </div>
          </div>
        </section>

        {/* 경로 및 업무 설정 */}
        <section className="settings-section">
          <div className="section-title"><Clock size={18} /> 업무 및 경로 설정</div>
          <div className="setting-card">
            <div className="setting-info">
              <h3>지점당 예상 작업 시간</h3>
              <p>하나의 지점에서 머무는 평균 시간(분)입니다.</p>
            </div>
            <div className="setting-control">
              <input 
                type="number" 
                className="setting-input" 
                value={taskDuration} 
                onChange={(e) => setTaskDuration(parseInt(e.target.value))}
              />
              <span className="unit">분</span>
            </div>
          </div>
          <div className="setting-card">
            <div className="setting-info">
              <h3>점심시간 제외 로직</h3>
              <p>총 업무 시간이 4시간 이상일 경우 1시간을 추가합니다.</p>
            </div>
            <div className="setting-control">
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={excludeLunch} 
                  onChange={(e) => setExcludeLunch(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* 지도 설정 */}
        <section className="settings-section">
          <div className="section-title"><MapIcon size={18} /> 지도 설정</div>
          <div className="setting-card">
            <div className="setting-info">
              <h3>기본 지도 확대 레벨</h3>
              <p>지도를 처음 열었을 때의 확대 정도 (1~14)</p>
            </div>
            <div className="setting-control">
              <select 
                className="setting-select"
                value={mapDefaultZoom}
                onChange={(e) => setMapDefaultZoom(parseInt(e.target.value))}
              >
                {[1,2,3,4,5,6,7,8,9,10].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="setting-card">
            <div className="setting-info">
              <h3>마커 이름 상시 표시</h3>
              <p>지도 마커 위에 고객명을 항상 표시합니다.</p>
            </div>
            <div className="setting-control">
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={mapShowNames} 
                  onChange={(e) => setMapShowNames(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* 데이터 관리 */}
        <section className="settings-section">
          <div className="section-title"><SettingsIcon size={18} /> 데이터 관리</div>
          <div className="data-action-grid">
            <button className="data-btn backup" onClick={handleBackupJSON}>
              <Download size={18} />
              전체 데이터 백업 (JSON)
            </button>
            <button className="data-btn excel" onClick={handleBackupExcel}>
              <Download size={18} />
              고객 리스트 내보내기 (Excel)
            </button>
            <label className="data-btn restore">
              <Upload size={18} />
              데이터 복원 (파일 선택)
              <input type="file" accept=".json" onChange={handleRestore} hidden />
            </label>
            <button className="data-btn reset" onClick={handleReset}>
              <Trash2 size={18} />
              전체 데이터 초기화
            </button>
          </div>
        </section>
      </div>

      <style jsx>{`
        .settings-page { min-height: 100vh; background: #f8fafc; padding-bottom: 100px; }
        .view-header { height: 80px; display: flex; align-items: center; padding: 0 20px; border-bottom: 1px solid #e2e8f0; background: #fff; position: sticky; top: 0; z-index: 100; }
        .back-btn { background: none; border: none; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; }
        .header-text { margin-left: 12px; flex: 1; }
        .header-text h1 { font-size: 1.25rem; font-weight: 800; margin: 0; color: #1e293b; }
        .header-text p { font-size: 0.8rem; color: #94a3b8; margin: 0; }
        .save-btn { background: #4f46e5; color: #fff; border: none; padding: 10px 18px; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; }
        .save-btn:active { transform: scale(0.95); }

        .settings-content { padding: 20px; max-width: 600px; margin: 0 auto; }
        .settings-section { margin-bottom: 30px; }
        .section-title { font-size: 0.9rem; font-weight: 800; color: #64748b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        
        .setting-card { background: #fff; padding: 20px; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; gap: 15px; }
        .setting-info h3 { font-size: 0.95rem; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
        .setting-info p { font-size: 0.8rem; color: #94a3b8; margin: 0; line-height: 1.4; }
        
        .setting-control { display: flex; align-items: center; gap: 8px; }
        .setting-control-group { width: 100%; max-width: 250px; display: flex; flex-direction: column; gap: 8px; }
        
        .setting-input { width: 80px; padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: #1e293b; outline: none; }
        .setting-input-full { width: 100%; padding: 10px 15px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.9rem; font-weight: 600; outline: none; transition: all 0.2s; }
        .setting-input-full:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
        .setting-input-full.locked { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }

        .search-addr-btn { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; padding: 8px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer; transition: all 0.2s; }

        .unit { font-size: 0.9rem; font-weight: 700; color: #64748b; }
        .setting-select { padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; font-weight: 700; outline: none; cursor: pointer; }

        .toggle-switch { position: relative; display: inline-block; width: 50px; height: 28px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #e2e8f0; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #4f46e5; }
        input:checked + .slider:before { transform: translateX(22px); }

        .data-action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .data-btn { padding: 20px 15px; border-radius: 20px; border: 1px solid #e2e8f0; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; text-align: center; color: #475569; }
        .data-btn:hover { border-color: #cbd5e1; background: #f1f5f9; transform: translateY(-2px); }
        .data-btn.reset { color: #ef4444; }
        .data-btn.backup { color: #4f46e5; }
        .data-btn.excel { color: #10b981; }
        .data-btn.restore { color: #f59e0b; }
      `}</style>
    </div>
  )
}
