"use client"
import React, { useState } from "react";

const SITE_NAMES = { cuckoo: "쿠쿠", coway: "코웨이", skmagic: "SK매직" } as const;
type SiteKey = keyof typeof SITE_NAMES;

export default function ImageSaver() {
  const [currentSite, setCurrentSite] = useState<SiteKey>("cuckoo");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectedReviews, setSelectedReviews] = useState<Set<number>>(new Set());
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const resetPanels = () => {
    setError("");
    setCandidates([]);
    setResult(null);
    setSaveMessage("");
  };

  const doSearch = async () => {
    if (!query.trim()) return;
    resetPanels();
    setStatus(`${SITE_NAMES[currentSite]}에서 '${query}' 검색 중...`);
    
    try {
      const res = await fetch(`/api/search-list?site=${currentSite}&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "검색에 실패했습니다.");

      const cands = data.candidates || [];
      if (cands.length === 0) {
        throw new Error(`'${query}'에 대한 검색 결과가 없어요.`);
      } else if (cands.length === 1) {
        await loadProduct(cands[0]);
      } else {
        setCandidates(cands);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStatus("");
    }
  };

  const loadProduct = async (candidate: any) => {
    resetPanels();
    setStatus(`'${candidate.name || candidate.model || candidate.ref}' 정보를 가져오는 중...`);

    try {
      const params = new URLSearchParams({ site: currentSite, ref: candidate.ref });
      if (candidate.name) params.set("name", candidate.name);
      if (candidate.model) params.set("model", candidate.model);
      const res = await fetch(`/api/product?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "상품 정보를 가져오지 못했어요.");
      
      setResult(data);
      setSelectedProducts(new Set((data.productImages || []).map((_:any, i:number) => i)));
      setSelectedReviews(new Set((data.reviewImages || []).map((_:any, i:number) => i)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStatus("");
    }
  };

  const proxied = (url: string) => `/api/image-proxy?site=${encodeURIComponent(currentSite)}&url=${encodeURIComponent(url)}`;

  const toggleSelection = (set: Set<number>, setFn: (v: Set<number>) => void, index: number) => {
    const newSet = new Set(set);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setFn(newSet);
  };

  const setAll = (items: any[], setFn: (v: Set<number>) => void, select: boolean) => {
    if (select) setFn(new Set(items.map((_, i) => i)));
    else setFn(new Set());
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);
    setSaveMessage("zip 만드는 중...");

    const chosenProducts = (result.productImages || []).filter((_:any, i:number) => selectedProducts.has(i));
    const chosenReviews = (result.reviewImages || []).filter((_:any, i:number) => selectedReviews.has(i));

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: result.site,
          model: result.model,
          productImages: chosenProducts,
          reviewImages: chosenReviews,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      const savedCount = res.headers.get("X-Saved-Count") || "?";
      const failedCount = Number(res.headers.get("X-Failed-Count") || "0");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `${result.site}_${result.model}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSaveMessage(`zip 다운로드 완료! (${savedCount}장)` + (failedCount ? `\n실패 ${failedCount}장` : ""));
    } catch (e: any) {
      setSaveMessage("오류: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="image-saver-wrap">
      <div className="site-tabs">
        {Object.entries(SITE_NAMES).map(([key, name]) => (
          <button 
            key={key} 
            className={`site-tab ${currentSite === key ? "active " + key : ""}`}
            onClick={() => setCurrentSite(key as SiteKey)}
          >
            <span className="dot"></span>{name}
          </button>
        ))}
      </div>

      <div className="search-row">
        <input 
          value={query} 
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          placeholder="모델명 또는 상품명을 입력하세요" 
        />
        <button onClick={doSearch} disabled={!!status}>검색</button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {status && <div className="status-box"><div className="spinner"></div>{status}</div>}

      {candidates.length > 0 && (
        <div className="candidates">
          <div className="section-title">
            <h3>검색 결과에서 상품을 선택하세요</h3>
            <span>{candidates.length}건</span>
          </div>
          <div className="candidate-grid">
            {candidates.map((c, i) => (
              <div key={i} className="candidate-item" onClick={() => loadProduct(c)}>
                {c.thumbnail && <img src={proxied(c.thumbnail)} alt="thumb" loading="lazy" onError={e => (e.currentTarget.style.display="none")} />}
                <div className="c-name">{c.name || "(이름 없음)"}</div>
                <div className="c-model">{c.model || ""}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="result">
          <div className="product-card">
            <div className="product-info">
              <span className="badge">{result.siteName}</span>
              <h2>{result.productName || "(상품명 없음)"}</h2>
              <div className="model">모델명: {result.model}</div>
              <a href={result.productUrl} target="_blank" rel="noopener noreferrer">사이트에서 보기 →</a>
            </div>
          </div>

          <div className="section-title">
            <h3>제품 사진</h3>
            <div className="meta">
              <div className="select-all-btns">
                <button onClick={() => setAll(result.productImages || [], setSelectedProducts, true)}>전체선택</button>
                <button onClick={() => setAll(result.productImages || [], setSelectedProducts, false)}>전체해제</button>
              </div>
              <span className="count-text">{result.productImages?.length || 0}장 (클릭해서 선택/해제)</span>
            </div>
          </div>
          {!result.productImages?.length && <div className="no-review">제품 사진을 찾지 못했어요.</div>}
          <div className="photo-grid">
            {(result.productImages || []).map((url:string, i:number) => (
              <div 
                key={i} 
                className={`photo-item ${selectedProducts.has(i) ? "selected" : ""}`}
                onClick={() => toggleSelection(selectedProducts, setSelectedProducts, i)}
              >
                <img src={proxied(url)} alt="product" loading="lazy" />
                <div className="check">✓</div>
              </div>
            ))}
          </div>

          <div className="section-title">
            <h3>후기 사진</h3>
            <div className="meta">
              <div className="select-all-btns">
                <button onClick={() => setAll(result.reviewImages || [], setSelectedReviews, true)}>전체선택</button>
                <button onClick={() => setAll(result.reviewImages || [], setSelectedReviews, false)}>전체해제</button>
              </div>
              <span className="count-text">{result.reviewImages?.length || 0}장 (클릭해서 선택/해제)</span>
            </div>
          </div>
          {!result.reviewImages?.length && <div className="no-review">이 상품에서는 사진 후기를 찾지 못했어요.</div>}
          <div className="photo-grid">
            {(result.reviewImages || []).map((url:string, i:number) => (
              <div 
                key={i} 
                className={`photo-item ${selectedReviews.has(i) ? "selected" : ""}`}
                onClick={() => toggleSelection(selectedReviews, setSelectedReviews, i)}
              >
                <img src={proxied(url)} alt="review" loading="lazy" />
                <div className="check">✓</div>
              </div>
            ))}
          </div>

          <div className="actions">
            <button className="save-btn" onClick={handleSave} disabled={isSaving}>
              선택한 사진 zip으로 다운로드
            </button>
          </div>
          {saveMessage && <div className="save-result">{saveMessage}</div>}
        </div>
      )}

      <style jsx>{`
        .image-saver-wrap { width: 100%; color: #1e293b; font-family: inherit; }
        .site-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
        .site-tab { border: 1px solid #cbd5e1; background: #fff; color: #64748b; padding: 8px 16px; border-radius: 999px; font-size: 13.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.15s; }
        .site-tab .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: 0.5; }
        .site-tab:hover { border-color: #94a3b8; color: #475569; }
        .site-tab.active { color: #fff; border-color: transparent; }
        .site-tab.active .dot { opacity: 1; background: #fff; }
        .site-tab.active.cuckoo { background: #ef4444; }
        .site-tab.active.coway { background: #3b82f6; }
        .site-tab.active.skmagic { background: #ef4444; }
        .search-row { display: flex; gap: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin-bottom: 24px; }
        .search-row input { flex: 1; border: none; outline: none; font-size: 14.5px; padding: 8px 12px; background: transparent; }
        .search-row button { border: none; background: #3b82f6; color: #fff; font-weight: 600; font-size: 13.5px; padding: 0 20px; border-radius: 8px; cursor: pointer; }
        .search-row button:disabled { opacity: 0.5; cursor: default; }
        .error-box { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 12px 16px; border-radius: 8px; font-size: 13.5px; margin-bottom: 24px; }
        .status-box { text-align: center; color: #64748b; font-size: 13.5px; padding: 40px 0; }
        .spinner { width: 22px; height: 22px; border: 2.5px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; margin: 0 auto 12px; animation: spin .7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 10px; flex-wrap: wrap; }
        .section-title h3 { font-size: 15px; margin: 0; font-weight: 700; color: #1e293b; }
        .section-title .meta { display: flex; align-items: center; gap: 10px; margin-left: auto; }
        .count-text { font-size: 12px; color: #64748b; }
        .candidate-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .candidate-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; cursor: pointer; transition: 0.12s; }
        .candidate-item:hover { border-color: #3b82f6; }
        .candidate-item img { width: 100%; aspect-ratio: 1; object-fit: contain; background: #f8fafc; border-radius: 8px; margin-bottom: 10px; }
        .candidate-item .c-name { font-size: 12.5px; font-weight: 700; line-height: 1.4; word-break: keep-all; margin-bottom: 4px; color: #334155; }
        .candidate-item .c-model { font-size: 11.5px; color: #64748b; }
        .product-card { display: flex; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
        .badge { display: inline-block; font-size: 11.5px; font-weight: 700; color: #3b82f6; background: #eff6ff; padding: 3px 9px; border-radius: 999px; margin-bottom: 8px; }
        .product-card h2 { font-size: 15.5px; margin: 0 0 6px; line-height: 1.4; color: #1e293b; }
        .product-card .model { font-size: 12.5px; color: #64748b; margin-bottom: 6px; }
        .product-card a { font-size: 12.5px; color: #3b82f6; text-decoration: none; }
        .select-all-btns { display: flex; gap: 6px; }
        .select-all-btns button { border: 1px solid #e2e8f0; background: #fff; color: #64748b; font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 999px; cursor: pointer; }
        .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; margin-bottom: 24px; }
        .photo-item { position: relative; border-radius: 10px; overflow: hidden; border: 2px solid transparent; cursor: pointer; aspect-ratio: 1; background: #f1f5f9; }
        .photo-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .photo-item.selected { border-color: #3b82f6; }
        .photo-item .check { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: 50%; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; }
        .photo-item.selected .check { background: #3b82f6; }
        .no-review { color: #64748b; font-size: 13px; padding: 20px 0; text-align: center; border: 1px dashed #e2e8f0; border-radius: 10px; margin-bottom: 24px; background: #f8fafc; }
        .actions { display: flex; justify-content: center; margin-top: 10px; }
        .save-btn { border: none; background: #1e293b; color: #fff; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; cursor: pointer; }
        .save-btn:disabled { opacity: 0.5; }
        .save-result { text-align: center; font-size: 13px; color: #64748b; margin-top: 14px; white-space: pre-line; }
      `}</style>
    </div>
  );
}
