'use client'

import React from 'react'
import ExcelUploader from '@/components/ExcelUploader'
import CustomerList from '@/components/CustomerList'
import { useData } from '@/lib/DataContext'

export default function Home() {
  const { customers } = useData()

  return (
    <div className="home-page">
      <div className="content-area">
        {customers.length > 0 && <CustomerList />}
        
        <div className="uploader-section">
          <p className="text-xs text-sub mb-10">새로운 데이터를 추가하려면 아래에서 업로드하세요</p>
          <ExcelUploader />
        </div>
      </div>

      <style jsx>{`
        .home-page {
          min-height: calc(100vh - 70px);
        }
        .content-area {
          padding: 10px 0;
        }
        .uploader-section {
          padding: 20px;
          border-top: 1px solid #eee;
          background: #fcfcfc;
          text-align: center;
        }
        .mb-10 { margin-bottom: 10px; }
        .text-sub {
          color: #888;
        }
      `}</style>
    </div>
  )
}
