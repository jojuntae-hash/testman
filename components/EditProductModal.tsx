'use client'

import React, { useState, useRef, useEffect } from 'react'
import { uploadProductImage, updateProduct, Product } from '@/lib/productsApi'
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react'

interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedProduct: Product) => void
  initialData: Product | null
}

export default function EditProductModal({ isOpen, onClose, onSuccess, initialData }: EditProductModalProps) {
  const [name, setName] = useState('')
  const [modelName, setModelName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialData && isOpen) {
      setName(initialData.name)
      setModelName(initialData.model_name)
      setPreviewUrl(initialData.image_url)
      setImageFile(null)
      setError('')
    }
  }, [initialData, isOpen])

  if (!isOpen || !initialData) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setError('이미지 크기는 15MB 이하여야 합니다.')
        return
      }
      setImageFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !modelName.trim()) {
      setError('제품명과 모델명을 모두 입력해주세요.')
      return
    }

    try {
      setLoading(true)
      setError('')

      let imageUrl = initialData.image_url

      // 이미지를 새로 첨부한 경우에만 업로드 진행
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile)
      }

      // DB 업데이트
      const updated = await updateProduct(initialData.id, {
        name,
        model_name: modelName,
        image_url: imageUrl,
      })

      onSuccess(updated)
    } catch (err: any) {
      setError(err.message || '수정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <header className="modal-header">
          <h2>제품 정보 수정</h2>
          <button onClick={onClose} className="close-btn" disabled={loading}>
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>제품명</label>
            <input 
              type="text" 
              placeholder="예: 아이콘 얼음정수기" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>모델명</label>
            <input 
              type="text" 
              placeholder="예: CHPI-7400N" 
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>상세 이미지 변경 (선택)</label>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={loading}
            />
            
            <div 
              className={`upload-area ${previewUrl ? 'has-preview' : ''}`}
              onClick={() => !loading && fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="preview-container">
                  <img src={previewUrl} alt="Preview" />
                  <div className="upload-overlay">
                    <Upload size={24} />
                    <span>새 이미지로 변경</span>
                  </div>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <ImageIcon size={32} />
                  <span>터치하여 이미지 선택</span>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="cancel-btn" disabled={loading}>
              취소
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  저장 중...
                </>
              ) : (
                '수정 완료'
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
        }
        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
        }
        .close-btn:hover {
          background: #f1f5f9;
        }
        .modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #334155;
        }
        .form-group input[type="text"] {
          padding: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        .form-group input[type="text"]:focus {
          outline: none;
          border-color: #3b82f6;
        }
        .upload-area {
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
          background: #f8fafc;
        }
        .upload-area:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }
        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: #94a3b8;
          gap: 12px;
        }
        .preview-container {
          position: relative;
          width: 100%;
          height: 200px;
        }
        .preview-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #fff;
        }
        .upload-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .preview-container:hover .upload-overlay {
          opacity: 1;
        }
        .error-message {
          padding: 12px;
          background: #fef2f2;
          color: #ef4444;
          border-radius: 8px;
          font-size: 0.9rem;
          text-align: center;
        }
        .modal-footer {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .cancel-btn {
          flex: 1;
          padding: 12px;
          background: #f1f5f9;
          color: #475569;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .submit-btn {
          flex: 2;
          padding: 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .submit-btn:disabled {
          background: #93c5fd;
          cursor: not-allowed;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
