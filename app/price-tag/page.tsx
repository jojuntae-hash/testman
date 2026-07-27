"use client";

import React, { useState } from 'react';
import { Download, Upload, Image as ImageIcon, Settings, Wrench } from 'lucide-react';
import styles from './price-tag.module.css';

export default function PriceTagPage() {
  const [productName, setProductName] = useState('제로 100 슬림 얼음정수기');
  const [modelName, setModelName] = useState('CP-AHS100H');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Managed rental prices
  const [managedPrices, setManagedPrices] = useState({
    new: { m36: '53,900', m60: '50,900', m72: '51,900' },
    package: { m36: '46,900', m60: '44,900', m72: '44,900' },
    rerental: { m36: '44,900', m60: '42,900', m72: '42,900' }
  });

  // Self rental prices
  const [selfPrices, setSelfPrices] = useState({
    new: { m36: '50,900', m60: '48,900', m72: '48,900' },
    package: { m36: '44,900', m60: '42,900', m72: '42,900' },
    rerental: { m36: '42,900', m60: '40,900', m72: '40,900' }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    alert("PPTX 다운로드 기능은 라이브러리 연동 후 활성화될 예정입니다.");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>P</div>
          <h1>쿠쿠 제품 가격표 생성기</h1>
          <p className={styles.subtitle}>소장하신 제품 이미지와 가격 정보를 합쳐 출력/코팅용 PPTX(A5가로형) 파일을 직접 만들어 드립니다.</p>
        </div>
        <button className={styles.downloadBtn} onClick={handleDownload}>
          <Download size={18} />
          파워포인트 (.pptx) 다운로드하기
        </button>
      </div>

      <div className={styles.mainContent}>
        {/* Left Column: Settings */}
        <div className={styles.settingsColumn}>
          {/* Section 1 */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <Settings size={20} />
              1. 제품 및 이미지 설정
            </h2>
            
            <div className={styles.formGroup}>
              <label>제품명 (정수기 명칭)</label>
              <input 
                type="text" 
                value={productName} 
                onChange={(e) => setProductName(e.target.value)} 
                className={styles.input}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>모델명 (세부 스펙)</label>
              <input 
                type="text" 
                value={modelName} 
                onChange={(e) => setModelName(e.target.value)} 
                className={styles.input}
              />
            </div>

            <div className={styles.imageUpload}>
              <ImageIcon size={32} color="#ccc" />
              <p>현장용 제품 이미지 파일 등록</p>
              <span className={styles.uploadSub}>가지고 계신 사진 파일을 등록해 주세요.</span>
              <label className={styles.uploadBtn}>
                이미지 파일 찾아보기
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
          </div>

          {/* Section 2 */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <Settings size={20} />
              2. 렌탈 가격 커스터마이징
            </h2>
            
            {/* Managed Prices */}
            <div className={styles.priceSection}>
              <h3 className={styles.priceSectionTitle}>■ 관리형 렌탈 가격 (36개월 / 60개월 / 72개월)</h3>
              <div className={styles.priceGrid}>
                <div className={styles.priceCol}>
                  <label>신규</label>
                  <input type="text" value={managedPrices.new.m36} onChange={(e) => setManagedPrices({...managedPrices, new: {...managedPrices.new, m36: e.target.value}})} className={styles.input} />
                  <input type="text" value={managedPrices.new.m60} onChange={(e) => setManagedPrices({...managedPrices, new: {...managedPrices.new, m60: e.target.value}})} className={`${styles.input} ${styles.blueText}`} />
                  <input type="text" value={managedPrices.new.m72} onChange={(e) => setManagedPrices({...managedPrices, new: {...managedPrices.new, m72: e.target.value}})} className={`${styles.input} ${styles.goldText}`} />
                </div>
                <div className={styles.priceCol}>
                  <label>패키지</label>
                  <input type="text" value={managedPrices.package.m36} onChange={(e) => setManagedPrices({...managedPrices, package: {...managedPrices.package, m36: e.target.value}})} className={styles.input} />
                  <input type="text" value={managedPrices.package.m60} onChange={(e) => setManagedPrices({...managedPrices, package: {...managedPrices.package, m60: e.target.value}})} className={`${styles.input} ${styles.blueText}`} />
                  <input type="text" value={managedPrices.package.m72} onChange={(e) => setManagedPrices({...managedPrices, package: {...managedPrices.package, m72: e.target.value}})} className={`${styles.input} ${styles.goldText}`} />
                </div>
                <div className={styles.priceCol}>
                  <label>재렌탈</label>
                  <input type="text" value={managedPrices.rerental.m36} onChange={(e) => setManagedPrices({...managedPrices, rerental: {...managedPrices.rerental, m36: e.target.value}})} className={styles.input} />
                  <input type="text" value={managedPrices.rerental.m60} onChange={(e) => setManagedPrices({...managedPrices, rerental: {...managedPrices.rerental, m60: e.target.value}})} className={`${styles.input} ${styles.blueText}`} />
                  <input type="text" value={managedPrices.rerental.m72} onChange={(e) => setManagedPrices({...managedPrices, rerental: {...managedPrices.rerental, m72: e.target.value}})} className={`${styles.input} ${styles.goldText}`} />
                </div>
              </div>
            </div>

            {/* Self Prices */}
            <div className={styles.priceSection} style={{ marginTop: '20px' }}>
              <h3 className={styles.priceSectionTitle}>■ 셀프형 렌탈 가격 (36개월 / 60개월 / 72개월)</h3>
              <div className={styles.priceGrid}>
                <div className={styles.priceCol}>
                  <label>신규</label>
                  <input type="text" value={selfPrices.new.m36} onChange={(e) => setSelfPrices({...selfPrices, new: {...selfPrices.new, m36: e.target.value}})} className={styles.input} />
                  <input type="text" value={selfPrices.new.m60} onChange={(e) => setSelfPrices({...selfPrices, new: {...selfPrices.new, m60: e.target.value}})} className={`${styles.input} ${styles.blueText}`} />
                  <input type="text" value={selfPrices.new.m72} onChange={(e) => setSelfPrices({...selfPrices, new: {...selfPrices.new, m72: e.target.value}})} className={`${styles.input} ${styles.goldText}`} />
                </div>
                <div className={styles.priceCol}>
                  <label>패키지</label>
                  <input type="text" value={selfPrices.package.m36} onChange={(e) => setSelfPrices({...selfPrices, package: {...selfPrices.package, m36: e.target.value}})} className={styles.input} />
                  <input type="text" value={selfPrices.package.m60} onChange={(e) => setSelfPrices({...selfPrices, package: {...selfPrices.package, m60: e.target.value}})} className={`${styles.input} ${styles.blueText}`} />
                  <input type="text" value={selfPrices.package.m72} onChange={(e) => setSelfPrices({...selfPrices, package: {...selfPrices.package, m72: e.target.value}})} className={`${styles.input} ${styles.goldText}`} />
                </div>
                <div className={styles.priceCol}>
                  <label>재렌탈</label>
                  <input type="text" value={selfPrices.rerental.m36} onChange={(e) => setSelfPrices({...selfPrices, rerental: {...selfPrices.rerental, m36: e.target.value}})} className={styles.input} />
                  <input type="text" value={selfPrices.rerental.m60} onChange={(e) => setSelfPrices({...selfPrices, rerental: {...selfPrices.rerental, m60: e.target.value}})} className={`${styles.input} ${styles.blueText}`} />
                  <input type="text" value={selfPrices.rerental.m72} onChange={(e) => setSelfPrices({...selfPrices, rerental: {...selfPrices.rerental, m72: e.target.value}})} className={`${styles.input} ${styles.goldText}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className={styles.previewColumn}>
          <div className={styles.previewHeader}>
            <Settings size={16} /> 코팅 출력용 실시간 슬라이드 디자인 프리뷰 (A5 규격)
          </div>
          <div className={styles.previewBoard}>
            <div className={styles.slideA5}>
              
              <div className={styles.slideHeader}>
                <div className={styles.slideTitleBox}>
                  <h2 className={styles.slideTitle}>{productName || '제품명'}</h2>
                  <p className={styles.slideSubtitle}>CUCKOO PREMIUM | {modelName}</p>
                </div>
                <div className={styles.slideTag}>Slide 2: Price Sheet</div>
              </div>

              <div className={styles.slideContent}>
                <div className={styles.slideLeft}>
                  <div className={styles.slideImagePlaceholder}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="제품 이미지" className={styles.slideImg} />
                    ) : (
                      <div className={styles.noImgText}>이미지를<br/>등록해주세요</div>
                    )}
                  </div>
                  <div className={styles.slideSpecs}>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>규격</span>
                      <span className={styles.specValue}>가로 23cm 슬림</span>
                    </div>
                    <div className={styles.specRow}>
                      <span className={styles.specLabel}>기능</span>
                      <span className={styles.specValue}>100°C 끓는물 제빙</span>
                    </div>
                  </div>
                </div>

                <div className={styles.slideRight}>
                  {/* Managed Table */}
                  <div className={styles.tableBox}>
                    <div className={styles.tableTitle}>
                      <span className={styles.iconManager}>👨‍💼</span> 관리형 요금표
                      <span className={styles.tableSub}>4개월 주기 케어 및 필터 교체</span>
                    </div>
                    <table className={styles.priceTable}>
                      <thead>
                        <tr>
                          <th>구분</th>
                          <th>36개월</th>
                          <th className={styles.thBlue}>60개월</th>
                          <th className={styles.thGold}>72개월</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>신규 가입</td>
                          <td>{managedPrices.new.m36}원</td>
                          <td className={styles.tdBlue}>{managedPrices.new.m60}원</td>
                          <td className={styles.tdGold}>{managedPrices.new.m72}원</td>
                        </tr>
                        <tr>
                          <td>결합/재렌탈</td>
                          <td>{managedPrices.rerental.m36}원</td>
                          <td className={styles.tdBlue}>{managedPrices.rerental.m60}원</td>
                          <td className={styles.tdGold}>{managedPrices.rerental.m72}원</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Self Table */}
                  <div className={styles.tableBox}>
                    <div className={styles.tableTitle}>
                      <Wrench size={16} /> 자가관리형(셀프) 요금표
                      <span className={styles.tableSub}>무료 자가관리 필터 배송</span>
                    </div>
                    <table className={styles.priceTable}>
                      <thead>
                        <tr>
                          <th>구분</th>
                          <th>36개월</th>
                          <th className={styles.thBlue}>60개월</th>
                          <th className={styles.thGold}>72개월</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>신규 가입</td>
                          <td>{selfPrices.new.m36}원</td>
                          <td className={styles.tdBlue}>{selfPrices.new.m60}원</td>
                          <td className={styles.tdGold}>{selfPrices.new.m72}원</td>
                        </tr>
                        <tr>
                          <td>결합/재렌탈</td>
                          <td>{selfPrices.rerental.m36}원</td>
                          <td className={styles.tdBlue}>{selfPrices.rerental.m60}원</td>
                          <td className={styles.tdGold}>{selfPrices.rerental.m72}원</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
