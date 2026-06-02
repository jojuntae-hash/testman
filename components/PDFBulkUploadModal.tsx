import React, { useState, useRef } from 'react'
import { X, FileUp, Loader2, Save, Trash2, CheckCircle } from 'lucide-react'

// PDF.js 워커 설정
const initPdfJs = async () => {
  // @ts-ignore
  const pdfjsLib = await import('pdfjs-dist')
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
  }
  return pdfjsLib
}

interface PDFBulkUploadModalProps {
  onClose: () => void
  onAddBulk: (customers: any[]) => void
}

export default function PDFBulkUploadModal({ onClose, onAddBulk }: PDFBulkUploadModalProps) {
  const [isParsing, setIsParsing] = useState(false)
  const [extractedCustomers, setExtractedCustomers] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCustomerText = (segment: any) => {
    const text = segment.text || ''
    const items = segment.items || []
    const data: any = {}
    
    // 유틸 함수
    const extract = (regex: RegExp) => {
      const match = text.match(regex)
      return match ? match[1].trim() : ''
    }

    const formatDate = (dateStr: string) => {
      if (!dateStr) return ''
      const match = dateStr.match(/([0-9]{4})년\s*([0-9]{1,2})월\s*([0-9]{1,2})일/)
      if (match) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
      }
      return dateStr
    }

    data.고객번호 = extract(/고객번호\s*([0-9-]+)/)
    data.모델명 = extract(/모델명\s*([A-Za-z0-9-]+(?:\([^)]+\))?)/)
    
    const nameStr = extract(/고객명\/상호\s*([가-힣a-zA-Z0-9\s()]+?)\s+(?:사업자번호|전화번호|A\/S\s*점)/) || extract(/고객명\/상호\s*([가-힣a-zA-Z0-9]+)/)
    data.고객명_상호 = nameStr.replace(/사업자번호.*/, '').trim()

    data.계약일자 = formatDate(extract(/계약일자\s*([0-9]{4}년\s*[0-9]{1,2}월\s*[0-9]{1,2}일)/))
    data.계약만료일자 = formatDate(extract(/계약만료예정일\s*([0-9]{4}년\s*[0-9]{1,2}월\s*[0-9]{1,2}일)/))
    data.최종점검일 = formatDate(extract(/최종점검일\s*([0-9]{4}년\s*[0-9]{1,2}월\s*[0-9]{1,2}일)/))
    data.예약일자 = formatDate(extract(/예약일시\s*([0-9]{4}년\s*[0-9]{1,2}월\s*[0-9]{1,2}일)/))

    // 좌표(items)를 이용한 당월/최종 작업 분리
    const 당월Header = items.find((i: any) => i.str.replace(/\s+/g, '').includes('당월작업'))
    const 최종Header = items.find((i: any) => i.str.replace(/\s+/g, '').includes('최종작업내용') || i.str.replace(/\s+/g, '').includes('최종작업'))
    const 결제정보 = items.find((i: any) => i.str.replace(/\s+/g, '').includes('결제정보'))

    if (당월Header && 최종Header && 결제정보) {
      const yStart = 당월Header.y
      const yEnd = 결제정보.y
      
      // yStart(위) 와 yEnd(아래) 사이의 항목 추출 (PDF 좌표는 보통 위가 크므로 yEnd < y < yStart)
      const taskItems = items.filter((i: any) => 
        i.y < yStart - 5 && i.y > yEnd + 5 && 
        !i.str.replace(/\s+/g, '').includes('작업대상') // 행 제목 제거
      )
      
      // 두 헤더의 정확한 중간 지점을 X 좌표 경계선으로 사용
      const splitX = (당월Header.x + 최종Header.x) / 2
      
      const 당월Items = taskItems.filter((i: any) => i.x < splitX)
      const 최종Items = taskItems.filter((i: any) => i.x >= splitX)
      
      data.당월작업 = 당월Items.map((i: any) => i.str).join(' ').trim()
      data.최종작업내용 = 최종Items.map((i: any) => i.str).join(' ').trim()
    } else {
      // Fallback
      const tasksMatch = text.match(/당월작업\s*최종작업내용\s+([\s\S]{1,300}?)\s+(?:결제정보|예약일시|판매구분|\[\s*계약정보\s*\])/)
      if (tasksMatch) {
        let tSection = tasksMatch[1].trim().replace(/작업대상/g, '').replace(/\s{2,}/g, ' ')
        const tokens = tSection.split(' ')
        const mid = Math.ceil(tokens.length / 2)
        data.당월작업 = tokens.slice(0, mid).join(' ')
        data.최종작업내용 = tokens.slice(mid).join(' ')
      }
    }

    // 2. 계약정보
    data.계약자구분 = extract(/계약자\s*구분\s*([가-힣]+)/)
    data.사업자번호 = extract(/사업자번호\s*([0-9-]*)\s*전화번호/) // 비어있을 수도 있음
    
    // 전화번호 파싱 (복잡함: 두 번 나옴. 처음은 계약정보, 뒤는 설치정보)
    const phoneMatches = [...text.matchAll(/전화번호\s*([0-9-]+)/g)]
    data.전화번호 = phoneMatches.length > 0 ? phoneMatches[0][1] : ''
    data.설치전화번호 = phoneMatches.length > 1 ? phoneMatches[1][1] : data.전화번호

    const mobileMatches = [...text.matchAll(/핸드폰번호\s*([0-9-]+)/g)]
    data.핸드폰번호 = mobileMatches.length > 0 ? mobileMatches[0][1] : ''
    data.설치핸드폰번호 = mobileMatches.length > 1 ? mobileMatches[1][1] : data.핸드폰번호

    const addressMatches = [...text.matchAll(/주소\s+([\s\S]{5,100}?)(?=\s+접수|\s+A\/S|\s+설치|\s+점검|\s*\[|$)/g)]
    data.주소 = addressMatches.length > 0 ? addressMatches[0][1].trim() : ''
    data.설치주소 = addressMatches.length > 1 ? addressMatches[1][1].trim() : data.주소
    
    const explicitInstallAddr = text.match(/설치주소\s+([\s\S]{5,100}?)(?=\s+접수|\s+A\/S|\s+설치|\s+점검|\s*\[|$)/)
    if (explicitInstallAddr) data.설치주소 = explicitInstallAddr[1].trim()

    // 3. (이전) 설치정보
    data.설치처구분 = extract(/설치처구분\s*([가-힣]+)/)
    data.설치자명 = extract(/설치자명\s*([가-힣a-zA-Z0-9]+)/)
    data.설치구분 = extract(/설치구분\s*([가-힣]+)/)
    data.설치시특이사항 = extract(/설치시\s*특이사항\s+([\s\S]{1,200}?)(?=\s+자재|\s+설치\s*및|\s*\[|$)/)

    return data
  }

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    try {
      const pdfjsLib = await initPdfJs()
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      const allSegments = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1 })
        const midX = viewport.width / 2

        const content = await page.getTextContent()
        
        const leftItems: any[] = []
        const rightItems: any[] = []
        
        for (const item of content.items) {
          if (!item.transform) continue
          const x = item.transform[4] // X coordinate
          const y = item.transform[5] // Y coordinate
          
          const itemData = { str: item.str, x, y }
          if (x < midX) {
            leftItems.push(itemData)
          } else {
            rightItems.push(itemData)
          }
        }

        const buildTextObj = (items: any[]) => {
          const lines: { y: number, items: any[] }[] = []
          items.forEach(item => {
            const yGroup = Math.round(item.y / 5) * 5
            let line = lines.find(l => l.y === yGroup)
            if (!line) {
              line = { y: yGroup, items: [] }
              lines.push(line)
            }
            line.items.push(item)
          })
          lines.sort((a, b) => b.y - a.y)
          lines.forEach(line => line.items.sort((a, b) => a.x - b.x))
          
          const sortedItems = lines.flatMap(line => line.items)
          return {
            text: lines.map(line => line.items.map(i => i.str).join(' ')).join('\n'),
            items: sortedItems
          }
        }
        
        const leftObj = buildTextObj(leftItems)
        const rightObj = buildTextObj(rightItems)
        
        if (leftObj.text.length > 50) allSegments.push(leftObj)
        if (rightObj.text.length > 50) allSegments.push(rightObj)
      }

      console.log('Segments:', allSegments)
      
      const parsedCustomers = allSegments.map((segment, index) => {
        const data = parseCustomerText(segment)
        return {
          id: Date.now().toString() + index,
          status: '작업미완료',
          ...data
        }
      })

      // 고객명이나 번호가 정상적으로 추출된 데이터만 필터링
      const validCustomers = parsedCustomers.filter(c => c.고객명_상호 || c.고객번호)
      
      setExtractedCustomers(prev => [...prev, ...validCustomers])
      alert(`총 ${validCustomers.length}명의 고객 정보를 추출했습니다.`)
    } catch (error) {
      console.error('PDF Parse Error:', error)
      alert('PDF 파일에서 텍스트를 추출하는 데 실패했습니다.')
    } finally {
      setIsParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = (id: string) => {
    setExtractedCustomers(prev => prev.filter(c => c.id !== id))
  }

  const handleSaveBulk = () => {
    if (extractedCustomers.length === 0) {
      alert('추가할 고객 데이터가 없습니다.')
      return
    }
    onAddBulk(extractedCustomers)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>PDF로 고객 일괄 추가</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body">
          <div className="upload-section">
            <input 
              type="file" 
              accept="application/pdf" 
              ref={fileInputRef} 
              onChange={handlePDFUpload} 
              style={{ display: 'none' }} 
              id="pdf-bulk-upload"
              multiple
            />
            <label htmlFor="pdf-bulk-upload" className="upload-btn">
              {isParsing ? <Loader2 size={24} className="spin" /> : <FileUp size={24} />}
              <span>{isParsing ? 'PDF 분석 중...' : '정기 관리 확인서 PDF 업로드'}</span>
            </label>
            <p className="help-text">하나의 PDF에 여러 명의 확인서가 있어도 자동으로 분리하여 추출합니다.</p>
          </div>

          <div className="preview-section">
            <div className="preview-header">
              <h4>추출된 고객 목록 ({extractedCustomers.length}명)</h4>
              {extractedCustomers.length > 0 && (
                <button className="bulk-save-btn" onClick={handleSaveBulk}>
                  <Save size={16} /> 전체 저장하기
                </button>
              )}
            </div>

            {extractedCustomers.length === 0 ? (
              <div className="empty-preview">
                <CheckCircle size={32} color="#cbd5e1" />
                <p>업로드된 고객 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="customer-list">
                {extractedCustomers.map((c, i) => (
                  <div key={c.id} className="customer-card">
                    <div className="card-header">
                      <span className="badge">{i + 1}</span>
                      <strong>{c.고객명_상호 || '이름 없음'}</strong>
                      <span className="model">{c.모델명}</span>
                      <button className="del-btn" onClick={() => handleRemove(c.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="card-info">
                      <div><span>고객번호</span> {c.고객번호}</div>
                      <div><span>연락처</span> {c.핸드폰번호 || c.전화번호}</div>
                      <div className="full-width"><span>주소</span> {c.주소}</div>
                      <div><span>당월작업</span> {c.당월작업}</div>
                      <div><span>최종작업</span> {c.최종작업내용}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: #f8fafc;
          border-radius: 20px;
          width: 100%;
          max-width: 650px;
          height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .modal-header {
          padding: 20px 24px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
          color: #1e293b;
        }
        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          transition: 0.2s;
        }
        .close-btn:hover { color: #f43f5e; }
        
        .modal-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .upload-section {
          padding: 30px 24px;
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          border-bottom: 1px dashed #cbd5e1;
        }
        .upload-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #3b82f6;
          color: #fff;
          padding: 14px 28px;
          border-radius: 16px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }
        .upload-btn:hover { background: #2563eb; transform: translateY(-2px); }
        .help-text { font-size: 0.85rem; color: #64748b; margin: 12px 0 0 0; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .preview-section {
          flex: 1;
          padding: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .preview-header h4 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #334155; }
        .bulk-save-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #10b981;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.2s;
        }
        .bulk-save-btn:hover { background: #059669; }

        .empty-preview {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          background: #fff;
          border-radius: 16px;
          border: 1px dashed #e2e8f0;
        }
        .empty-preview p { margin-top: 12px; font-weight: 600; }

        .customer-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 8px;
        }
        .customer-list::-webkit-scrollbar { width: 6px; }
        .customer-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

        .customer-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.02);
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .badge { background: #3b82f6; color: white; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 0.8rem; font-weight: 800; }
        .card-header strong { font-size: 1.1rem; color: #1e293b; }
        .model { font-size: 0.8rem; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; color: #64748b; font-weight: 700; }
        .del-btn { margin-left: auto; background: #fee2e2; color: #ef4444; border: none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .del-btn:hover { background: #fecaca; }

        .card-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 0.85rem;
        }
        .card-info div { display: flex; gap: 8px; color: #334155; }
        .card-info .full-width { grid-column: 1 / -1; }
        .card-info span { color: #94a3b8; font-weight: 600; width: 60px; flex-shrink: 0; }
      `}</style>
    </div>
  )
}
