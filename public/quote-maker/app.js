// --- Supabase Sync Logic ---
async function loadFromSupabase() {
    try {
        const res = await fetch('/api/quotes');
        if (res.ok) {
            const data = await res.json();
            const list = data.map(row => row.data);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        }
    } catch (e) {
        console.error("Supabase load error:", e);
    }
}

async function saveToSupabase(record) {
    try {
        await fetch('/api/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
    } catch (e) {
        console.error("Supabase save error:", e);
    }
}

async function deleteFromSupabase(id) {
    try {
        await fetch('/api/quotes?id=' + id, { method: 'DELETE' });
    } catch (e) {
        console.error("Supabase delete error:", e);
    }
}
// ---------------------------

/**
 * 렌탈 견적서 생성기 - app.js
 * 코어 비즈니스 로직 및 LocalStorage 데이터 관리, 파일 변환(PDF/Excel)
 */

// 애플리케이션 상태 관리 객체
const state = {
    id: null, // 현재 열려있는 견적서 ID (신규 작성 시 null)
    logo: "", // 회사 로고 (Base64)
    docTitle: "렌탈 서비스 견적서",
    customer: "",
    date: "",
    expiry: "견적일로부터 30일",
    supplier: "",
    contact: "",
    notes: "1. 설치비 및 등록비 면제 조건입니다.\n2. 약정 기간 내 해지 시 위약금이 발생할 수 있습니다.\n3. 렌탈료는 부가가치세(VAT)가 포함된 금액입니다.",
    products: [] // 제품 객체 배열
};

// 로컬스토리지 키 정의
const STORAGE_KEY = "RENTAL_QUOTATIONS_LIST";

// DOM 로드 후 실행
document.addEventListener("DOMContentLoaded", async () => {
    await initApp();
    registerEventListeners();
});

/**
 * 앱 초기화 함수
 */
async function initApp() {
    await loadFromSupabase();
    // 오늘 날짜 기본값 설정
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    state.date = `${yyyy}-${mm}-${dd}`;
    document.getElementById("inputDate").value = state.date;

    // Lucide 아이콘 초기화
    lucide.createIcons();

    // 저장된 목록 렌더링
    renderSavedList();

    // 기본 제품 1개 추가하여 시작
    addNewProduct();
}

/**
 * 안전한 이벤트 리스너 등록 바인딩 유틸리티
 */
function bindEvent(id, eventType, handler) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(eventType, handler);
    } else {
        console.warn(`[이벤트 바인딩 방어] '${id}' 요소를 찾을 수 없어 이벤트 등록을 스킵했습니다.`);
    }
}

/**
 * 이벤트 리스너 등록
 */
function registerEventListeners() {
    // 로고 업로드 관련
    const logoUploader = document.getElementById("logoUploader");
    const logoInput = document.getElementById("logoInput");
    const btnRemoveLogo = document.getElementById("btnRemoveLogo");

    if (logoUploader && logoInput) {
        logoUploader.addEventListener("click", (e) => {
            if (e.target.closest("#btnRemoveLogo")) return;
            logoInput.click();
        });

        logoInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) handleLogoFile(file);
        });

        logoUploader.addEventListener("dragover", (e) => {
            e.preventDefault();
            logoUploader.classList.add("dragover");
        });

        logoUploader.addEventListener("dragleave", () => {
            logoUploader.classList.remove("dragover");
        });

        logoUploader.addEventListener("drop", (e) => {
            e.preventDefault();
            logoUploader.classList.remove("dragover");
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith("image/")) {
                handleLogoFile(file);
            }
        });
    }

    if (btnRemoveLogo) {
        btnRemoveLogo.addEventListener("click", removeLogo);
    }

    // 제품 추가 버튼
    bindEvent("btnAddProduct", "click", () => addNewProduct());

    // 기본 정보 입력 폼 동기화
    bindEvent("inputDocTitle", "input", (e) => { state.docTitle = e.target.value; });
    bindEvent("inputCustomer", "input", (e) => { state.customer = e.target.value; });
    bindEvent("inputDate", "input", (e) => { state.date = e.target.value; });
    bindEvent("inputExpiry", "input", (e) => { state.expiry = e.target.value; });
    bindEvent("inputSupplier", "input", (e) => { state.supplier = e.target.value; });
    bindEvent("inputContact", "input", (e) => { state.contact = e.target.value; });
    bindEvent("inputNotes", "input", (e) => { state.notes = e.target.value; });

    // 사이드바 제어
    bindEvent("btnOpenSidebar", "click", openSidebar);
    bindEvent("btnCloseSidebar", "click", closeSidebar);

    // 새 견적서 작성 버튼
    bindEvent("btnNewQuotation", "click", resetToNewQuotation);

    // 견적서 저장 버튼 (보관함 저장 및 data 폴더 파일 저장)
    bindEvent("btnSaveQuotation", "click", () => saveQuotation(true));
    bindEvent("btnSaveQuotationFile", "click", saveQuotationToFile);

    // 저장 폴더 지정 및 로고 저장 버튼
    bindEvent("btnSelectDataFolder", "click", selectDataFolder);
    bindEvent("btnSaveLogoFile", "click", saveLogoToFile);

    // 백업 및 복원 버튼
    bindEvent("btnExportJSON", "click", exportBackupJSON);
    bindEvent("btnImportJSON", "change", importBackupJSON);

    // 미리보기 모달 제어
    bindEvent("btnOpenPreview", "click", openPreviewModal);
    bindEvent("btnClosePreview", "click", closePreviewModal);

    const previewModal = document.getElementById("previewModal");
    if (previewModal) {
        previewModal.addEventListener("click", (e) => {
            if (e.target.id === "previewModal") closePreviewModal();
        });
    }

    // 출력 및 저장 버튼
    bindEvent("btnPrint", "click", () => window.print());
    bindEvent("btnSaveImage", "click", downloadImage);
    bindEvent("btnSavePDF", "click", downloadPDF);

    // 로고 관리 모달 연동
    const btnManageLogos = document.getElementById("btnManageLogos");
    const logoManagerModal = document.getElementById("logoManagerModal");
    const btnCloseLogoManager = document.getElementById("btnCloseLogoManager");
    const btnUploadLogo = document.getElementById("btnUploadLogo");

    if (btnManageLogos && logoManagerModal) {
        btnManageLogos.addEventListener("click", () => {
            logoManagerModal.classList.add("open");
            loadCompanyLogos();
        });
    }

    if (btnCloseLogoManager && logoManagerModal) {
        btnCloseLogoManager.addEventListener("click", () => {
            logoManagerModal.classList.remove("open");
        });
    }

    if (logoManagerModal) {
        logoManagerModal.addEventListener("click", (e) => {
            if (e.target === logoManagerModal) {
                logoManagerModal.classList.remove("open");
            }
        });
    }

    if (btnUploadLogo) {
        btnUploadLogo.addEventListener("click", uploadCompanyLogo);
    }
}

/* ==========================================================================
   로고 처리 관련 함수
   ========================================================================== */
function handleLogoFile(file) {
    // 용량 제한 체크 (로컬스토리지 용량 한계 고려하여 800KB 이하 권장)
    if (file.size > 800 * 1024) {
        alert("로고 이미지 파일 크기가 너무 큽니다. (800KB 이하 권장) 로컬 저장소 용량 한계로 인해 업로드가 제한될 수 있습니다.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        state.logo = e.target.result;
        renderLogoPreview();
    };
    reader.readAsDataURL(file);
}

function renderLogoPreview() {
    const previewContainer = document.getElementById("logoPreviewContainer");
    const placeholder = document.getElementById("logoPlaceholder");
    const previewImg = document.getElementById("logoPreview");
    const actionButtons = document.getElementById("logoActionButtons");

    if (state.logo) {
        previewImg.src = state.logo;
        previewContainer.style.display = "block";
        placeholder.style.display = "none";
        if (actionButtons) actionButtons.style.display = "block";
    } else {
        previewImg.src = "";
        previewContainer.style.display = "none";
        placeholder.style.display = "flex";
        if (actionButtons) actionButtons.style.display = "none";
    }
}

function removeLogo() {
    state.logo = "";
    document.getElementById("logoInput").value = "";
    renderLogoPreview();
}

/* ==========================================================================
   동적 제품 목록 관리 함수
   ========================================================================== */
/**
 * 신규 제품 카드 데이터 생성 및 UI 추가
 */
function addNewProduct(productData = null) {
    const id = productData ? productData.id : "prod_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    
    const newProduct = productData ? { ...productData } : {
        id: id,
        name: "",
        term: "36개월",
        quantity: 1,
        discount1: "",
        discount2: "",
        benefit1: "",
        benefit2: "",
        fee: 0,
        photo: "",
        link: ""
    };

    state.products.push(newProduct);
    renderProductCard(newProduct);
}

/**
 * 개별 제품 카드 DOM 생성 및 렌더링
 */
function renderProductCard(product) {
    const productList = document.getElementById("productList");

    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.id = product.id;
    card.id = `card_${product.id}`;

    // 제품 렌탈료 값 3자리 콤마 적용
    const formattedFee = product.fee > 0 ? formatNumber(product.fee) : "";

    card.innerHTML = `
        <div class="product-card-header">
            <span class="product-card-title"><i data-lucide="package-2"></i> <span class="prod-num-title">제품 정보</span></span>
            <div class="product-card-actions">
                <button type="button" class="btn-icon-only" onclick="cloneProduct('${product.id}')" title="제품 복사">
                    <i data-lucide="copy"></i>
                </button>
                <button type="button" class="btn-icon-only delete" onclick="deleteProduct('${product.id}')" title="제품 삭제">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
        <div class="product-grid">
            <!-- 사진 등록 영역 -->
            <div class="product-photo-uploader" onclick="triggerPhotoUpload('${product.id}')" id="photoUploader_${product.id}">
                <div class="photo-placeholder" id="photoPlaceholder_${product.id}" style="display: ${product.photo ? 'none' : 'block'};">
                    <i data-lucide="camera"></i>
                    <span>사진 추가</span>
                </div>
                <img class="product-photo-preview" id="photoPreview_${product.id}" src="${product.photo || ''}" alt="제품 사진 미리보기" style="display: ${product.photo ? 'block' : 'none'};">
                <button type="button" class="btn-remove-photo" id="btnRemovePhoto_${product.id}" onclick="removeProductPhoto(event, '${product.id}')" style="display: ${product.photo ? 'flex' : 'none'};" title="사진 삭제">
                    <i data-lucide="x"></i>
                </button>
                <input type="file" id="photoInput_${product.id}" accept="image/*" style="display: none;" onchange="handleProductPhoto(this, '${product.id}')">
            </div>
            <!-- 상세 입력 항목 -->
            <div class="product-fields">
                <div class="form-group col-span-full">
                    <label>제품명 *</label>
                    <input type="text" class="field-name" value="${escapeHtml(product.name)}" placeholder="제품명 브랜드 및 모델명을 입력하세요." oninput="updateProductState('${product.id}', 'name', this.value)">
                </div>
                <div class="form-group">
                    <div style="display: flex; gap: 10px;">
                        <div class="form-group" style="flex: 1;">
                            <label>약정기간</label>
                            <input type="text" class="field-term" value="${escapeHtml(product.term)}" placeholder="예: 36개월, 60개월, 무약정" oninput="updateProductState('${product.id}', 'term', this.value)">
                        </div>
                        <div class="form-group" style="width: 100px;">
                            <label>수량 (대)</label>
                            <input type="number" class="field-quantity" value="${product.quantity || 1}" min="1" oninput="handleQuantityInput(this, '${product.id}')" style="width: 100%;">
                        </div>
                    </div>
                </div>
                <div class="form-group rental-fee-group">
                    <label>월 렌탈료 * (원)</label>
                    <input type="text" class="field-fee" value="${formattedFee}" placeholder="0" oninput="handleFeeInput(this, '${product.id}')">
                </div>
                <div class="form-group">
                    <label>할인항목 1</label>
                    <input type="text" class="field-discount1" value="${escapeHtml(product.discount1)}" placeholder="예: 제휴카드 할인 최대 2만원" oninput="updateProductState('${product.id}', 'discount1', this.value)">
                </div>
                <div class="form-group">
                    <label>할인항목 2</label>
                    <input type="text" class="field-discount2" value="${escapeHtml(product.discount2)}" placeholder="예: 결합 할인 3,000원" oninput="updateProductState('${product.id}', 'discount2', this.value)">
                </div>
                <div class="form-group">
                    <label>추가혜택 1</label>
                    <input type="text" class="field-benefit1" value="${escapeHtml(product.benefit1)}" placeholder="예: 상품권 10만원 지급" oninput="updateProductState('${product.id}', 'benefit1', this.value)">
                </div>
                <div class="form-group">
                    <label>추가혜택 2</label>
                    <input type="text" class="field-benefit2" value="${escapeHtml(product.benefit2)}" placeholder="예: 초기 설치비 전액 지원" oninput="updateProductState('${product.id}', 'benefit2', this.value)">
                </div>
                <div class="form-group col-span-full">
                    <label>제품 설명 상세 링크 (URL)</label>
                    <input type="text" class="field-link" value="${escapeHtml(product.link)}" placeholder="https://..." oninput="updateProductState('${product.id}', 'link', this.value)">
                </div>
            </div>
        </div>
    `;

    productList.appendChild(card);
    updateProductNumbers();
    lucide.createIcons({ attrs: { class: 'lucide' } });
}

/**
 * 제품 카드 타이틀 일련번호 갱신
 */
function updateProductNumbers() {
    const cards = document.querySelectorAll(".product-card");
    cards.forEach((card, index) => {
        const titleSpan = card.querySelector(".prod-num-title");
        if (titleSpan) {
            titleSpan.textContent = `제품 정보 #${index + 1}`;
        }
    });
}

/**
 * 제품 상태값 실시간 동기화
 */
function updateProductState(id, field, value) {
    const product = state.products.find(p => p.id === id);
    if (product) {
        product[field] = value;
    }
}

/**
 * 렌탈료 전용 3자리 콤마 처리 및 상태값 저장
 */
function handleFeeInput(input, id) {
    // 숫자 이외의 문자 제거
    let val = input.value.replace(/[^0-9]/g, "");
    if (val === "") {
        updateProductState(id, "fee", 0);
        input.value = "";
        return;
    }

    const numericVal = parseInt(val, 10);
    updateProductState(id, "fee", numericVal);
    input.value = formatNumber(numericVal);
}

/**
 * 수량 전용 정수 처리 및 상태값 저장
 */
function handleQuantityInput(input, id) {
    let val = input.value.replace(/[^0-9]/g, "");
    if (val === "" || parseInt(val, 10) < 1) {
        val = "1";
    }
    const numericVal = parseInt(val, 10);
    updateProductState(id, "quantity", numericVal);
    input.value = numericVal;
}

/**
 * 제품 이미지 업로드 트리거
 */
function triggerPhotoUpload(id) {
    const fileInput = document.getElementById(`photoInput_${id}`);
    fileInput.click();
}

/**
 * 제품 이미지 로드 및 처리
 */
function handleProductPhoto(input, id) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
        alert("제품 이미지 크기가 너무 큽니다. (500KB 이하 권장) 최적의 성능을 위해 작은 이미지를 사용해 주세요.");
        // 파일 리셋
        input.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Str = e.target.result;
        updateProductState(id, "photo", base64Str);

        // UI 갱신
        const preview = document.getElementById(`photoPreview_${id}`);
        const placeholder = document.getElementById(`photoPlaceholder_${id}`);
        const btnRemove = document.getElementById(`btnRemovePhoto_${id}`);

        preview.src = base64Str;
        preview.style.display = "block";
        placeholder.style.display = "none";
        btnRemove.style.display = "flex";
    };
    reader.readAsDataURL(file);
}

/**
 * 제품 이미지 제거
 */
function removeProductPhoto(event, id) {
    event.stopPropagation(); // uploader div의 click 이벤트 전파 차단
    updateProductState(id, "photo", "");

    const preview = document.getElementById(`photoPreview_${id}`);
    const placeholder = document.getElementById(`photoPlaceholder_${id}`);
    const btnRemove = document.getElementById(`btnRemovePhoto_${id}`);
    const fileInput = document.getElementById(`photoInput_${id}`);

    preview.src = "";
    preview.style.display = "none";
    placeholder.style.display = "block";
    btnRemove.style.display = "none";
    fileInput.value = "";
}

/**
 * 제품 복사 기능
 */
window.cloneProduct = function(id) {
    const productToClone = state.products.find(p => p.id === id);
    if (!productToClone) return;

    const cloned = {
        ...productToClone,
        id: "prod_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
        name: productToClone.name ? `${productToClone.name} (복사본)` : ""
    };

    addNewProduct(cloned);
};

/**
 * 제품 삭제 기능
 */
window.deleteProduct = function(id) {
    if (state.products.length <= 1) {
        alert("최소 1개 이상의 제품이 견적서에 포함되어야 합니다.");
        return;
    }

    if (!confirm("선택한 제품 정보를 삭제하시겠습니까?")) return;

    // 상태에서 제거
    state.products = state.products.filter(p => p.id !== id);

    // DOM에서 삭제
    const card = document.getElementById(`card_${id}`);
    if (card) {
        card.remove();
    }
    updateProductNumbers();
};

/* ==========================================================================
   보관함 (LocalStorage) 로직
   ========================================================================== */
function openSidebar() {
    document.getElementById("sidebar").classList.add("open");
    document.querySelector(".app-container").classList.add("sidebar-open");
}

function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.querySelector(".app-container").classList.remove("sidebar-open");
}

/**
 * 로컬스토리지에 저장된 목록 가져오기
 */
function getSavedQuotations() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

/**
 * 저장된 목록 UI 렌더링
 */
function renderSavedList() {
    const list = getSavedQuotations();
    const savedListEl = document.getElementById("savedList");
    const savedCountEl = document.getElementById("savedCount");
    
    savedCountEl.textContent = list.length;
    savedListEl.innerHTML = "";

    if (list.length === 0) {
        savedListEl.innerHTML = '<li class="empty-list">저장된 견적서가 없습니다.</li>';
        return;
    }

    list.forEach(item => {
        const li = document.createElement("li");
        li.className = `saved-item ${state.id === item.id ? 'active' : ''}`;
        li.innerHTML = `
            <div class="saved-item-header" onclick="loadQuotation('${item.id}')">
                <span class="saved-item-title">${escapeHtml(item.docTitle)}</span>
            </div>
            <div onclick="loadQuotation('${item.id}')" style="display:flex; flex-direction:column; gap:2px;">
                <span class="saved-item-customer"><i data-lucide="user" style="width:12px;height:12px;display:inline;"></i> ${escapeHtml(item.customer) || '고객명 없음'}</span>
                <span class="saved-item-date"><i data-lucide="calendar" style="width:12px;height:12px;display:inline;"></i> ${item.date}</span>
            </div>
            <button type="button" class="btn-delete-saved" onclick="deleteQuotation(event, '${item.id}')" title="삭제">
                <i data-lucide="trash-2"></i>
            </button>
        `;
        savedListEl.appendChild(li);
    });
    lucide.createIcons({ attrs: { class: 'lucide' } });
}

/**
 * 현재 정보 저장 (브라우저 보관함)
 */
function saveQuotation(showAlert = true) {
    if (!state.customer.trim()) {
        if (showAlert) {
            alert("수신(고객/업체명)을 입력해 주세요. 저장 시 식별용으로 필요합니다.");
            document.getElementById("inputCustomer").focus();
        }
        return false;
    }

    const list = getSavedQuotations();
    const nowStr = new Date().toISOString();

    if (!state.id) {
        // 신규 저장
        state.id = "quote_" + Date.now();
        const newRecord = {
            id: state.id,
            createdAt: nowStr,
            updatedAt: nowStr,
            ...state
        };
        list.push(newRecord);
        if (showAlert) alert("신규 견적서가 브라우저 보관함에 정상적으로 저장되었습니다.");
    } else {
        // 기존 편집 본 덮어쓰기
        const index = list.findIndex(item => item.id === state.id);
        if (index !== -1) {
            list[index] = {
                ...list[index],
                updatedAt: nowStr,
                logo: state.logo,
                docTitle: state.docTitle,
                customer: state.customer,
                date: state.date,
                expiry: state.expiry,
                supplier: state.supplier,
                contact: state.contact,
                notes: state.notes,
                products: state.products
            };
            if (showAlert) alert("견적서 수정 내용이 브라우저 보관함에 저장되었습니다.");
        } else {
            // 목록에 없는 경우 신규처럼 등록
            const newRecord = {
                id: state.id,
                createdAt: nowStr,
                updatedAt: nowStr,
                ...state
            };
            list.push(newRecord);
            if (showAlert) alert("견적서가 브라우저 보관함에 저장되었습니다.");
        }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    const record = list.find(i => i.id === state.id);
    if(record) saveToSupabase(record);
    renderSavedList();
    return true;
}

// 파일 시스템 연결 디렉토리 핸들 (data 폴더)
let customDataDirHandle = null;

/**
 * 프로젝트 내 data 폴더를 디렉토리로 직접 연결 설정
 */
async function selectDataFolder() {
    if (!("showDirectoryPicker" in window)) {
        alert("현재 웹 브라우저는 폴더 직접 지정 기능(File System Access API)을 지원하지 않거나 로컬 실행 환경(file://) 보안으로 차단되어 있습니다.\n대신 'data 폴더에 견적서 저장' 버튼을 누른 후 뜨는 저장 창에서 Quotation/data 폴더를 선택해 주세요.");
        return;
    }

    try {
        // 브라우저 유저 제스처 활성화를 유지하기 위해 alert 팝업 없이 바로 폴더 선택 창을 엽니다.
        customDataDirHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        
        const statusEl = document.getElementById("folderStatusText");
        if (statusEl) {
            statusEl.textContent = `연결됨: ${customDataDirHandle.name}/`;
            statusEl.style.color = "#059669";
            statusEl.style.fontWeight = "bold";
        }
        alert(`'${customDataDirHandle.name}' 폴더가 저장 위치로 정상 연결되었습니다!\n이제 [data 폴더에 견적서 저장] 버튼을 누르면 이 폴더에 바로 파일이 저장됩니다.`);
    } catch (err) {
        if (err.name === 'AbortError') return;
        console.error("폴더 선택 오류:", err);
        alert(`폴더 연결 실패: ${err.message || err}\n버튼 클릭 후 바로 'Quotation/data' 폴더를 선택해 주세요.`);
    }
}

/**
 * 현재 작성 중인 견적서를 PC data 폴더에 파일(.json)로 직접 저장
 */
async function saveQuotationToFile() {
    if (!state.customer.trim()) {
        alert("수신(고객/업체명)을 입력해 주세요. 저장 시 식별용으로 필요합니다.");
        document.getElementById("inputCustomer").focus();
        return;
    }

    // 먼저 브라우저 보관함에도 최신 상태 저장
    saveQuotation(false);

    const safeCustomer = state.customer.replace(/[\/\\:*?"<>|]/g, "_");
    const defaultFilename = `견적서_${safeCustomer}_${state.date || '작성일미상'}.json`;

    const quotationData = {
        id: state.id || "quote_" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...state
    };

    const jsonStr = JSON.stringify(quotationData, null, 2);

    // 1. 이미 'data' 폴더가 연결되어 있는 경우 -> 매번 묻지 않고 data 폴더로 자동 파일 작성!
    if (customDataDirHandle) {
        try {
            const options = { mode: 'readwrite' };
            if ((await customDataDirHandle.queryPermission(options)) !== 'granted') {
                if ((await customDataDirHandle.requestPermission(options)) !== 'granted') {
                    alert("저장 폴더 접근 권한이 거부되었습니다.");
                    return;
                }
            }
            const fileHandle = await customDataDirHandle.getFileHandle(defaultFilename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            alert(`🎉 [${customDataDirHandle.name}] 폴더 안에 견적서 파일이 바로 저장되었습니다!\n파일명: ${defaultFilename}`);
            return;
        } catch (err) {
            console.warn("연결된 폴더에 파일 저장 실패, 다른 저장 방식을 시도합니다:", err);
        }
    }

    // 2. 연결된 폴더가 없는 경우 File System Access API 저장 대화상자 실행 (기본 폴더 선택 권장)
    if ("showSaveFilePicker" in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFilename,
                types: [{
                    description: '견적서 JSON 파일',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            alert(`선택하신 위치(${handle.name})에 견적서 파일이 성공적으로 저장되었습니다!\n💡 메인 폴더 안의 'data' 폴더를 저장 위치로 선택해 주시면 관리가 편리합니다.`);
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.warn("File System Access API 저장 실패, 브라우저 다운로드 방식으로 대체합니다:", err);
        }
    }

    // 3. Fallback: 표준 브라우저 파일 다운로드
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`견적서 파일이 다운로드되었습니다!\n다운로드된 파일[${defaultFilename}]을 프로젝트 메인 폴더 안의 'data' 폴더로 이동시켜 주세요.`);
}

/**
 * 현재 등록된 로고 이미지를 PC data 폴더에 파일(.png / .jpg)로 저장
 */
async function saveLogoToFile() {
    if (!state.logo) {
        alert("등록된 회사 로고가 없습니다.");
        return;
    }

    const matches = state.logo.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    let ext = "png";
    let mimeType = "image/png";

    if (matches) {
        mimeType = matches[1];
        ext = mimeType.split('/')[1] || "png";
        if (ext === "jpeg") ext = "jpg";
    }

    const byteCharacters = atob(state.logo.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const safeSupplier = state.supplier ? state.supplier.replace(/[\/\\:*?"<>|]/g, "_") : "회사";
    const defaultFilename = `로고_${safeSupplier}.${ext}`;

    // 1. 이미 'data' 폴더가 연결되어 있는 경우 바로 해당 폴더로 저장
    if (customDataDirHandle) {
        try {
            const options = { mode: 'readwrite' };
            if ((await customDataDirHandle.queryPermission(options)) !== 'granted') {
                if ((await customDataDirHandle.requestPermission(options)) !== 'granted') {
                    alert("저장 폴더 접근 권한이 거부되었습니다.");
                    return;
                }
            }
            const fileHandle = await customDataDirHandle.getFileHandle(defaultFilename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            alert(`🎉 [${customDataDirHandle.name}] 폴더 안에 로고 이미지 파일이 바로 저장되었습니다!\n파일명: ${defaultFilename}`);
            return;
        } catch (err) {
            console.warn("연결된 폴더에 로고 저장 실패, 대화상자로 시도합니다:", err);
        }
    }

    // 2. 저장 대화상자
    if ("showSaveFilePicker" in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFilename,
                types: [{
                    description: '로고 이미지 파일',
                    accept: { [mimeType]: [`.${ext}`] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            alert(`로고 파일이 저장되었습니다!\n파일명: ${handle.name}`);
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    // 3. Fallback 다운로드
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`로고 파일이 다운로드되었습니다!\n다운로드된 파일[${defaultFilename}]을 메인 폴더 안의 'data' 폴더로 이동시켜 주세요.`);
}

/**
 * 저장된 데이터 불러오기
 */
window.loadQuotation = function(id) {
    const list = getSavedQuotations();
    const quotation = list.find(item => item.id === id);
    if (!quotation) {
        alert("해당 견적서를 찾을 수 없습니다.");
        return;
    }

    // 상태 업데이트
    state.id = quotation.id;
    state.logo = quotation.logo || "";
    state.docTitle = quotation.docTitle || "렌탈 서비스 견적서";
    state.customer = quotation.customer || "";
    state.date = quotation.date || "";
    state.expiry = quotation.expiry || "";
    state.supplier = quotation.supplier || "";
    state.contact = quotation.contact || "";
    state.notes = quotation.notes || "";
    state.products = Array.isArray(quotation.products) ? [...quotation.products] : [];

    // UI 입력창 반영
    renderLogoPreview();
    document.getElementById("inputDocTitle").value = state.docTitle;
    document.getElementById("inputCustomer").value = state.customer;
    document.getElementById("inputDate").value = state.date;
    document.getElementById("inputExpiry").value = state.expiry;
    document.getElementById("inputSupplier").value = state.supplier;
    document.getElementById("inputContact").value = state.contact;
    document.getElementById("inputNotes").value = state.notes;

    // 제품 목록 영역 클리어 후 재생성
    const productList = document.getElementById("productList");
    productList.innerHTML = "";
    if (state.products.length === 0) {
        addNewProduct();
    } else {
        state.products.forEach(prod => {
            renderProductCard(prod);
        });
    }

    renderSavedList();
    closeSidebar();
    alert(`"${state.docTitle}" 데이터를 성공적으로 불러왔습니다.`);
};

/**
 * 저장 리스트에서 삭제
 */
window.deleteQuotation = function(event, id) {
    event.stopPropagation(); // 목록 클릭 이벤트 전파 차단
    if (!confirm("정말 이 견적서를 보관함에서 삭제하시겠습니까?")) return;

    let list = getSavedQuotations();
    list = list.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    if (state.id === id) {
        state.id = null; // 현재 불러와져 있는 견적서가 삭제된 경우 ID 초기화
    }

    renderSavedList();
};

/**
 * 새로 작성하기 (리셋)
 */
function resetToNewQuotation() {
    if (!confirm("작성 중인 내용이 사라질 수 있습니다. 새로운 견적서를 작성하시겠습니까?")) return;

    state.id = null;
    state.docTitle = "렌탈 서비스 견적서";
    state.customer = "";
    state.expiry = "견적일로부터 30일";
    state.supplier = "";
    state.contact = "";
    state.notes = "1. 설치비 및 등록비 면제 조건입니다.\n2. 약정 기간 내 해지 시 위약금이 발생할 수 있습니다.\n3. 렌탈료는 부가가치세(VAT)가 포함된 금액입니다.";
    state.products = [];

    // 오늘 날짜 기본값 설정
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    state.date = `${yyyy}-${mm}-${dd}`;

    // UI 반영
    removeLogo();
    document.getElementById("inputDocTitle").value = state.docTitle;
    document.getElementById("inputCustomer").value = state.customer;
    document.getElementById("inputDate").value = state.date;
    document.getElementById("inputExpiry").value = state.expiry;
    document.getElementById("inputSupplier").value = state.supplier;
    document.getElementById("inputContact").value = state.contact;
    document.getElementById("inputNotes").value = state.notes;

    // 제품 목록 클리어 후 신규 추가
    document.getElementById("productList").innerHTML = "";
    addNewProduct();

    renderSavedList();
    alert("새 견적서 양식이 셋팅되었습니다.");
}

/**
 * 파일 백업 내보내기 (.json) - 보관함의 모든 견적서(여러 개)를 한꺼번에 저장
 */
async function exportBackupJSON() {
    const list = getSavedQuotations();
    if (list.length === 0) {
        alert("백업할 저장된 견적서가 보관함에 없습니다.");
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const defaultFilename = `렌탈견적서_보관함_전체백업_${todayStr}.json`;
    const jsonStr = JSON.stringify(list, null, 2);

    // 1. data 폴더 연결 상태 시 자동 저장
    if (customDataDirHandle) {
        try {
            const options = { mode: 'readwrite' };
            if ((await customDataDirHandle.queryPermission(options)) !== 'granted') {
                if ((await customDataDirHandle.requestPermission(options)) !== 'granted') {
                    alert("저장 폴더 접근 권한이 거부되었습니다.");
                    return;
                }
            }
            const fileHandle = await customDataDirHandle.getFileHandle(defaultFilename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            alert(`🎉 [${customDataDirHandle.name}] 폴더 안에 보관함 전체 (${list.length}개 견적서) 백업 파일이 바로 저장되었습니다!\n파일명: ${defaultFilename}`);
            return;
        } catch (err) {
            console.warn("연결 폴더 저장 실패, 대화상자로 전환:", err);
        }
    }

    // 2. 저장 대화상자
    if ("showSaveFilePicker" in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFilename,
                types: [{
                    description: '전체 백업 JSON 파일',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            alert(`보관함 전체 (${list.length}개 견적서) 백업 파일이 저장되었습니다!\n파일명: ${handle.name}`);
            return;
        } catch (err) {
            if (err.name === 'AbortError') return;
        }
    }

    // 3. Fallback 다운로드
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`보관함 전체 (${list.length}개 견적서) 백업 파일이 다운로드되었습니다!`);
}

/**
 * 백업 파일 복원 가져오기
 */
function importBackupJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            
            let dataArray = [];
            if (Array.isArray(importedData)) {
                dataArray = importedData;
            } else if (typeof importedData === 'object' && importedData !== null) {
                dataArray = [importedData];
            } else {
                throw new Error("올바른 JSON 포맷이 아닙니다.");
            }

            // 간단한 키 유효성 검증
            const isValid = dataArray.every(item => item.id && item.docTitle && Array.isArray(item.products));
            if (!isValid) {
                throw new Error("견적서 보관함 백업 형식이 맞지 않습니다.");
            }

            let confirmMsg = `가져온 파일에서 총 ${dataArray.length}개의 견적서를 보관함에 추가하시겠습니까? (동일 ID 존재 시 덮어씁니다.)`;
            if (dataArray.length === 1 && !Array.isArray(importedData)) {
                confirmMsg = `해당 견적서('${dataArray[0].customer || '고객'}')를 보관함에 추가하시겠습니까? (동일 ID 존재 시 덮어씁니다.)`;
            }

            if (confirm(confirmMsg)) {
                const currentList = getSavedQuotations();
                dataArray.forEach(importedItem => {
                    const idx = currentList.findIndex(cur => cur.id === importedItem.id);
                    if (idx !== -1) {
                        currentList[idx] = importedItem;
                    } else {
                        currentList.push(importedItem);
                    }
                });
                localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList));
                renderSavedList();
                alert("성공적으로 보관함 복원(추가)이 완료되었습니다.");
            }
        } catch (err) {
            alert(`복원 실패: ${err.message}`);
        }
        event.target.value = ""; // 파일 선택창 리셋
    };
    reader.readAsText(file);
}

/* ==========================================================================
   미리보기 렌더링 & 모달 제어
   ========================================================================== */
function openPreviewModal() {
    // 최소 유효성 검사
    if (!state.products.some(p => p.name.trim() !== "")) {
        alert("최소 하나 이상의 제품 정보(제품명)를 입력해야 견적서를 미리볼 수 있습니다.");
        return;
    }

    renderPreviewData();
    document.getElementById("previewModal").classList.add("open");
}

function closePreviewModal() {
    document.getElementById("previewModal").classList.remove("open");
}

/**
 * 미리보기 A4 템플릿에 데이터 바인딩
 */
function renderPreviewData() {
    // 1. 회사 로고 노출
    const logoArea = document.getElementById("quoteLogoArea");
    if (state.logo) {
        logoArea.innerHTML = `<img src="${state.logo}" alt="Company Logo">`;
    } else {
        logoArea.innerHTML = '';
    }

    // 2. 기본 정보
    document.getElementById("quoteTitle").textContent = state.docTitle || "렌 탈 견 적 서";
    document.getElementById("quoteCustomer").textContent = state.customer || "(수신인 미지정)";
    document.getElementById("quoteDate").textContent = formatDateKorean(state.date);
    document.getElementById("quoteExpiry").textContent = state.expiry || "-";
    document.getElementById("quoteSupplier").textContent = state.supplier || "-";
    
    // 담당자 및 연락처에서 연락처 파싱 시도 (또는 전체 노출)
    document.getElementById("quoteContact").textContent = state.contact.split("(")[0].trim() || "-";
    // 괄호 안에 있는 연락처 정보 추출 시도
    const phoneMatch = state.contact.match(/\(([^)]+)\)/);
    document.getElementById("quotePhone").textContent = phoneMatch ? phoneMatch[1] : (state.contact.includes(" ") ? state.contact.substring(state.contact.indexOf(" ")).trim() : "-");

    // 3. 비고/주의사항 리스트 생성
    const notesContent = document.getElementById("quoteNotesContent");
    notesContent.innerHTML = "";
    if (state.notes.trim()) {
        const ol = document.createElement("ol");
        ol.className = "quote-notes-list";
        state.notes.split("\n").forEach(line => {
            if (line.trim()) {
                const li = document.createElement("li");
                li.textContent = line;
                ol.appendChild(li);
            }
        });
        notesContent.appendChild(ol);
    } else {
        notesContent.innerHTML = '<p style="font-size:8.5pt; color:#64748b;">등록된 특이사항이 없습니다.</p>';
    }

    // 4. 제품 리스트 렌더링
    const tbody = document.getElementById("quoteTableBody");
    tbody.innerHTML = "";
    let totalRental = 0;

    // 빈 제품은 제외하고 의미있는 제품만 노출
    const activeProducts = state.products.filter(p => p.name.trim() !== "");

    activeProducts.forEach((prod, index) => {
        const row = document.createElement("tr");
        const qty = prod.quantity || 1;
        const subtotal = prod.fee * qty;
        totalRental += subtotal;

        // 할인 항목 목록 구성
        let discountHtml = "<ul>";
        if (prod.discount1.trim()) discountHtml += `<li>${escapeHtml(prod.discount1)}</li>`;
        if (prod.discount2.trim()) discountHtml += `<li>${escapeHtml(prod.discount2)}</li>`;
        discountHtml += "</ul>";
        if (discountHtml === "<ul></ul>") discountHtml = "-";

        // 추가 혜택 목록 구성
        let benefitHtml = "<ul>";
        if (prod.benefit1.trim()) benefitHtml += `<li>${escapeHtml(prod.benefit1)}</li>`;
        if (prod.benefit2.trim()) benefitHtml += `<li>${escapeHtml(prod.benefit2)}</li>`;
        benefitHtml += "</ul>";
        if (benefitHtml === "<ul></ul>") benefitHtml = "-";

        // 제품 사진 셀
        let photoHtml = "";
        if (prod.photo) {
            photoHtml = `<img src="${prod.photo}" alt="${escapeHtml(prod.name)}">`;
        } else {
            photoHtml = '<span style="font-size:8pt; color:#cbd5e1;">이미지 없음</span>';
        }

        // 링크 노출 여부
        let linkHtml = "";
        if (prod.link.trim()) {
            linkHtml = `<a href="${prod.link}" target="_blank" class="quote-table-product-link"><i data-lucide="external-link" style="width:10px;height:10px;display:inline-block;vertical-align:middle;margin-right:2px;"></i>상세보기</a>`;
        }

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${photoHtml}</td>
            <td class="quote-table-product-cell">
                <span class="quote-table-product-name">${escapeHtml(prod.name)}</span>
                <span class="quote-table-product-term">약정: ${escapeHtml(prod.term) || '없음'}</span>
                ${linkHtml}
            </td>
            <td>${discountHtml}</td>
            <td>${benefitHtml}</td>
            <td class="text-nowrap">${qty}대</td>
            <td class="text-right text-nowrap">${formatNumber(prod.fee)}원</td>
            <td class="text-right font-bold text-nowrap">${formatNumber(subtotal)}원</td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById("quoteTotalRental").textContent = formatNumber(totalRental);
    lucide.createIcons({ attrs: { class: 'lucide' } });
}

/* ==========================================================================
   내보내기 기능: PDF 및 Excel 빌드 다운로드
   ========================================================================== */
/**
 * HTML 요소를 PDF 파일로 다운로드 (try-finally 패턴으로 버튼 상태 100% 자동 원상 복원)
 */
async function downloadPDF() {
    const btn = document.getElementById("btnSavePDF");
    if (btn) {
        if (!btn.dataset.originHtml) {
            btn.dataset.originHtml = btn.innerHTML;
        }
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> PDF 변환 중...';
        if (window.lucide) lucide.createIcons();
    }

    const printPaper = document.getElementById("printPaper");
    const container = document.querySelector(".print-paper-container");
    const modalBody = document.querySelector(".modal-body");

    // 1. 레이아웃 변형 및 스크롤 위치 보정
    let originalTransform = "";
    let originalTransformOrigin = "";
    let originalHeight = "";
    let originalMaxHeight = "";
    let originalOverflow = "";
    let originalBoxSizing = "";
    let prevScrollTop = 0;

    try {
        if (container) {
            originalTransform = container.style.transform;
            originalTransformOrigin = container.style.transformOrigin;
            container.style.transform = "none";
            container.style.transformOrigin = "unset";
        }

        if (printPaper) {
            originalHeight = printPaper.style.height;
            originalMaxHeight = printPaper.style.maxHeight;
            originalOverflow = printPaper.style.overflow;
            originalBoxSizing = printPaper.style.boxSizing;

            // A4 높이(297mm)보다 살짝 작게 290mm로 고정하여 2페이지 생성을 100% 방지
            printPaper.style.height = "290mm";
            printPaper.style.maxHeight = "290mm";
            printPaper.style.overflow = "hidden";
            printPaper.style.boxSizing = "border-box";
        }

        prevScrollTop = modalBody ? modalBody.scrollTop : 0;
        if (modalBody) modalBody.scrollTop = 0;

        const safeCustomer = state.customer ? state.customer.replace(/[\/\\:*?"<>|]/g, "_") : '고객';
        const filename = `${safeCustomer}_렌탈견적서.pdf`;

        const opt = {
            margin:       0,
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: 'avoid-all' }
        };

        // DOM 렌더링 리플로우 유도
        await new Promise(resolve => setTimeout(resolve, 200));

        // PDF 생성 및 저장 실행
        await html2pdf().set(opt).from(printPaper).save();

    } catch (err) {
        console.error("PDF 생성 오류:", err);
        alert(`PDF 파일 저장 중 오류가 발생했습니다: ${err.message || err}`);
    } finally {
        // 성공 및 실패 상관없이 무조건 100% 버튼 상태와 DOM 원상 복원
        if (container) {
            container.style.transform = originalTransform;
            container.style.transformOrigin = originalTransformOrigin;
        }
        if (printPaper) {
            printPaper.style.height = originalHeight;
            printPaper.style.maxHeight = originalMaxHeight;
            printPaper.style.overflow = originalOverflow;
            printPaper.style.boxSizing = originalBoxSizing;
        }
        if (modalBody) {
            modalBody.scrollTop = prevScrollTop;
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = btn.dataset.originHtml || '<i data-lucide="file-pdf"></i> PDF 파일 저장';
            if (window.lucide) lucide.createIcons();
        }
    }
}

/**
 * HTML 요소를 고해상도 이미지(PNG) 파일로 다운로드 (html2canvas 직접 활용)
 */
function downloadImage() {
    const btn = document.getElementById("btnSaveImage");
    const originText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> 이미지 변환 중...';
    lucide.createIcons();

    // 원본 엘리먼트 및 스케일 부모 컨테이너 타겟
    const printPaper = document.getElementById("printPaper");
    const container = document.querySelector(".print-paper-container");
    const modalBody = document.querySelector(".modal-body");

    // 1. 모바일 반응형용 transform 배율 임시 해제 및 스크롤 상단 고정
    let originalTransform = "";
    let originalTransformOrigin = "";
    if (container) {
        originalTransform = container.style.transform;
        originalTransformOrigin = container.style.transformOrigin;
        container.style.transform = "none";
        container.style.transformOrigin = "unset";
    }

    const prevScrollTop = modalBody ? modalBody.scrollTop : 0;
    if (modalBody) modalBody.scrollTop = 0;

    // 2. 레이아웃 리플로우 대기 후 원본 객체를 직접 캡처
    setTimeout(() => {
        html2canvas(printPaper, {
            scale: 2,
            useCORS: false,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0
        }).then(canvas => {
            const imageURL = canvas.toDataURL("image/png");
            const downloadAnchor = document.createElement('a');
            downloadAnchor.href = imageURL;
            downloadAnchor.download = `${state.customer || '고객귀하'}_렌탈견적서.png`;
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            
            // 3. 리소스 정리 및 복원
            downloadAnchor.remove();
            if (container) {
                container.style.transform = originalTransform;
                container.style.transformOrigin = originalTransformOrigin;
            }
            if (modalBody) modalBody.scrollTop = prevScrollTop;
            btn.disabled = false;
            btn.innerHTML = originText;
            lucide.createIcons();
        }).catch(err => {
            if (container) {
                container.style.transform = originalTransform;
                container.style.transformOrigin = originalTransformOrigin;
            }
            if (modalBody) modalBody.scrollTop = prevScrollTop;
            alert(`이미지 저장 중 오류가 발생했습니다: ${err.message}`);
            btn.disabled = false;
            btn.innerHTML = originText;
            lucide.createIcons();
        });
    }, 150);
}


/* ==========================================================================
   유틸리티 헬퍼 함수
   ========================================================================== */
/**
 * 천단위 콤마 포맷터 (예: 1234567 -> 1,234,567)
 */
function formatNumber(num) {
    if (!num) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 2026-07-29 포맷을 "2026년 07월 29일" 포맷으로 변환
 */
function formatDateKorean(dateStr) {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
}

/**
 * HTML 특수문자 에스크피(XSS 방지)
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ==========================================================================
   회사 로고 관리 및 Supabase 연동 함수
   ========================================================================== */
async function urlToBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to convert image URL to base64", e);
        return url;
    }
}

async function loadCompanyLogos() {
    const listContainer = document.getElementById("logoListContainer");
    if (!listContainer) return;

    try {
        const response = await fetch('/api/company-logos');
        const logos = await response.json();

        if (!Array.isArray(logos) || logos.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 30px 0; font-size: 0.85rem;">
                    등록된 로고가 없습니다.
                </div>
            `;
            return;
        }

        listContainer.innerHTML = logos.map(logo => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; gap: 10px;">
                <span style="font-size: 0.95rem; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: left;">${logo.company_name}</span>
                <div style="display: flex; gap: 6px; flex-shrink: 0; align-items: center;">
                    <button type="button" class="btn btn-outline btn-sm btn-apply-logo" data-url="${logo.logo_url}" style="padding: 6px 12px; font-size: 12px; height: 32px; font-weight: 600;">적용</button>
                    <button type="button" class="btn btn-danger btn-sm btn-delete-logo" data-id="${logo.id}" style="padding: 6px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                </div>
            </div>
        `).join('');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        listContainer.querySelectorAll('.btn-apply-logo').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const url = e.target.getAttribute('data-url');
                btn.innerText = '로딩..';
                btn.disabled = true;
                try {
                    const base64 = await urlToBase64(url);
                    state.logo = base64;
                    renderLogoPreview();
                    document.getElementById("logoManagerModal").classList.remove("open");
                } catch (err) {
                    alert('로고 적용에 실패했습니다.');
                } finally {
                    btn.innerText = '적용';
                    btn.disabled = false;
                }
            });
        });

        listContainer.querySelectorAll('.btn-delete-logo').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('이 로고를 삭제하시겠습니까?')) {
                    try {
                        const res = await fetch(`/api/company-logos?id=${id}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success) {
                            loadCompanyLogos();
                        } else {
                            alert('로고 삭제에 실패했습니다: ' + data.error);
                        }
                    } catch (err) {
                        console.error(err);
                        alert('로고 삭제 중 오류가 발생했습니다.');
                    }
                }
            });
        });

    } catch (e) {
        console.error("Failed to load company logos", e);
        listContainer.innerHTML = `
            <div style="text-align: center; color: #ef4444; padding: 20px 0; font-size: 0.85rem;">
                로고 목록을 불러오지 못했습니다.
            </div>
        `;
    }
}

async function uploadCompanyLogo() {
    const companyNameInput = document.getElementById("logoCompanyName");
    const fileInput = document.getElementById("logoUploadInput");
    const btnUpload = document.getElementById("btnUploadLogo");

    const companyName = companyNameInput.value.trim();
    if (!companyName) {
        alert("회사명을 입력하세요.");
        return;
    }

    const file = fileInput.files[0];
    if (!file) {
        alert("로고 이미지 파일을 선택하세요.");
        return;
    }

    btnUpload.disabled = true;
    btnUpload.innerHTML = '업로드 중...';

    try {
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch('/api/upload-logo', {
            method: 'POST',
            body: formData
        });
        const uploadData = await uploadRes.json();

        if (uploadData.error) {
            throw new Error(uploadData.error);
        }

        const logoUrl = uploadData.url;

        const dbRes = await fetch('/api/company-logos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company_name: companyName,
                logo_url: logoUrl
            })
        });
        const dbData = await dbRes.json();

        if (dbData.error) {
            throw new Error(dbData.error);
        }

        companyNameInput.value = '';
        fileInput.value = '';
        
        loadCompanyLogos();
        alert('로고가 성공적으로 등록되었습니다.');

    } catch (err) {
        console.error(err);
        alert('로고 등록에 실패했습니다: ' + err.message);
    } finally {
        btnUpload.disabled = false;
        btnUpload.innerHTML = '<i data-lucide="upload-cloud" style="width: 16px; height: 16px;"></i> 로고 서버 업로드 및 저장';
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}
