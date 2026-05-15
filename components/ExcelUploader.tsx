'use client'

import React from 'react'
import * as XLSX from 'xlsx'
import { Upload } from 'lucide-react'
import { useData, CustomerData } from '@/lib/DataContext'

export default function ExcelUploader() {
  const { setCustomers } = useData()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      const formattedData: CustomerData[] = jsonData.map((row, index) => {
        // Helper to get value by multiple possible keys
        const getVal = (keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null) return String(row[key])
          }
          return ''
        }

        return {
          id: String(Date.now() + index), // Unique ID using timestamp
          고객번호: getVal(['고객번호']),
          모델명: getVal(['모델명']),
          계약일자: getVal(['계약일자']),
          계약만료일자: getVal(['계약만료일자']),
          최종점검일: getVal(['최종점검일']),
          예약일자: getVal(['예약일시', '예약일자']),
          당월작업: getVal(['당월작업']),
          최종작업내용: getVal(['최종작업내용']),
          status: '작업미완료',
          계약자구분: getVal(['계약자구분']),
          고객명_상호: getVal(['고객명/상호', '고객명_상호', '상호', '고객명']),
          사업자번호: getVal(['사업자번호']),
          전화번호: getVal(['계약_전화번호', '전화번호', '연락처']),
          핸드폰번호: getVal(['계약_핸드폰번호', '핸드폰번호', '휴대폰']),
          주소: getVal(['계약_주소', '주소']),
          설치처구분: getVal(['설치처구분']),
          설치자명: getVal(['설치자명']),
          설치구분: getVal(['설치구분']),
          설치전화번호: getVal(['설치_전화번호', '설치전화번호', '전화번호_설치']),
          설치핸드폰번호: getVal(['설치_핸드폰번호', '설치핸드폰번호', '핸드폰번호_설치']),
          설치주소: getVal(['설치_주소', '설치주소', '주소_설치']),
          설치시특이사항: getVal(['설치시 특이사항', '설치시특이사항', '특이사항', '메모']),
        }
      })

      if (formattedData.length > 0) {
        setCustomers(formattedData)
        alert(`${formattedData.length}건의 데이터를 성공적으로 불러왔습니다.`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="uploader-container">
      <label htmlFor="excel-upload" className="uploader-label">
        <Upload size={32} />
        <div className="mt-10">
          <p className="font-bold">엑셀 파일 업로드</p>
          <p className="text-xs text-sub">클릭하거나 파일을 드래그하여 업로드하세요</p>
        </div>
        <input 
          id="excel-upload" 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </label>

      <style jsx>{`
        .uploader-container {
          padding: 20px;
        }
        .uploader-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed #ddd;
          border-radius: 12px;
          padding: 40px 20px;
          cursor: pointer;
          transition: all 0.2s;
          background: #fafafa;
        }
        .uploader-label:hover {
          border-color: var(--accent-blue);
          background: #f0f7ff;
        }
        .text-sub {
          color: #888;
        }
        .mt-10 { margin-top: 10px; }
      `}</style>
    </div>
  )
}
