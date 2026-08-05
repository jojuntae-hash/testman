'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function QuotesPage() {
  const router = useRouter()
  const [iframeSrc, setIframeSrc] = useState('')

  useEffect(() => {
    setIframeSrc(`/quote-maker/index.html?v=${Date.now()}`)
  }, [])

  return (
    <div className="quotes-page">
      <div className="view-header">
        <button className="back-btn" onClick={() => router.back()}>
          <ChevronLeft size={24} />
        </button>
        <div className="header-text">
          <h1>견적서 작성</h1>
          <p>고객별 렌탈 견적서 생성 및 관리</p>
        </div>
      </div>

      <div className="iframe-container">
        {iframeSrc && (
          <iframe 
            src={iframeSrc} 
            title="견적서 만들기"
            className="quote-iframe"
          />
        )}
      </div>

      <style jsx>{`
        .quotes-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #f8f9fa;
        }
        .view-header {
          height: 70px;
          display: flex;
          align-items: center;
          padding: 0 15px;
          border-bottom: 1px solid #eee;
          background: #fff;
          z-index: 100;
        }
        .back-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #333;
          padding: 5px;
        }
        .header-text {
          margin-left: 10px;
        }
        .header-text h1 {
          font-size: 1.1rem;
          font-weight: 800;
          margin: 0;
          color: #1a1a1a;
        }
        .header-text p {
          font-size: 0.7rem;
          color: #999;
          margin: 0;
        }
        .iframe-container {
          flex: 1;
          width: 100%;
          overflow: hidden;
        }
        .quote-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      `}</style>
    </div>
  )
}
