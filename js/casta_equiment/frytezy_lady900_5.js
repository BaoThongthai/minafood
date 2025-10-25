// /js/products.js (popup & add-to-cart + hover-zoom + click-ảnh-phóng-to)
(async function () {
  const GRID_SELECTOR = '#product-grid';
  const DATA_URL = 'js/data/ice_machine/icemaker_6g.json';

  const LABELS = {
    showMore: 'Show more',
    loadingAria: 'loading',
    error: 'Không tải được danh sách sản phẩm. Vui lòng thử lại sau.'
  };

  const PAGE_SIZE = 5;
  let visible = PAGE_SIZE;
  let allProducts = [];

  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;

  // ===== CSS nhỏ cho hover zoom =====
  (function injectHoverZoomStyles () {
    const css = `
      .js-thumb { background:#fff; display:flex; align-items:center; justify-content:center;
                  height:160px; border-bottom:1px solid #eee; overflow:hidden; }
      .js-thumb img { max-height:100%; max-width:100%; object-fit:contain; transition: transform .2s ease; }
      .js-thumb:hover img { transform: scale(1.08); }
      a.add-to-cart { cursor: pointer; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ===== Popup refs =====
  const popup = document.getElementById('product-popup');
  const popupImg = document.getElementById('popup-img');
  const popupName = document.getElementById('popup-name');
  const popupDim = document.getElementById('popup-dim');
  const popupPrice = document.getElementById('popup-price');
  const popupClose = document.querySelector('.product-popup-close');

  // ===== Formatters =====
  const fmtPrice = (value) => {
    const formatted = new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    return `${formatted} Kč bez DPH`;
  };
  const fmtDims = ({ w, d, h }) => `Š: ${w}\u00A0 V: ${h}\u00A0 H: ${d}`;

  // ===== Card =====
  const cardHTML = (p) => `
    <div class="col-md-6 col-lg-4 col-xl-3 mb-4">
      <div class="rounded position-relative h-100" data-id="${p.id}" data-name="${p.name}"
           style="border:1.5px solid #EA9A3B; border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        
        ${p.label ? `
        <div style="position:absolute; top:10px; left:10px; background:#EA9A3B; color:#fff; font-weight:600; 
                    font-size:0.8rem; padding:6px 12px; border-radius:999px; text-transform:uppercase;">
          ${p.label}
        </div>` : ''}

        <!-- Ảnh sản phẩm (hover zoom + click mở popup) -->
        <div class="js-thumb">
          <img src="${p.image}" alt="${p.name}">
        </div>

        <!-- Thông tin -->
        <div style="padding:16px; display:flex; flex-direction:column; height:calc(100% - 160px); text-align:center;">
          <h4 style="font-size:1rem; font-weight:600; margin-bottom:6px;">${p.name}</h4>

          <div style="margin-top:auto; display:flex; justify-content:center;">
            <a href="#"
               class="add-to-cart"
               data-id="${p.id}" data-name="${p.name}" data-price="${p.price}"
               data-currency="${p.currency || 'Kč'}" data-image="${p.image}"
               style="display:inline-flex; align-items:center; gap:6px; padding:8px 18px; 
                      border:1.5px solid #EA9A3B; border-radius:999px; color:#1f3353; 
                      font-weight:600; text-decoration:none; transition:all .2s ease;">
              <i class="fa fa-shopping-bag me-2 text-primary"></i>
              <span>Add to Cart</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  // ===== Render =====
  const renderProducts = () => {
    const slice = allProducts.slice(0, visible);
    grid.innerHTML = slice.map(cardHTML).join('');
    attachImageClickToEnlarge(); // ← chỉ click vào ảnh mới mở popup
    attachAddToCart();
    renderShowMore();
  };

  const renderShowMore = () => {
    const hasMore = visible < allProducts.length;
    const oldMore = grid.querySelector('.js-show-more-row');
    if (oldMore) oldMore.remove();

    if (hasMore) {
      const moreRow = document.createElement('div');
      moreRow.className = 'js-show-more-row d-flex justify-content-center w-100 mt-4';
      moreRow.innerHTML = `
        <button type="button" class="btn btn-outline-secondary px-4 rounded-pill js-show-more-btn">
          ${LABELS.showMore}
        </button>
      `;
      grid.appendChild(moreRow);

      moreRow.querySelector('.js-show-more-btn').addEventListener('click', () => {
        visible += PAGE_SIZE;
        renderProducts();
      });
    }
  };

  // ===== Popup open/close =====
  function openPopup(p) {
    if (!popup) return;
    popupImg.src = p.image;
    popupName.textContent = p.name;
    popupDim.textContent = fmtDims(p.dimensions);
    popupPrice.textContent = fmtPrice(p.price);
    popup.classList.remove('hidden');
    document.addEventListener('keydown', escCloseOnce);
  }
  function escCloseOnce(e) {
    if (e.key === 'Escape') { closePopup(); document.removeEventListener('keydown', escCloseOnce); }
  }
  function closePopup() { if (popup) popup.classList.add('hidden'); }
  if (popupClose) popupClose.addEventListener('click', closePopup);
  if (popup) popup.addEventListener('click', (e) => { if (e.target === popup) closePopup(); });

  // ===== CHỈ CLICK ẢNH để mở popup (bốc từ đoạn của bạn) =====
  function attachImageClickToEnlarge() {
    grid.querySelectorAll('.js-thumb').forEach(thumb => {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation(); // tránh lan ra card
        const card = thumb.closest('[data-id]');
        if (!card) return;
        const id = card.dataset.id;
        // Tìm theo id; nếu dữ liệu không có id chuẩn, fallback tìm theo name
        const p = allProducts.find(x => String(x.id) === String(id)) ||
                  allProducts.find(x => String(x.name) === String(card.dataset.name));
        if (p) openPopup(p);
      });
    });
  }

  // ===== Add to Cart =====
  function attachAddToCart() {
    grid.querySelectorAll('a.add-to-cart').forEach(a => {
      a.addEventListener('click', (e) => {
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
        a.querySelector('span').textContent = 'Added!';
        setTimeout(() => {
          a.classList.remove('disabled');
          a.querySelector('span').textContent = 'Add to Cart';
        }, 1200);
      });
    });
  }

  // ===== Loading =====
  grid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border" role="status" aria-label="${LABELS.loadingAria}"></div>
    </div>
  `;

  // ===== Fetch =====
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json();
    const safe = Array.isArray(products)
      ? products.filter(p =>
          p && (p.id || p.name) && p.name && p.image && p.dimensions && typeof p.price === 'number'
        )
      : [];
    allProducts = safe;
    visible = Math.min(PAGE_SIZE, allProducts.length);
    renderProducts();
  } catch (err) {
    grid.innerHTML =
      '<div class="col-12"><div class="alert alert-danger" role="alert">' +
      LABELS.error +
      '</div></div>';
    console.error('Load products failed:', err);
  }
})();
