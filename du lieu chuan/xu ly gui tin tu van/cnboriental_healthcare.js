// /js/products_filter_paged.js
(async function () {
  const GRID_SELECTOR   = '#product-grid';
  const COUNT_EL        = '#product-count';
  const PAGER_SLOT      = '#pager-slot';
  const CATEGORY_SLOT   = '#category-slot';

  const DATA_URL = 'js/data/cnboriental_healthcare.json'; // ← đổi sang file JSON của bạn

  const LABELS = {
    loadingAria: 'loading',
    error: 'Không tải được danh sách sản phẩm. Vui lòng thử lại sau.',
    contact: 'Na poptávku',
    prev: '«',
    next: '»',
    page: 'Trang',
    seeAll: 'SEE ALL',
    addToCart: 'Add to Cart',
    added: 'Added!'
  };

  const PAGE_SIZE = 30;

  // ========= CATEGORY RULES =========
const CATEGORY_RULES = [
  {
    name: 'EAGLE BRAND OIL',
    patterns: [
      /\beagle\b/i, /\beagle\s*brand\b/i, /\beagle\s*oil\b/i,
      /\bgreen\s*oil\b/i, /\bwhite\s*oil\b/i
    ]
  },
  {
    name: 'SHILING OIL',
    patterns: [
      /\bshi\s*ling\b/i, /\bshiling\b/i, /\bshiling\s*oil\b/i
    ]
  },
  {
    name: 'NIN JIOM PEI PA KOA',
    patterns: [
      /\bnin\s*jiom\b/i, /\bpei\s*pa\s*koa\b/i,
      /\bcough\s*syrup\b/i, /\bherbal\s*syrup\b/i
    ]
  },
  {
    name: 'TIGERBALM',
    patterns: [
      /\btiger\s*balm\b/i, /\btigerbalm\b/i, /\bointment\b/i,
      /\bmuscle\s*pain\b/i, /\btiger\s*plaster\b/i
    ]
  },
  {
    name: 'NIN JIOM HERBAL CANDY',
    patterns: [
      /\bnin\s*jiom\b/i, /\bherbal\s*candy\b/i,
      /\bpei\s*pa\s*candy\b/i, /\bherbal\s*lozenge\b/i
    ]
  },
  {
    name: 'JAPANESE DETOX FOOT PATCH',
    patterns: [
      /\bfoot\s*patch\b/i, /\bdetox\b/i,
      /\bjapanese\s*patch\b/i, /\bslim\s*patch\b/i
    ]
  },
  {
    name: 'SEACOCONUT',
    patterns: [
      /\bsea\s*coconut\b/i, /\bcough\s*mixture\b/i,
      /\bherbal\s*drink\b/i
    ]
  },
  {
    name: 'PAK FAH YEOW OIL',
    patterns: [
      /\bpak\s*fah\s*yeow\b/i, /\bwhite\s*flower\s*oil\b/i,
      /\bpakfah\b/i
    ]
  },
  {
    name: 'ZHENG GU SHUI OIL',
    patterns: [
      /\bzheng\s*gu\s*shui\b/i, /\bchinese\s*medic(al)?\b/i,
      /\bbruise\b/i, /\bjoint\s*pain\b/i
    ]
  },
  {
    name: 'MORNINGSTAR',
    patterns: [
      /\bmorning\s*star\b/i, /\bmorningstar\b/i,
      /\bmedicated\b/i, /\bhealth\b(?=.*\bitem\b)/i
    ]
  },
  {
    name: 'GINSENG EXTRACT',
    patterns: [
      /\bginseng\b/i, /\bextract\b/i, /\bkorean\s*ginseng\b/i,
      /\bred\s*ginseng\b/i
    ]
  },
  {
    name: 'GINSENG ROYAL JELLY',
    patterns: [
      /\broyal\s*jelly\b/i, /\bginseng\s*royal\b/i,
      /\bhoney\s*ginseng\b/i
    ]
  },
  {
    name: 'HEALTHCARE PROMOTION ITEMS',
    patterns: [
      /\bpromotion\b/i, /\bpromo\b/i,
      /\bhealthcare\s*item(s)?\b/i, /\bhealth\b(?=.*\bgift\b)/i
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

  // ========= UTIL =========
  const normalize = (p) => ({
    id: p?.id || p?.sku || p?.name || '',
    sku: p?.sku || '',
    name: p?.name || '',
    line1: p?.line1 || '',
    line2: p?.line2 || '',
    label: p?.label || '',
    // cố gắng chuyển giá thành number; nếu rỗng => null
    price: (p?.price === '' || p?.price == null) ? null : Number(p.price),
    currency: (p?.currency || '').trim(), // có thể rỗng
    image: p?.image || 'img/placeholder.webp',
    href: p?.href || '#',
    sp: p?.sp ?? null
  });

  // Format giá: cs-CZ, 2 số lẻ. Nếu không có currency → mặc định "Kč bez DPH"
  const fmtPrice = (price, currency) => {
    if (price == null || price === '' || isNaN(price)) return '';
    const formatted = new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(price));
    const tail = currency ? currency : 'Kč bez DPH';
    return `${formatted} ${tail}`.trim();
  };

  function detectCategoryByName(name = '') {
    for (const rule of CATEGORY_RULES) {
      if (rule.patterns.some(re => re.test(name))) return rule.name;
    }
    return SEE_ALL;
  }

  // ========= RENDER =========
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
              <a href="#"
                 class="btn border border-secondary rounded-pill px-3 text-primary add-to-cart"
                 data-id="${String(p.id).replace(/"/g, '&quot;')}"
                 data-name="${String(p.name).replace(/"/g, '&quot;')}"
                 data-price="${p.price ?? ''}"
                 data-currency="${p.currency || 'Kč'}"
                 data-image="${p.image}">
                 <i class="fa fa-shopping-bag me-2 text-primary"></i>
                 <span>${LABELS.addToCart}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Popup (tận dụng markup sẵn)
  const popup       = document.getElementById('product-popup');
  const popupImg    = document.getElementById('popup-img');
  const popupName   = document.getElementById('popup-name');
  const popupDim    = document.getElementById('popup-dim');
  const popupWeight = document.getElementById('popup-weight');
  const popupClose  = document.querySelector('.product-popup-close');

  function openPopup(p) {
    popupImg.src = p.image || 'img/placeholder.webp';
    popupImg.alt = p.name || '';
    popupName.textContent = p.name || '';
    popupDim.textContent = [p.line1, p.line2].filter(Boolean).join(' • ');
    popupWeight.textContent = [
      p.sku ? `SKU: ${p.sku}` : '',
      fmtPrice(p.price, p.currency)
    ].filter(Boolean).join(' | ');
    popup.classList.remove('hidden');
  }
  function closePopup() { popup.classList.add('hidden'); }
  if (popupClose) popupClose.addEventListener('click', closePopup);
  if (popup) popup.addEventListener('click', (e) => { if (e.target === popup) closePopup(); });

  function attachCardHandlers() {
    grid.querySelectorAll('.fruite-item').forEach(item => {
      item.addEventListener('click', (ev) => {
        // tránh mở popup khi bấm nút
        if (ev.target.closest('a,button')) return;
        const id = item.dataset.id;
        const p = filteredProducts.find(prod => String(prod.id) === String(id));
        if (p) openPopup(p);
      });
    });
  }

  // ===== Add to Cart (uỷ quyền trên grid để không mất sau re-render) =====
  grid.addEventListener('click', (e) => {
    const a = e.target.closest('a.add-to-cart');
    if (!a) return;
    e.preventDefault();

    const item = {
      id: a.dataset.id,
      name: a.dataset.name,
      price: Number(a.dataset.price),
      currency: a.dataset.currency || 'Kč',
      image: a.dataset.image,
      qty: 1
    };

    document.dispatchEvent(new CustomEvent('cart:add', { detail: item }));

    a.classList.add('disabled');
    const span = a.querySelector('span');
    if (span) span.textContent = LABELS.added;
    setTimeout(() => {
      a.classList.remove('disabled');
      if (span) span.textContent = LABELS.addToCart;
    }, 1200);
  });

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

  // ===== Phân trang Prev / Select / Next =====
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
    const select  = slot.querySelector('#pg-select');

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
    const end   = start + PAGE_SIZE;
    const pageItems = filteredProducts.slice(start, end);

    grid.innerHTML = pageItems.map(cardHTML).join('');
    attachCardHandlers();
    renderPager(filteredProducts.length);

    const cnt = document.querySelector(COUNT_EL);
    if (cnt) cnt.textContent = `${filteredProducts.length} Prodotti`;

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

    allProducts = (Array.isArray(raw) ? raw : [])
      .map(normalize)
      .filter(p => p && p.name);

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
    const ps = document.querySelector(PAGER_SLOT);   if (ps) ps.innerHTML = '';
    const cs = document.querySelector(CATEGORY_SLOT); if (cs) cs.innerHTML = '';
  }

  // ========== INQUIRY MODAL + EMAILJS (giữ nguyên logic bạn đang dùng) ==========
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
    const modal = (bootstrap?.Modal?.getInstance ? bootstrap.Modal.getInstance(modalEl) : null) || new bootstrap.Modal(modalEl);

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

    modalEl._currentProduct = product;

    inqImg.src = product.image || 'img/placeholder.webp';
    inqImg.alt = product.name || '';
    inqName.textContent = product.name || '';
    inqLine.textContent = [product.line1, product.line2].filter(Boolean).join(' • ');
    inqSku.textContent = product.sku ? `SKU: ${product.sku}` : '';
    inqPrice.textContent = fmtPrice(product.price, product.currency);

    inqForm?.classList.remove('was-validated');
    if (inqEmail) inqEmail.value = '';
    if (inqPhone) inqPhone.value = '';
    if (inqMsg)   inqMsg.value = '';
    if (inqStatus) inqStatus.textContent = '';

    modal.show();

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
          product_price: fmtPrice(p.price, p.currency),
          product_image: p.image || '',
          product_link: p.href || '',
          page_url: window.location.href,
          user_email: inqEmail.value.trim(),
          user_phone: inqPhone.value.trim(),
          user_message: inqMsg.value.trim()
        };

        try {
          const EMAILJS_SERVICE_ID = 'service_d7r5mo7';
          const EMAILJS_TEMPLATE_ID = 'template_nnbndsu';
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
