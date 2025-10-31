// /js/products_filter_paged.js
(async function () {
  const GRID_SELECTOR  = '#product-grid';
  const COUNT_EL       = '#product-count';
  const PAGER_SLOT     = '#pager-slot';
  const CATEGORY_SLOT  = '#category-slot';

  const DATA_URL = 'js/data/cnboriental_tableware.json'; // ← đổi sang file JSON của bạn

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
  // Thứ tự rule quyết định độ ưu tiên và thứ tự menu
  const CATEGORY_RULES = [
    { name: 'COLLECTIONS', patterns: [/collection/i] },
    { name: 'BOWLS', patterns: [/\bbowl(s)?\b/i] },
    { name: 'PLATES', patterns: [/\bplate(s)?\b/i, /\bplatter(s)?\b/i] },
    { name: 'SOY SAUCE DISHES AND DISPENSERS', patterns: [/soy\s*sauce/i, /dispenser/i] },
    { name: 'MELAMINEWARE', patterns: [/melamine(ware)?/i] },
    { name: 'LACQUERWARE', patterns: [/lacquer/i] },
    { name: 'MELAMINE EARTHENWARE', patterns: [/earthenware/i] },
    { name: 'BENTO BOXES AND TRAYS', patterns: [/bento/i, /\btray(s)?\b/i] },
    { name: 'SAKE', patterns: [/\bsake\b/i, /\btokkuri\b/i, /\bochoko\b/i] },
    { name: 'DISPLAYS', patterns: [/display/i] },
  ];
  const SEE_ALL = LABELS.seeAll;

  // ========= STATE =========
  let allProducts = [];
  let filteredProducts = [];
  let currentPage = 1;       // 1-based
  let currentCategory = SEE_ALL;

  // đọc ?cat & ?page
  const qs = new URLSearchParams(location.search);
  const initCat  = qs.get('cat');
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
    return SEE_ALL; // nhóm mặc định (không “OTHER” để menu gọn)
  }

  const cardHTML = (p) => {
    const priceText = fmtPrice(p.price, p.currency);
    return `
      <div class="col-md-6 col-lg-4 col-xl-3">
        <div class="rounded position-relative fruite-item h-100" data-id="${String(p.id).replace(/"/g,'&quot;')}">
          <div class="fruite-img">
            <img src="${p.image}" class="img-fluid w-100 rounded-top border border-secondary" alt="${p.name}">
          </div>
          ${p.label ? `<div class="text-white bg-secondary px-3 py-1 rounded position-absolute" style="top:10px;left:10px;font-size:12px">${p.label}</div>` : ''}
          <div class="p-4 border border-secondary border-top-0 rounded-bottom d-flex flex-column">
            <h4 class="mb-2">${p.name}</h4>
            ${p.line1 ? `<p class="mb-1 text-muted">${p.line1}</p>` : ''}
            ${p.line2 ? `<p class="mb-2 text-muted">${p.line2}</p>` : ''}
            ${p.sku   ? `<p class="mb-2 small text-secondary">SKU: ${p.sku}</p>` : ''}
            ${priceText ? `<p class="mb-3 fw-semibold">${priceText}</p>` : `<p class="mb-3"></p>`}
            <div class="mt-auto d-flex justify-content-between gap-2">
           
              <a href="contact.html" class="btn border border-secondary rounded-pill px-3 text-primary">
                <i class="fa fa-paper-plane me-2 text-primary"></i><span>${LABELS.contact}</span>
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
  function closePopup(){ popup.classList.add('hidden'); }
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

    // Tập category có trong dữ liệu (theo RULES)
    const foundSet = new Set([SEE_ALL]);
    for (const p of allProducts) {
      foundSet.add(detectCategoryByName(p.name));
    }

    // Order theo CATEGORY_RULES, SEE ALL đứng đầu
    const ordered = [SEE_ALL, ...CATEGORY_RULES.map(r => r.name).filter(n => foundSet.has(n))];

    slot.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          ${currentCategory}
        </button>
        <ul class="dropdown-menu">
          ${ordered.map(n => `
            <li><a class="dropdown-item ${n===currentCategory?'active':''}" href="#" data-cat="${n}">${n}</a></li>
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
          ${Array.from({length: totalPages}, (_,i) => {
            const n = i+1;
            return `<option value="${n}" ${n===currentPage?'selected':''}>${LABELS.page} ${n}/${totalPages}</option>`;
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
    select.onchange   = () => { currentPage = parseInt(select.value, 10); renderProducts(); };

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
    renderCategoryDropdown();        // build menu theo dữ liệu thực tế
    applyFilter();                   // lọc lần đầu theo ?cat (nếu có)

    // Nếu ?page vượt quá max khi lọc, đưa về trang 1
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
})();
