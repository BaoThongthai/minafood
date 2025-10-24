// /js/products.js

(async function () {
  const GRID_SELECTOR = '#product-grid';
  const DATA_URL = 'js/casta_equiment/data/frytezy_fast700.json';

  const LABELS = {
    showMore: 'Hiển thị thêm',
    loadingAria: 'loading',
    error: 'Không tải được danh sách sản phẩm. Vui lòng thử lại sau.'
  };

  const PAGE_SIZE = 4;
  let visible = PAGE_SIZE;
  let allProducts = [];

  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;

  const fmtDims = ({ w, h, d }) => `Š: ${w}\u00A0 V: ${h}\u00A0 H: ${d}`;

  const cardHTML = (p) => {
    const imgSrc = p.image || 'img/placeholder.webp'; // fallback nếu JSON không có image
    return `
      <div class="col-md-6 col-lg-4 col-xl-3">
        <div class="rounded position-relative fruite-item h-100" data-id="${p.name}">
          <div class="fruite-img">
            <img src="${imgSrc}"
                 class="img-fluid w-100 rounded-top border border-secondary"
                 alt="${p.name}">
          </div>
          ${p.label ? `
          <div class="text-white bg-secondary px-3 py-1 rounded position-absolute"
               style="top: 10px; left: 10px;">${p.label}</div>` : ''}
          <div class="p-4 border border-secondary border-top-0 rounded-bottom d-flex flex-column">
            <h4 class="mb-2">${p.name}</h4>
            <p class="mb-1">${fmtDims(p.dimensions)}</p>
            <p class="mb-3">Peso: ${p.weight} kg</p>
            <div class="mt-auto d-flex justify-content-end">
              <a href="contact.html"
                 class="btn border border-secondary rounded-pill px-3 text-primary"
                 aria-label="Na poptávku">
                <i class="fa fa-paper-plane me-2 text-primary"></i>
                <span>Na poptávku</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // --- Popup elements ---
  const popup = document.getElementById('product-popup');
  const popupImg = document.getElementById('popup-img');
  const popupName = document.getElementById('popup-name');
  const popupDim = document.getElementById('popup-dim');
  const popupWeight = document.getElementById('popup-weight');
  const popupClose = document.querySelector('.product-popup-close');

  function openPopup(p) {
    popupImg.src = p.image || 'img/placeholder.webp';
    popupImg.alt = p.name;
    popupName.textContent = p.name;
    popupDim.textContent = fmtDims(p.dimensions);
    popupWeight.textContent = `Peso: ${p.weight} kg`;
    popup.classList.remove('hidden');
  }
  function closePopup() { popup.classList.add('hidden'); }
  if (popupClose) popupClose.addEventListener('click', closePopup);
  if (popup) popup.addEventListener('click', (e) => { if (e.target === popup) closePopup(); });

  function attachClickHandlers() {
    grid.querySelectorAll('.fruite-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const p = allProducts.find(prod => prod.name === id);
        if (p) openPopup(p);
      });
    });
  }

  // Render danh sách (theo số lượng 'visible')
  function renderProducts() {
    const slice = allProducts.slice(0, visible);
    grid.innerHTML = slice.map(cardHTML).join('');
    renderShowMore();
    attachClickHandlers(); // ✅ gắn sự kiện sau khi vẽ
  }

  // Chèn/ẩn nút "Hiển thị thêm"
  function renderShowMore() {
    const hasMore = visible < allProducts.length;
    const oldMore = grid.querySelector('.js-show-more-row');
    if (oldMore) oldMore.remove();

    if (hasMore) {
      const moreRow = document.createElement('div');
      moreRow.className = 'col-12 text-center js-show-more-row';
      moreRow.innerHTML = `
        <button type="button" class="btn btn-outline-secondary px-4 rounded-pill js-show-more-btn">
          ${LABELS.showMore}
        </button>
      `;
      grid.appendChild(moreRow);

      const btn = moreRow.querySelector('.js-show-more-btn');
      btn.addEventListener('click', () => {
        visible += PAGE_SIZE;
        renderProducts();
      });
    }
  }

  // Loading spinner
  grid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border" role="status" aria-label="${LABELS.loadingAria}"></div>
    </div>
  `;

  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json();

    // KHÔNG bắt buộc p.image (theo quy ước mới)
    allProducts = Array.isArray(products)
      ? products.filter(p => p && p.name && p.dimensions)
      : [];

    visible = Math.min(PAGE_SIZE, allProducts.length);
    renderProducts();
  } catch (err) {
    console.error('Load products failed:', err);
    grid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger" role="alert">
          ${LABELS.error}
        </div>
      </div>
    `;
  }
})();
