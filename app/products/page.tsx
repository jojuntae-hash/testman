'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getProducts, Product } from '@/lib/productsApi'
import BottomNav from '@/components/BottomNav'
import { ArrowLeft, Package, Edit2, Share2 } from 'lucide-react'

import AddProductModal from '@/components/AddProductModal'
import EditProductModal from '@/components/EditProductModal'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const loadProducts = async () => {
    setLoading(true)
    const data = await getProducts()
    setProducts(data)
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleShare = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation()
    try {
      const url = `${window.location.origin}/products/${productId}`
      await navigator.clipboard.writeText(url)
      alert('제품 페이지 링크가 복사되었습니다!')
    } catch (err) {
      alert('링크 복사에 실패했습니다.')
    }
  }

  const handleEdit = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation()
    setEditingProduct(product)
  }

  return (
    <div className="products-container">
      <header className="header">
        <button className="back-btn" onClick={() => router.back()}>
          <ArrowLeft size={24} />
        </button>
        <div className="title">
          <Package size={20} />
          <h1>제품 목록</h1>
        </div>
        <div className="placeholder" />
      </header>

      <main className="content">
        {loading ? (
          <div className="loading-state">제품 정보를 불러오는 중입니다...</div>
        ) : (
          <div className="product-grid">
            {products.map(product => (
              <div 
                key={product.id} 
                className="product-card"
                onClick={() => router.push(`/products/${product.id}`)}
              >
                <div className="product-info-wrapper">
                  <div className="product-info">
                    <h2 className="product-name">{product.name}</h2>
                    <p className="product-model">{product.model_name}</p>
                  </div>
                  <div className="product-actions">
                    <button className="card-action-btn" onClick={(e) => handleShare(e, product.id)}>
                      <Share2 size={18} />
                    </button>
                    <button className="card-action-btn" onClick={(e) => handleEdit(e, product)}>
                      <Edit2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* 앱 내에서 제품 직접 추가 버튼 */}
            <div className="product-card add-new-card" onClick={() => setIsAddModalOpen(true)}>
              <p>+ 제품 추가하기</p>
            </div>
          </div>
        )}
      </main>

      {/* 새 제품 등록 모달 */}
      <AddProductModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false)
          loadProducts()
        }}
      />

      {/* 제품 정보 수정 모달 */}
      <EditProductModal 
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        initialData={editingProduct}
        onSuccess={() => {
          setEditingProduct(null)
          loadProducts()
        }}
      />

      <style jsx>{`
        .product-info-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
        }
        .product-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .product-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .card-action-btn {
          background: none;
          border: none;
          color: #64748b;
          padding: 8px;
          cursor: pointer;
          border-radius: 8px;
          display: flex;
          transition: all 0.2s;
        }
        .card-action-btn:hover {
          background: #f1f5f9;
          color: #334155;
        }
        .products-container {
          min-height: 100vh;
          background: #f8fafc;
          padding-bottom: 80px; /* 네비게이션 여백 */
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: #fff;
          border-bottom: 1px solid #f1f5f9;
          position: sticky;
          top: 0;
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
        .title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
        }
        .title h1 {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }
        .placeholder {
          width: 32px;
        }
        .content {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        .loading-state {
          text-align: center;
          padding: 40px;
          color: #64748b;
          font-weight: 500;
        }
        .product-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .product-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          border: 1px solid #f1f5f9;
        }
        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .product-card:active {
          transform: translateY(0);
        }

        .product-name {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }
        .product-model {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
          font-family: monospace;
          background: #f1f5f9;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .add-new-card {
          border: 2px dashed #cbd5e1;
          background: transparent;
          box-shadow: none;
          align-items: center;
          justify-content: center;
          padding: 16px;
          color: #94a3b8;
          transition: all 0.2s;
          flex-direction: row;
        }
        .add-new-card:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #eff6ff;
        }
        .add-new-card p {
          font-size: 0.95rem;
          font-weight: 600;
          margin: 0;
        }
      `}</style>
    </div>
  )
}
