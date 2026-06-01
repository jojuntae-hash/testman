'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProductById, Product } from '@/lib/productsApi'

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProduct = async () => {
    const resolvedParams = await Promise.resolve(params)
    const data = await getProductById(resolvedParams.id)
    setProduct(data)
    setLoading(false)
  }

  useEffect(() => {
    loadProduct()
  }, [params])


  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>이미지를 불러오는 중입니다...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f8fafc;
            color: #64748b;
          }
          .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #3b82f6;
            animation: spin 1s ease infinite;
            margin-bottom: 16px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="error-container">
        <h2>제품을 찾을 수 없습니다.</h2>
        <style jsx>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
            background: #fff;
          }
          .back-btn-error {
            margin-top: 16px;
            padding: 10px 20px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="viewer-container">
      {/* 상단 헤더 (고객용 심플 뷰) */}
      <header className="viewer-header">
        <div className="title-group">
          <h1>
            {product.name}
            <span className="model-inline">{product.model_name}</span>
          </h1>
        </div>
      </header>

      {/* 이미지 뷰어 영역 (세로 스크롤) */}
      <main className="image-area">
        <img
          src={product.image_url}
          alt={product.name}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
      </main>

      <style jsx>{`
        .viewer-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #fff;
          overflow: hidden;
          position: relative;
        }
        .viewer-header {
          position: sticky;
          top: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: #fff;
          border-bottom: 1px solid #f1f5f9;
          z-index: 10;
        }
        .back-btn {
          background: none;
          border: none;
          color: #334155;
          cursor: pointer;
          padding: 4px;
          display: flex;
        }
        .header-left {
          display: flex;
          align-items: center;
          width: 40px;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .action-icon-btn {
          background: none;
          border: none;
          color: #334155;
          cursor: pointer;
          padding: 8px;
          display: flex;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .action-icon-btn:hover {
          background: #f1f5f9;
        }
        .title-group {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }
        .title-group h1 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .model-inline {
          font-size: 1.15rem;
          color: #64748b;
          font-weight: 500;
        }
        .placeholder {
          width: 32px;
        }
        .image-area {
          flex: 1;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          padding-bottom: 80px; /* 네비게이션 여백 고려 */
        }
      `}</style>
    </div>
  )
}
