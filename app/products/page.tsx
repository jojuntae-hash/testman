'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getProducts, Product, updateProductOrders } from '@/lib/productsApi'
import BottomNav from '@/components/BottomNav'
import { ArrowLeft, Package, Edit2, Share2, ArrowUp, ArrowDown, Save, X } from 'lucide-react'

import AddProductModal from '@/components/AddProductModal'
import EditProductModal from '@/components/EditProductModal'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  // Category & Order states
  const [activeCategory, setActiveCategory] = useState<string>('전체')
  const [isEditOrderMode, setIsEditOrderMode] = useState(false)
  const [orderedProducts, setOrderedProducts] = useState<Product[]>([])

  const loadProducts = async () => {
    setLoading(true)
    const data = await getProducts()
    setProducts(data)
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  // Sync orderedProducts when products or category changes
  useEffect(() => {
    if (activeCategory === '전체') {
      setOrderedProducts([...products])
    } else {
      setOrderedProducts(products.filter(p => (p.category || '미분류') === activeCategory))
    }
  }, [products, activeCategory])

  const categories = ['전체', ...Array.from(new Set(products.map(p => p.category || '미분류')))]

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

  const moveUp = (index: number) => {
    if (index === 0) return
    const newItems = [...orderedProducts]
    const temp = newItems[index - 1]
    newItems[index - 1] = newItems[index]
    newItems[index] = temp
    setOrderedProducts(newItems)
  }

  const moveDown = (index: number) => {
    if (index === orderedProducts.length - 1) return
    const newItems = [...orderedProducts]
    const temp = newItems[index + 1]
    newItems[index + 1] = newItems[index]
    newItems[index] = temp
    setOrderedProducts(newItems)
  }

  const handleSaveOrder = async () => {
    const updates = orderedProducts.map((p, index) => ({
      id: p.id,
      category: p.category,
      order_index: index
    }))
    const success = await updateProductOrders(updates)
    if (success) {
      alert('순서가 저장되었습니다.')
      setIsEditOrderMode(false)
      loadProducts() // reload to get new global order
    } else {
      alert('순서 저장에 실패했습니다.')
    }
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
        <div className="category-header-area">
          <div className="category-tabs">
            <div className="tabs-scroll">
              {categories.map(cat => (
                <button 
                  key={cat} 
                  className={`tab-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => { setActiveCategory(cat); setIsEditOrderMode(false); }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="action-bar-right">
            {!isEditOrderMode ? (
              <button className="edit-order-btn" onClick={() => setIsEditOrderMode(true)}>
                <Edit2 size={14} /> 순서 변경
              </button>
            ) : (
              <div className="edit-mode-actions">
                <button className="cancel-order-btn" onClick={() => { setIsEditOrderMode(false); setOrderedProducts(products.filter(p => activeCategory === '전체' ? true : (p.category || '미분류') === activeCategory)); }}>
                  <X size={14} />
                </button>
                <button className="save-order-btn" onClick={handleSaveOrder}>
                  <Save size={14} /> 저장
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">제품 정보를 불러오는 중입니다...</div>
        ) : (
          <div className="product-grid">
            {orderedProducts.map((product, index) => (
              <div 
                key={product.id} 
                className={`product-card ${isEditOrderMode ? 'edit-mode' : ''}`}
                onClick={() => !isEditOrderMode && router.push(`/products/${product.id}`)}
              >
                <div className="product-info-wrapper">
                  <div className="product-info-compact">
                    <span className="product-category-badge">{product.category || '미분류'}</span>
                    <h2 className="product-name-compact">
                      {product.name} <span className="product-model-inline">{product.model_name}</span>
                    </h2>
                  </div>
                  
                  {isEditOrderMode ? (
                    <div className="order-actions">
                      <button className="order-btn" onClick={(e) => { e.stopPropagation(); moveUp(index); }} disabled={index === 0}>
                        <ArrowUp size={20} />
                      </button>
                      <button className="order-btn" onClick={(e) => { e.stopPropagation(); moveDown(index); }} disabled={index === orderedProducts.length - 1}>
                        <ArrowDown size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="product-actions">
                      <button className="card-action-btn" onClick={(e) => handleShare(e, product.id)}>
                        <Share2 size={18} />
                      </button>
                      <button className="card-action-btn" onClick={(e) => handleEdit(e, product)}>
                        <Edit2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {!isEditOrderMode && (
              <div className="product-card add-new-card" onClick={() => setIsAddModalOpen(true)}>
                <p>+ 제품 추가하기</p>
              </div>
            )}
          </div>
        )}
      </main>

      <AddProductModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false)
          loadProducts()
        }}
      />

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
        .category-header-area {
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          gap: 10px;
        }
        .category-tabs {
          flex: 1;
          min-width: 0; /* allows scrolling */
        }
        .tabs-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .tabs-scroll::-webkit-scrollbar { display: none; }
        .tab-btn {
          padding: 6px 14px;
          border-radius: 20px;
          background: #f1f5f9;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 700;
          white-space: nowrap;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: #eff6ff;
          color: #3b82f6;
          border-color: #bfdbfe;
        }
        .action-bar-right {
          flex-shrink: 0;
        }
        .edit-order-btn, .cancel-order-btn, .save-order-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        .edit-order-btn { background: #fff; border: 1px solid #cbd5e1; color: #475569; }
        .edit-mode-actions { display: flex; gap: 6px; }
        .cancel-order-btn { background: #f1f5f9; border: 1px solid #e2e8f0; color: #64748b; padding: 6px 8px; }
        .save-order-btn { background: #3b82f6; border: 1px solid #3b82f6; color: #fff; }
        
        .product-card.edit-mode {
          border: 2px dashed #cbd5e1;
          cursor: default;
        }
        .order-actions {
          display: flex;
          gap: 8px;
        }
        .order-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          cursor: pointer;
        }
        .order-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .order-btn:active:not(:disabled) { background: #e2e8f0; }
        
        .product-info-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
        }
        .product-info-compact {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 0;
          margin-right: 10px;
          flex-wrap: wrap;
        }
        .product-name-compact {
          font-size: 0.95rem;
          font-weight: 700;
          color: #334155;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .product-category-badge {
          font-size: 0.6rem;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          color: #64748b;
          font-weight: 600;
          align-self: center;
        }
        .product-model-inline {
          font-size: 0.7rem;
          font-weight: 500;
          color: #94a3b8;
          background: #f8fafc;
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .product-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .card-action-btn {
          background: none;
          border: none;
          color: #94a3b8;
          padding: 6px;
          cursor: pointer;
          border-radius: 6px;
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
          padding-bottom: 80px;
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
          z-index: 20;
          height: 60px;
        }
        .back-btn {
          background: none;
          border: none;
          color: #334155;
          cursor: pointer;
          padding: 4px;
          display: flex;
          margin-left: -8px;
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
          padding: 12px 16px;
          gap: 8px;
        }
        .product-card {
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
          border: 1px solid #f1f5f9;
        }
        .product-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 6px -2px rgba(0, 0, 0, 0.05);
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
          border: 1.5px dashed #cbd5e1;
          background: transparent;
          box-shadow: none;
          align-items: center;
          justify-content: center;
          padding: 12px;
          color: #94a3b8;
          transition: all 0.2s;
          flex-direction: row;
          border-radius: 10px;
        }
        .add-new-card:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #eff6ff;
        }
        .add-new-card p {
          font-size: 0.85rem;
          font-weight: 500;
          margin: 0;
        }
      `}</style>
    </div>
  )
}
