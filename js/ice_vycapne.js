// /js/products.js

(async function () {
  const GRID_SELECTOR = '#product-grid';
  const DATA_URL = 'js/data/ice_machine/ice_vycapne.json'; // Đổi đường dẫn nếu cần

  const PAGE_SIZE = 5; // 👉 Mỗi lần mở thêm 5 sp
  let visible = PAGE_SIZE;
  let allProducts = [];

  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;

  // ====== NEW: tạo vùng nút Show More (chèn bằng JS, không sửa HTML) ======
  const wrap = document.createElement('div');
  wrap.className = 'w-100 d-flex justify-content-center my-3';
  const showMoreBtn = document.createElement('button');
  showMoreBtn.type = 'button';
  showMoreBtn.id = 'show-more-btn';
  showMoreBtn.className = 'btn btn-outline-primary rounded-pill px-4';
  showMoreBtn.textContent = 'Show more';
  wrap.appendChild(showMoreBtn);
  grid.insertAdjacentElement('afterend', wrap);

  // ====== NEW: tham chiếu popup (cần có trong HTML) ======
  const popup = document.getElementById('product-popup');
  const popupImg = document.getElementById('popup-img');
  const popupName = document.getElementById('popup-name');
  const popupDim = document.getElementById('popup-dim');
  const popupPrice = document.getElementById('popup-price');
  const popupClose = document.querySelector('.product-popup-close');

  // Format tiền tệ: cs-CZ, nhưng vẫn giữ "Kč bez DPH" theo yêu cầu
  const fmtPrice = (value) => {
    const formatted = new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    return `${formatted} Kč bez DPH`;
  };

  // GIỮ NGUYÊN thứ tự như đoạn 1: { w, d, h } => Š, H, V
  const fmtDims = ({ w, d, h }) => `Š: ${w}\u00A0 H: ${d}\u00A0 V: ${h}`;

  const cardHTML = (p) => `
    <div class="col-md-6 col-lg-4 col-xl-3">
      <div class="rounded position-relative fruite-item" data-id="${p.id}">
        <div class="fruite-img ">
          <img src="${p.image}"
               class="img-fluid w-100 rounded-top border border-secondary" 
               alt="${p.name}">
        </div>
        ${p.label ? `
        <div class="text-white bg-secondary px-3 py-1 rounded position-absolute"
             style="top: 10px; left: 10px;font-size:12px">${p.label}</div>` : ''}
        <div class="p-4 border border-secondary border-top-0 rounded-bottom">
          <h4>${p.name}</h4>
          <p>${fmtDims(p.dimensions)}</p>
          <div class="d-flex justify-content-between flex-lg-wrap">
            <p class="text-dark fs-7 fw-bold mb-0">${fmtPrice(p.price)}</p>
            <a href="#"
               class="btn border border-secondary rounded-pill px-3 text-primary add-to-cart"
               data-id="${p.id}"
               data-name="${p.name}"
               data-price="${p.price}"
               data-currency="${p.currency || 'Kč'}"
               data-image="${p.image}">
              <i class="fa fa-shopping-bag me-2 text-primary"></i>
              <span>Add to Cart</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  // ====== RENDER: chỉ render đến 'visible' sản phẩm ======
  const renderProducts = () => {
    const slice = allProducts.slice(0, visible);
    grid.innerHTML = slice.map(cardHTML).join('');
    attachClickHandlers(); // gắn click phóng to sau khi render
    updateShowMore();      // cập nhật trạng thái nút
  };

  // ====== NEW: hàm mở/đóng popup ======
  function openPopup(p) {
    if (!popup) return;
    if (popupImg)   { popupImg.src = p.image; popupImg.alt = p.name; }
    if (popupName)  popupName.textContent = p.name;
    if (popupDim)   popupDim.textContent = fmtDims(p.dimensions);
    if (popupPrice) popupPrice.textContent = fmtPrice(p.price);
    popup.classList.remove('hidden');
  }
  function closePopup() { if (popup) popup.classList.add('hidden'); }

  if (popupClose) popupClose.addEventListener('click', closePopup);
  if (popup) {
    // click ra nền tối để đóng
    popup.addEventListener('click', (e) => { if (e.target === popup) closePopup(); });
  }

  // ====== gắn click vào card (trừ nút Add to Cart) ======
  function attachClickHandlers() {
    grid.querySelectorAll('.fruite-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('a.add-to-cart')) return; // không mở popup khi bấm Add to Cart
        const id = item.dataset.id;
        const p = allProducts.find(x => String(x.id) === String(id));
        if (p) openPopup(p);
      });
    });
  }

  // ====== NEW: điều khiển nút Show More ======
  function updateShowMore() {
    if (!showMoreBtn) return;
    const hasMore = visible < allProducts.length;
    showMoreBtn.style.display = hasMore ? '' : 'none';
  }

  showMoreBtn.addEventListener('click', () => {
    visible = Math.min(visible + PAGE_SIZE, allProducts.length);
    renderProducts();
    // (tuỳ chọn) scroll nhẹ đến cuối grid cho mượt
    // wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Simple loading UI
  grid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border" role="status" aria-label="loading"></div>
    </div>
  `;

  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json();

    // Validate nhẹ
    const safe = Array.isArray(products) ? products.filter(p =>
      p && p.id && p.name && p.image && p.dimensions && typeof p.price === 'number'
    ) : [];

    allProducts = safe;
    visible = Math.min(PAGE_SIZE, allProducts.length);
    renderProducts();

    // Add to Cart (giữ nguyên, lắng nghe trên grid để không mất khi re-render)
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
      a.querySelector('span').textContent = 'Added!';
      setTimeout(() => {
        a.classList.remove('disabled');
        a.querySelector('span').textContent = 'Add to Cart';
      }, 1200);
    });

  } catch (err) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger" role="alert">
          Không tải được danh sách sản phẩm. Vui lòng thử lại sau.
        </div>
      </div>
    `;
    if (showMoreBtn) showMoreBtn.style.display = 'none';
    console.error('Load products failed:', err);
  }
})();
