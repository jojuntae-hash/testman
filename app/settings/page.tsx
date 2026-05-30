'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/lib/DataContext'
import { ChevronLeft, Save, Trash2, Download, Upload, Map as MapIcon, Clock, Key, Home, Settings as SettingsIcon, Search, Lock, Unlock, RotateCcw, Database, LogOut } from 'lucide-react'
import * as XLSX from 'xlsx'
import Script from 'next/script'
import ManualAddModal from '@/components/ManualAddModal'
import CustomerDeleteModal from '@/components/CustomerDeleteModal'
import BackupManagerModal from '@/components/BackupManagerModal'
import LongTermBackupManagerModal from '@/components/LongTermBackupManagerModal'
import LongTermManualAddModal from '@/components/LongTermManualAddModal'

export default function SettingsPage() {
  const router = useRouter()
  const { customers, setCustomers, addCustomer, resetToDefault, clearAllCustomers, longTermCustomers, restoreLongTermFromBackup, clearAllLongTermCustomers, addLongTermCustomer } = useData()
  
  // 기본 설정 상태
  const [defaultSource, setDefaultSource] = useState('')
  const [taskDuration, setTaskDuration] = useState(30)
  const [excludeLunch, setExcludeLunch] = useState(false)
  const [mapDefaultZoom, setMapDefaultZoom] = useState(4)
  const [mapShowNames, setMapShowNames] = useState(false)
  const [kakaoKey, setKakaoKey] = useState('')
  const [isKeyLocked, setIsKeyLocked] = useState(true)
  const [navigationApp, setNavigationApp] = useState('tmap')
  const [isManualAddOpen, setIsManualAddOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isBackupManagerOpen, setIsBackupManagerOpen] = useState(false)
  const [isLongTermBackupManagerOpen, setIsLongTermBackupManagerOpen] = useState(false)
  const [isLongTermManualAddOpen, setIsLongTermManualAddOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDefaultSource(localStorage.getItem('default_source') || '인천 미추홀구 주안동 1467')
      setTaskDuration(parseInt(localStorage.getItem('task_duration') || '30', 10))
      setExcludeLunch(localStorage.getItem('exclude_lunch') === 'true')
      setMapDefaultZoom(parseInt(localStorage.getItem('map_default_zoom') || '4', 10))
      setMapShowNames(localStorage.getItem('map_show_names') === 'true')
      setKakaoKey(localStorage.getItem('kakao_app_key') || 'bcf159529047078b426216b892689408')
      setNavigationApp(localStorage.getItem('navigation_app') || 'tmap')
    }
  }, [])

  const saveSettings = () => {
    localStorage.setItem('default_source', defaultSource)
    localStorage.setItem('task_duration', taskDuration.toString())
    localStorage.setItem('exclude_lunch', excludeLunch.toString())
    localStorage.setItem('map_default_zoom', mapDefaultZoom.toString())
    localStorage.setItem('map_show_names', mapShowNames.toString())
    localStorage.setItem('kakao_app_key', kakaoKey)
    localStorage.setItem('navigation_app', navigationApp)
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

  // 장기 고객 데이터 백업 (JSON)
  const handleBackupLongTermJSON = () => {
    const data = {
      longTermCustomers,
      backupDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `long_term_customers_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  // 장기 고객 데이터 복원
  const handleRestoreLongTerm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (json.longTermCustomers) {
          restoreLongTermFromBackup(json.longTermCustomers)
          alert('장기 고객 데이터가 성공적으로 복원되었습니다.')
        } else {
          alert('장기 고객관리 백업 파일이 아닙니다.')
        }
      } catch (err) {
        alert('올바른 백업 파일이 아닙니다.')
      }
    }
    reader.readAsText(file)
  }

  // 장기 고객 전체 삭제
  const handleClearAllLongTerm = () => {
    if (confirm('정말로 모든 "고객관리" 장기 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      clearAllLongTermCustomers()
      alert('모든 장기 고객 데이터가 삭제되었습니다.')
    }
  }

  // Excel/CSV 날짜 변환 헬퍼
  const formatExcelDate = (serial: any) => {
    if (!serial) return ''
    if (typeof serial !== 'number') return serial.toString()
    const date = new Date((serial - 25569) * 86400 * 1000)
    return date.toISOString().split('T')[0]
  }

  // 엑셀/CSV 데이터 추가
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        const startId = Date.now()
        const mappedData = jsonData.map((row: any, index: number) => ({
          id: (startId + index).toString(),
          고객번호: (row['고객번호'] || '').toString(),
          모델명: (row['모델명'] || '').toString(),
          계약일자: formatExcelDate(row['계약일자']),
          계약만료일자: formatExcelDate(row['계약만료일자']),
          최종점검일: formatExcelDate(row['최종점검일']),
          예약일자: formatExcelDate(row['예약일시'] || row['예약일자']),
          당월작업: (row['당월작업'] || '').toString(),
          최종작업내용: (row['최종작업내용'] || '').toString(),
          status: '작업미완료',
          계약자구분: (row['계약자구분'] || '').toString(),
          고객명_상호: (row['고객명/상호'] || row['고객명_상호'] || '').toString(),
          사업자번호: (row['사업자번호'] || '').toString(),
          전화번호: (row['계약_전화번호'] || row['전화번호'] || '').toString(),
          핸드폰번호: (row['계약_핸드폰번호'] || row['핸드폰번호'] || '').toString(),
          주소: (row['계약_주소'] || row['주소'] || '').toString(),
          설치처구분: (row['설치처구분'] || '').toString(),
          설치자명: (row['설치자명'] || '').toString(),
          설치구분: (row['설치구분'] || '').toString(),
          설치전화번호: (row['설치_전화번호'] || row['설치전화번호'] || '').toString(),
          설치핸드폰번호: (row['설치_핸드폰번호'] || row['설치핸드폰번호'] || '').toString(),
          설치주소: (row['설치_주소'] || row['설치주소'] || '').toString(),
          설치시특이사항: (row['설치시특이사항'] || '').toString(),
        }))

        if (mappedData.length === 0) {
          alert('가져올 데이터가 없습니다.')
          return
        }

        if (confirm(`${mappedData.length}개의 데이터를 추가하시겠습니까?`)) {
          setCustomers([...customers, ...mappedData])
          alert('데이터가 성공적으로 추가되었습니다.')
        }
      } catch (err) {
        console.error(err)
        alert('파일을 읽는 중 오류가 발생했습니다.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleResetToDefault = () => {
    if (confirm('모든 데이터를 초기 샘플 데이터로 복구하시겠습니까? (현재 데이터는 유실됩니다)')) {
      resetToDefault()
      alert('샘플 데이터로 복구되었습니다.')
    }
  }

  const handleManualAdd = async (newCustomer: any) => {
    await addCustomer(newCustomer)
    setIsManualAddOpen(false)
    alert('새 고객이 추가되었습니다.')
  }

  const handleClearAll = () => {
    if (confirm('정말로 모든 고객 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      clearAllCustomers()
      alert('모든 데이터가 삭제되었습니다.')
    }
  }

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      localStorage.removeItem('auto_login')
      sessionStorage.removeItem('is_authenticated')
      window.location.reload()
    }
  }

  return (
    <div className="settings-page">
      <Script id="daum-postcode" src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
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



        {/* 지도 설정 */}
        <section className="settings-section">
          <div className="section-title"><MapIcon size={18} /> 지도 및 API 설정</div>
          
          <div className="setting-card">
            <div className="setting-info">
              <h3>카카오 API 앱 키</h3>
              <p>지도를 불러오는 데 필요한 JavaScript 키입니다.</p>
            </div>
            <div className="setting-control-group">
              <div className="key-input-wrapper">
                <input 
                  type={isKeyLocked ? "password" : "text"} 
                  className={`setting-input-full ${isKeyLocked ? 'locked' : ''}`} 
                  value={kakaoKey} 
                  onChange={(e) => setKakaoKey(e.target.value)}
                  disabled={isKeyLocked}
                />
                <button className="lock-btn" onClick={() => setIsKeyLocked(!isKeyLocked)}>
                  {isKeyLocked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="setting-card">
            <div className="setting-info">
              <h3>주소 연결 지도 앱</h3>
              <p>주소 클릭 시 연결할 지도 서비스입니다.</p>
            </div>
            <div className="setting-control">
              <select 
                className="setting-select"
                value={navigationApp}
                onChange={(e) => setNavigationApp(e.target.value)}
              >
                <option value="tmap">티맵 (TMAP)</option>
                <option value="kakao">카카오맵</option>
                <option value="naver">네이버 지도</option>
              </select>
            </div>
          </div>

          <div className="setting-card">
            <div className="setting-info">
              <h3>기본 지도 확대 레벨</h3>
              <p>지도를 처음 열었을 때의 확대 정도 (1~10)</p>
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

        {/* 데이터 관리 (간소화된 리스트 형태) */}
        <section className="settings-section">
          <div className="section-title"><SettingsIcon size={18} /> 데이터 관리</div>
          
          <div className="settings-list-group">
            <div className="settings-list-header">데이터 가져오기 및 추가</div>
            <div className="settings-list-items">
              <label className="settings-list-item">
                <div className="item-left"><Upload size={16} color="#f59e0b" /> <span>데이터 복원 (JSON 파일)</span></div>
                <input type="file" accept=".json" onChange={handleRestore} hidden />
              </label>
              <label className="settings-list-item">
                <div className="item-left"><Upload size={16} color="#10b981" /> <span>엑셀/CSV 데이터 추가</span></div>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} hidden />
              </label>
              <button className="settings-list-item" onClick={() => setIsManualAddOpen(true)}>
                <div className="item-left"><Upload size={16} color="#3b82f6" /> <span>수동으로 1건 추가</span></div>
              </button>
            </div>
          </div>

          <div className="settings-list-group">
            <div className="settings-list-header">데이터 백업 및 내보내기</div>
            <div className="settings-list-items">
              <button className="settings-list-item" onClick={() => setIsBackupManagerOpen(true)}>
                <div className="item-left"><Database size={16} color="#0ea5e9" /> <span>자동 백업 관리</span></div>
              </button>
              <button className="settings-list-item" onClick={handleBackupJSON}>
                <div className="item-left"><Download size={16} color="#8b5cf6" /> <span>전체 데이터 백업 (JSON)</span></div>
              </button>
              <button className="settings-list-item" onClick={handleBackupExcel}>
                <div className="item-left"><Download size={16} color="#10b981" /> <span>고객 리스트 내보내기 (Excel)</span></div>
              </button>
            </div>
          </div>

          <div className="settings-list-group">
            <div className="settings-list-header">장기 고객관리 데이터</div>
            <div className="settings-list-items">
              <button className="settings-list-item" onClick={() => setIsLongTermManualAddOpen(true)}>
                <div className="item-left"><Save size={16} color="#3b82f6" /> <span>장기 고객 수동 추가 (1건)</span></div>
              </button>
              <button className="settings-list-item" onClick={() => setIsLongTermBackupManagerOpen(true)}>
                <div className="item-left"><Database size={16} color="#0ea5e9" /> <span>장기 고객 자동 백업 관리</span></div>
              </button>
              <label className="settings-list-item">
                <div className="item-left"><Upload size={16} color="#f59e0b" /> <span>장기 고객 복원 (JSON)</span></div>
                <input type="file" accept=".json" onChange={handleRestoreLongTerm} hidden />
              </label>
              <button className="settings-list-item" onClick={handleBackupLongTermJSON}>
                <div className="item-left"><Download size={16} color="#8b5cf6" /> <span>장기 고객 백업 (JSON)</span></div>
              </button>
              <button className="settings-list-item" onClick={handleClearAllLongTerm}>
                <div className="item-left"><Trash2 size={16} color="#ef4444" /> <span>장기 고객 모두 삭제</span></div>
              </button>
            </div>
          </div>

          <div className="settings-list-group danger-zone">
            <div className="settings-list-header danger">데이터 삭제 및 초기화</div>
            <div className="settings-list-items">
              <button className="settings-list-item" onClick={() => setIsDeleteModalOpen(true)}>
                <div className="item-left"><Trash2 size={16} color="#f43f5e" /> <span>개별 고객 선택 삭제</span></div>
              </button>
              <button className="settings-list-item" onClick={handleResetToDefault}>
                <div className="item-left"><RotateCcw size={16} color="#6366f1" /> <span>샘플 데이터로 리셋</span></div>
              </button>
              <button className="settings-list-item" onClick={handleClearAll}>
                <div className="item-left"><Trash2 size={16} color="#ef4444" /> <span>모든 데이터 완전 삭제</span></div>
              </button>
            </div>
          </div>

          <div className="settings-list-group">
            <div className="settings-list-header">계정 관리</div>
            <div className="settings-list-items">
              <button className="settings-list-item" onClick={handleLogout}>
                <div className="item-left"><LogOut size={16} color="#64748b" /> <span>로그아웃</span></div>
              </button>
            </div>
          </div>
        </section>
      </div>

      {isManualAddOpen && (
        <ManualAddModal 
          onClose={() => setIsManualAddOpen(false)} 
          onAdd={handleManualAdd} 
        />
      )}

      {isDeleteModalOpen && (
        <CustomerDeleteModal 
          onClose={() => setIsDeleteModalOpen(false)}
        />
      )}

      {isBackupManagerOpen && (
        <BackupManagerModal 
          onClose={() => setIsBackupManagerOpen(false)}
        />
      )}

      {isLongTermBackupManagerOpen && (
        <LongTermBackupManagerModal 
          onClose={() => setIsLongTermBackupManagerOpen(false)}
        />
      )}

      {isLongTermManualAddOpen && (
        <LongTermManualAddModal 
          onClose={() => setIsLongTermManualAddOpen(false)}
          onAdd={async (data) => {
            try {
              await addLongTermCustomer(data)
              alert('장기 고객이 성공적으로 추가되었습니다.')
              setIsLongTermManualAddOpen(false)
            } catch(e) {
              alert('장기 고객 추가에 실패했습니다.')
            }
          }}
        />
      )}

      <style jsx>{`
        .settings-page { min-height: 100%; background: #f8fafc; padding-bottom: 100px; }
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
        .setting-input-full.locked { background: #f8fafc; color: #94a3b8; cursor: not-allowed; letter-spacing: 2px; }

        .key-input-wrapper { position: relative; display: flex; align-items: center; }
        .lock-btn { position: absolute; right: 10px; color: #94a3b8; padding: 5px; cursor: pointer; transition: color 0.2s; }
        .lock-btn:hover { color: #4f46e5; }

        .search-addr-btn { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; padding: 8px; border-radius: 10px; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer; transition: all 0.2s; }

        .unit { font-size: 0.9rem; font-weight: 700; color: #64748b; }
        .setting-select { padding: 10px; border-radius: 10px; border: 1px solid #e2e8f0; font-weight: 700; outline: none; cursor: pointer; }

        .toggle-switch { position: relative; display: inline-block; width: 50px; height: 28px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #e2e8f0; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #4f46e5; }
        input:checked + .slider:before { transform: translateX(22px); }

        /* 간소화된 리스트 메뉴 스타일 */
        .settings-list-group { margin-bottom: 24px; }
        .settings-list-header { font-size: 0.8rem; font-weight: 800; color: #64748b; margin-bottom: 8px; padding-left: 4px; }
        .settings-list-header.danger { color: #e11d48; }
        .settings-list-items { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .settings-list-group.danger-zone .settings-list-items { border-color: #fecaca; background: #fffcfc; }
        
        .settings-list-item { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 14px 16px; background: transparent; border: none; border-bottom: 1px solid #f1f5f9; cursor: pointer; text-align: left; transition: background 0.2s; }
        .settings-list-group.danger-zone .settings-list-item { border-bottom-color: #fee2e2; }
        .settings-list-item:last-child { border-bottom: none; }
        .settings-list-item:hover { background: #f8fafc; }
        .settings-list-group.danger-zone .settings-list-item:hover { background: #fff1f2; }
        .settings-list-item:active { background: #f1f5f9; }
        
        .item-left { display: flex; align-items: center; gap: 12px; }
        .item-left span { font-size: 0.9rem; font-weight: 600; color: #334155; }
        .settings-list-group.danger-zone .item-left span { color: #b91c1c; }
        
        @media (max-width: 480px) {
          .settings-list-item { padding: 12px 14px; }
          .item-left span { font-size: 0.85rem; }
        }
      `}</style>
    </div>
  )
}
