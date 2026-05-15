'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2, Download, Settings as SettingsIcon } from 'lucide-react'
import * as XLSX from 'xlsx'
import ExcelUploader from '@/components/ExcelUploader'
import { useData } from '@/lib/DataContext'

export default function SettingsPage() {
  const router = useRouter()
  const { customers, setCustomers } = useData()
  const [taskDuration, setTaskDuration] = React.useState<number>(30)

  React.useEffect(() => {
    const saved = localStorage.getItem('task_duration')
    if (saved) setTaskDuration(parseInt(saved, 10))
  }, [])

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10)
    setTaskDuration(val)
    localStorage.setItem('task_duration', val.toString())
  }

  const handleResetData = () => {
    if (confirm('모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      if (confirm('정말로 모든 데이터를 삭제하시겠습니까? 다시 한번 확인해 주세요.')) {
        setCustomers([])
        alert('데이터가 초기화되었습니다.')
      }
    }
  }

  const handleDownloadExcel = () => {
    if (customers.length === 0) {
      alert('다운로드할 데이터가 없습니다.')
      return
    }
    
    // JSON 데이터를 엑셀 시트로 변환
    const worksheet = XLSX.utils.json_to_sheet(customers)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "고객리스트")
    
    // 파일 다운로드 실행
    XLSX.writeFile(workbook, `고객데이터_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="settings-page">
      <div className="view-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <div className="header-text">
          <h1>설정</h1>
          <p>데이터 관리 및 앱 설정</p>
        </div>
      </div>

      <div className="settings-content">
        <section className="settings-section">
          <h2 className="section-title">데이터 불러오기</h2>
          <div className="card">
            <ExcelUploader />
          </div>
        </section>

        <section className="settings-section">
          <h2 className="section-title">환경 설정</h2>
          <div className="card">
            <div className="setting-item">
              <div className="setting-info">
                <h3>기본 작업 소요 시간</h3>
                <p>경로 소요 시간 계산 시 각 고객마다 추가되는 기본 작업 시간입니다.</p>
              </div>
              <select className="duration-select" value={taskDuration} onChange={handleDurationChange}>
                <option value={10}>10분</option>
                <option value={20}>20분</option>
                <option value={30}>30분</option>
                <option value={40}>40분</option>
                <option value={50}>50분</option>
                <option value={60}>60분 (1시간)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="section-title">데이터 관리</h2>
          
          <div className="card action-card mb-15" onClick={handleDownloadExcel}>
            <div className="action-info">
              <h3>엑셀 파일 다운로드</h3>
              <p>현재 저장된 고객 데이터를 엑셀 파일로 저장합니다.</p>
            </div>
            <div className="action-icon download">
              <Download size={20} color="#3b82f6" />
            </div>
          </div>

          <div className="card action-card reset" onClick={handleResetData}>
            <div className="action-info">
              <h3>데이터 초기화</h3>
              <p>모든 고객 데이터를 삭제하고 초기 상태로 만듭니다.</p>
            </div>
            <div className="action-icon reset">
              <Trash2 size={20} color="#ff4d4f" />
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .settings-page {
          min-height: 100vh;
          background: #f8fafc;
          padding-bottom: 100px;
        }
        .view-header {
          height: 80px;
          display: flex;
          align-items: center;
          padding: 0 20px;
          border-bottom: 1px solid #f1f5f9;
          background: #fff;
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
          color: #334155;
        }
        .header-text {
          margin-left: 12px;
        }
        .header-text h1 {
          font-size: 1.15rem;
          font-weight: 800;
          margin: 0;
          color: #1e293b;
        }
        .header-text p {
          font-size: 0.75rem;
          color: #94a3b8;
          margin: 0;
          font-weight: 500;
        }
        .settings-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        .section-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 12px;
          padding-left: 5px;
        }
        .card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 0;
        }
        .setting-info h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .setting-info p {
          font-size: 0.8rem;
          color: #64748b;
        }
        .duration-select {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          color: #334155;
          background: #f8fafc;
          outline: none;
        }
        .action-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-card:active {
          transform: scale(0.98);
        }
        .action-card.reset:active {
          background: #fff1f0;
        }
        .action-card.mb-15 { margin-bottom: 15px; }
        
        .action-info h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
        }
        .action-info p {
          font-size: 0.8rem;
          color: #64748b;
          margin: 0;
        }
        .action-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-icon.download { background: #eff6ff; }
        .action-icon.reset { background: #fff1f0; }
      `}</style>
    </div>
  )
}
