// /js/products_filter_paged.js
(async function () {
  const GRID_SELECTOR = '#product-grid';
  const COUNT_EL = '#product-count';
  const PAGER_SLOT = '#pager-slot';
  const CATEGORY_SLOT = '#category-slot';

  const DATA_URL = 'js/data/cnboriental_sushi&ramen.json'; // ← đổi sang file JSON của bạn

  const LABELS = {
    loadingAria: 'loading',
    error: 'Không tải được danh sách sản phẩm. Vui lòng thử lại sau.',
    contact: 'Na poptávku',
    prev: '«',
    next: '»',
    page: 'Trang',
    seeAll: 'SEE ALL'
  };

  const PAGE_SIZE = 30;

  // ========= CATEGORY RULES (dựa trên tên sản phẩm) =========
const CATEGORY_RULES = [
 {
    name: 'RAMEN',
    patterns: [
      /\bramen\b/i, /\budon\b/i, /\bsoba\b/i,
      /\bnoodle(s)?\b/i, /\bnoodle\s*basket(s)?\b/i, /\bstrainer(s)?\b/i,
      /\bramen\s*bowl(s)?\b/i, /\bsoup\s*bowl(s)?\b/i,
      /\brenge\b/i, /\bramen\s*spoon(s)?\b/i, /\bsoup\s*ladle(s)?\b/i
    ]
  },
  {
    name: 'SUSHI CHEF TOOLS',
    patterns: [
      /\bsushi\s*chef\b/i, /\btweezer(s)?\b/i, /\bfish\s*bone\s*(tweezer|plier)s?\b/i,
      /\btorch(es)?\b/i, /\bblow\s*torch(es)?\b/i,
      /\bpinset(te)?s?\b/i, /\bbrush(es)?\b/i, /\bbasting\b/i,
      /\btamagoyaki\b/i, /\btamago\s*pan\b/i,
      /\brolling\s*machine\b/i, /\bsushi\s*bazooka\b/i
    ]
  },
  {
    name: 'SUSHI BAR SERVEWARE',
    patterns: [
      /\bsushi\s*plate(s)?\b/i, /\bsashimi\s*plate(s)?\b/i,
      /\bgeta\b/i, /\bsushi\s*geta\b/i, /\bsushi\s*boat(s)?\b/i, /\bbridge(s)?\b/i,
      /\bsoy\s*sauce\s*(dish|plate|bottle)s?\b/i, /\bwasabi\b/i, /\bginger\b/i,
      /\bchopstick\s*rest(s)?\b/i, /\bserv(e|ing)\s*ware\b/i, /\btray(s)?\b/i
    ]
  },
  {
    name: 'SUSHI PREPARATION TOOLS',
    patterns: [
      /\bhangiri\b/i, /\brice\s*tub\b/i, /\boke\b/i,
      /\bshamoji\b/i, /\brice\s*paddle(s)?\b/i,
      /\bmakisu\b/i, /\bsushi\s*mat(s)?\b/i,
      /\boshibako\b/i, /\boshizushi\b/i, /\bpress(ed)?\s*sushi\b/i,
      /\bnigiri\s*mold(s)?\b/i, /\broll\s*mold(s)?\b/i,
      /\bonigiri\s*mold(s)?\b/i, /\bnori\b/i, /\brice\s*cool(ing)?\b/i
    ]
  }
];

  const SEE_ALL = LABELS.seeAll;

  // ========= STATE =========
  let allProducts = [];
  let filteredProducts = [];
  let currentPage = 1;       // 1-based
  let currentCategory = SEE_ALL;

  // đọc ?cat & ?page
  const qs = new URLSearchParams(location.search);
  const initCat = qs.get('cat');
  const initPage = parseInt(qs.get('page'), 10);
  if (initCat) currentCategory = initCat;
  if (!isNaN(initPage) && initPage >= 1) currentPage = initPage;

  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;

  // ========= UTIL / RENDER =========
  const normalize = (p) => ({
    id: p?.id || p?.sku || p?.name || '',
    sku: p?.sku || '',
    name: p?.name || '',
    line1: p?.line1 || '',
    line2: p?.line2 || '',
    label: p?.label || '',
    price: (p?.price ?? '') === '' ? null : p?.price,
    currency: p?.currency || '',
    image: p?.image || 'img/placeholder.webp',
    href: p?.href || '#',
    sp: p?.sp ?? null
  });

  const fmtPrice = (price, currency) => (price == null || price === '') ? '' : `${price} ${currency}`.trim();

  function detectCategoryByName(name = '') {
    for (const rule of CATEGORY_RULES) {
      if (rule.patterns.some(re => re.test(name))) return rule.name;
    }
    return SEE_ALL;
  }

  const cardHTML = (p) => {
    const priceText = fmtPrice(p.price, p.currency);
    return `
      <div class="col-md-6 col-lg-4 col-xl-3">
        <div class="rounded position-relative fruite-item h-100" data-id="${String(p.id).replace(/"/g, '&quot;')}">
          <div class="fruite-img">
            <img src="${p.image}" class="img-fluid w-100 rounded-top border border-secondary" alt="${p.name}">
          </div>
          ${p.label ? `<div class="text-white bg-secondary px-3 py-1 rounded position-absolute" style="top:10px;left:10px;font-size:12px">${p.label}</div>` : ''}
          <div class="p-4 border border-secondary border-top-0 rounded-bottom d-flex flex-column">
            <h4 class="mb-2">${p.name}</h4>
            ${p.line1 ? `<p class="mb-1 text-muted">${p.line1}</p>` : ''}
            ${p.line2 ? `<p class="mb-2 text-muted">${p.line2}</p>` : ''}
            ${p.sku ? `<p class="mb-2 small text-secondary">SKU: ${p.sku}</p>` : ''}
            ${priceText ? `<p class="mb-3 fw-semibold">${priceText}</p>` : `<p class="mb-3"></p>`}
            <div class="mt-auto d-flex justify-content-between gap-2">
              <a href="#"
                 class="btn border border-secondary rounded-pill px-3 text-primary js-inquiry-btn"
                 data-id="${String(p.id).replace(/"/g, '&quot;')}">
                 <i class="fa fa-paper-plane me-2 text-primary"></i>
                 <span>${LABELS.contact}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Popup (tận dụng markup sẵn)
  const popup = document.getElementById('product-popup');
  const popupImg = document.getElementById('popup-img');
  const popupName = document.getElementById('popup-name');
  const popupDim = document.getElementById('popup-dim');
  const popupWeight = document.getElementById('popup-weight');
  const popupClose = document.querySelector('.product-popup-close');
  function openPopup(p) {
    popupImg.src = p.image || 'img/placeholder.webp';
    popupImg.alt = p.name || '';
    popupName.textContent = p.name || '';
    popupDim.textContent = [p.line1, p.line2].filter(Boolean).join(' • ');
    popupWeight.textContent = [p.sku ? `SKU: ${p.sku}` : '', fmtPrice(p.price, p.currency)].filter(Boolean).join(' | ');
    popup.classList.remove('hidden');
  }
  function closePopup() { popup.classList.add('hidden'); }
  if (popupClose) popupClose.addEventListener('click', closePopup);
  if (popup) popup.addEventListener('click', (e) => { if (e.target === popup) closePopup(); });

  function attachCardHandlers() {
    grid.querySelectorAll('.fruite-item').forEach(item => {
      item.addEventListener('click', (ev) => {
        if (ev.target.closest('a,button')) return;
        const id = item.dataset.id;
        const p = filteredProducts.find(prod => String(prod.id) === String(id));
        if (p) openPopup(p);
      });
    });
  }

  // ===== Dropdown category (Bootstrap) =====
  function updateURL() {
    const url = new URL(location.href);
    url.searchParams.set('page', String(currentPage));
    url.searchParams.set('cat', currentCategory);
    history.replaceState(null, '', url);
  }

  function renderCategoryDropdown() {
    const slot = document.querySelector(CATEGORY_SLOT);
    if (!slot) return;

    const foundSet = new Set([SEE_ALL]);
    for (const p of allProducts) foundSet.add(detectCategoryByName(p.name));
    const ordered = [SEE_ALL, ...CATEGORY_RULES.map(r => r.name).filter(n => foundSet.has(n))];

    slot.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          ${currentCategory}
        </button>
        <ul class="dropdown-menu">
          ${ordered.map(n => `
            <li><a class="dropdown-item ${n === currentCategory ? 'active' : ''}" href="#" data-cat="${n}">${n}</a></li>
          `).join('')}
        </ul>
      </div>
    `;

    slot.querySelectorAll('.dropdown-item').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = a.getAttribute('data-cat') || SEE_ALL;
        if (cat !== currentCategory) {
          currentCategory = cat;
          currentPage = 1;
          applyFilter();
          renderProducts();
        }
      });
    });
  }

  // ===== Phân trang Prev / Select / Next (Bootstrap input-group) =====
  function renderPager(totalItems) {
    const slot = document.querySelector(PAGER_SLOT);
    if (!slot) return;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    slot.innerHTML = `
      <div class="input-group input-group-sm" style="max-width: 320px;">
        <button class="btn btn-outline-secondary" type="button" id="pg-prev" aria-label="Previous">${LABELS.prev}</button>
        <select class="form-select" id="pg-select" aria-label="${LABELS.page}">
          ${Array.from({ length: totalPages }, (_, i) => {
            const n = i + 1;
            return `<option value="${n}" ${n === currentPage ? 'selected' : ''}>${LABELS.page} ${n}/${totalPages}</option>`;
          }).join('')}
        </select>
        <button class="btn btn-outline-secondary" type="button" id="pg-next" aria-label="Next">${LABELS.next}</button>
      </div>
    `;

    const prevBtn = slot.querySelector('#pg-prev');
    const nextBtn = slot.querySelector('#pg-next');
    const select = slot.querySelector('#pg-select');

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderProducts(); } };
    nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; renderProducts(); } };
    select.onchange = () => { currentPage = parseInt(select.value, 10); renderProducts(); };

    updateURL();
  }

  function applyFilter() {
    if (currentCategory === SEE_ALL) {
      filteredProducts = allProducts.slice();
    } else {
      filteredProducts = allProducts.filter(p => detectCategoryByName(p.name) === currentCategory);
    }
  }

  function renderProducts() {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = filteredProducts.slice(start, end);

    grid.innerHTML = pageItems.map(cardHTML).join('');
    attachCardHandlers();
    renderPager(filteredProducts.length);

    const cnt = document.querySelector(COUNT_EL);
    if (cnt) cnt.textContent = `${filteredProducts.length} Prodotti`;

    // thông báo đã render (nếu cần hook ngoài)
    try {
      document.dispatchEvent(new CustomEvent('mina:productsRendered', { detail: { page: currentPage, total: filteredProducts.length } }));
    } catch {}
  }

  // ===== Loading & fetch =====
  grid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border" role="status" aria-label="${LABELS.loadingAria}"></div>
    </div>
  `;

  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    allProducts = (Array.isArray(raw) ? raw : []).map(normalize).filter(p => p && p.name);
    renderCategoryDropdown();
    applyFilter();

    const maxPage = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
    if (currentPage > maxPage) currentPage = 1;

    renderProducts();
  } catch (err) {
    console.error('Load products failed:', err);
    grid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger" role="alert">${LABELS.error}</div>
      </div>
    `;
    const ps = document.querySelector(PAGER_SLOT); if (ps) ps.innerHTML = '';
    const cs = document.querySelector(CATEGORY_SLOT); if (cs) cs.innerHTML = '';
  }

  // ========== INQUIRY MODAL + EMAILJS (NHÚNG NGAY TRONG FILE NÀY) ==========
  // Yêu cầu HTML đã có modal #inquiryModal như bạn dán ở trên.
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-inquiry-btn');
    if (!btn) return;

    e.preventDefault();
    const id = btn.getAttribute('data-id');
    const product = filteredProducts.find(x => String(x.id) === String(id))
                  || allProducts.find(x => String(x.id) === String(id));
    if (!product) {
      console.warn('[Inquiry] Không tìm thấy sản phẩm id=', id);
      return;
    }

    const modalEl = document.getElementById('inquiryModal');
    if (!modalEl) { console.warn('[Inquiry] #inquiryModal not found'); return; }
    const modal =(bootstrap?.Modal?.getInstance ? bootstrap.Modal.getInstance(modalEl) : null)|| new bootstrap.Modal(modalEl);

    // fill UI
    const inqImg   = document.getElementById('inq-img');
    const inqName  = document.getElementById('inq-name');
    const inqLine  = document.getElementById('inq-line');
    const inqSku   = document.getElementById('inq-sku');
    const inqPrice = document.getElementById('inq-price');

    const inqEmail = document.getElementById('inq-email');
    const inqPhone = document.getElementById('inq-phone');
    const inqMsg   = document.getElementById('inq-message');
    const inqForm  = document.getElementById('inquiryForm');
    const inqStatus= document.getElementById('inq-status');
    const inqSubmit= document.getElementById('inq-submit');

    // giữ current product trên modal element để handler gửi truy cập
    modalEl._currentProduct = product;

    inqImg.src = product.image || 'img/placeholder.webp';
    inqImg.alt = product.name || '';
    inqName.textContent = product.name || '';
    inqLine.textContent = [product.line1, product.line2].filter(Boolean).join(' • ');
    inqSku.textContent = product.sku ? `SKU: ${product.sku}` : '';
    inqPrice.textContent = (product.price == null || product.price === '') ? '' : `${product.price} ${product.currency || ''}`.trim();

    // reset form
    inqForm?.classList.remove('was-validated');
    if (inqEmail) inqEmail.value = '';
    if (inqPhone) inqPhone.value = '';
    if (inqMsg)   inqMsg.value = '';
    if (inqStatus) inqStatus.textContent = '';

    modal.show();

    // gắn 1 lần handler gửi (idempotent)
    if (!modalEl._sendBound && inqSubmit) {
      modalEl._sendBound = true;
      inqSubmit.addEventListener('click', async () => {
        if (!inqForm) return;
        inqForm.classList.add('was-validated');
        if (!inqEmail?.checkValidity?.() || !inqPhone?.checkValidity?.()) {
          if (inqStatus) inqStatus.textContent = 'Please fill in your full Email and Phone Number.';
          return;
        }
        const p = modalEl._currentProduct;
        if (!p) { if (inqStatus) inqStatus.textContent = 'Không tìm thấy sản phẩm.'; return; }

        inqSubmit.disabled = true;
        if (inqStatus) inqStatus.textContent = 'Đang gửi...';

        const params = {
          product_name: p.name || '',
          product_line1: p.line1 || '',
          product_line2: p.line2 || '',
          product_sku: p.sku || '',
          product_price: (p.price == null || p.price === '') ? '' : `${p.price} ${p.currency || ''}`.trim(),
          product_image: p.image || '',
          product_link: p.href || '',
          page_url: window.location.href,
          user_email: inqEmail.value.trim(),
          user_phone: inqPhone.value.trim(),
          user_message: inqMsg.value.trim()
        };

        try {
          // Emailjs nick : nobitavsxukanhieulam@gmail.com
          // === EmailJS: thay 3 hằng số dưới (và đảm bảo đã nạp SDK + init ở HTML) ===
          const EMAILJS_SERVICE_ID = 'service_d7r5mo7';
          const EMAILJS_TEMPLATE_ID = 'template_nnbndsu';
          // emailjs.init('YOUR_PUBLIC_KEY'); // init nên đặt ở HTML sau khi load SDK

          if (typeof emailjs === 'undefined') throw new Error('EmailJS SDK chưa được nạp hoặc chưa init');
          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
          if (inqStatus) inqStatus.textContent = 'Done ! We will contact you soon.';
          setTimeout(() => bootstrap.Modal.getInstance(modalEl)?.hide(), 1200);
        } catch (err) {
          console.error(err);
          if (inqStatus) inqStatus.textContent = 'Fail. Please send Again.';
        } finally {
          inqSubmit.disabled = false;
        }
      });
    }
  });
})();
