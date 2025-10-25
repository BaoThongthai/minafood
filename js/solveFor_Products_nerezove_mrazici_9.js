// /js/products.js

(async function () {
  const GRID_SELECTOR = '#product-grid';
  const DATA_URL = 'js/data/nerezove_mrazici.json'; // Đổi đường dẫn nếu cần

  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;

  // Format tiền tệ: cs-CZ, nhưng vẫn giữ "Kč bez DPH" theo yêu cầu
  const fmtPrice = (value) => {
    // dùng Intl chỉ để chấm/phẩy theo cs-CZ, không thêm ký hiệu
    const formatted = new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    return `${formatted} Kč bez DPH`;
  };

  const fmtDims = ({ w, d, h }) => `Š: ${w}\u00A0 H: ${d}\u00A0 V: ${h}`;

  const cardHTML = (p) => `
    <div class="col-md-6 col-lg-4 col-xl-3">
      <div class="rounded position-relative fruite-item">
        <div class="fruite-img ">
          <img src="${p.image}"
               class="img-fluid w-100 rounded-top border border-secondary" 
               alt="${p.name}">
        </div>
        <div class="text-white bg-secondary px-3 py-1 rounded position-absolute"
             style="top: 10px; left: 10px;">${p.label || ''}</div>
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

  // Render helpers
  const renderProducts = (list) => {
    grid.innerHTML = list.map(cardHTML).join('');
  };

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

    renderProducts(safe);

    // Gắn click handler Add to Cart
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

      // TODO: nối vào giỏ hàng thật của bạn.
      // Ở đây demo: phát sự kiện để nơi khác lắng nghe
      document.dispatchEvent(new CustomEvent('cart:add', { detail: item }));

      // Feedback nhẹ
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
    console.error('Load products failed:', err);
  }
})();
