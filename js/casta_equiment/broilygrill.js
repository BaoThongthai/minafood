// /js/products.js

(async function () {
  const GRID_SELECTOR = '#product-grid';
  const DATA_URL = 'js/casta_equiment/data/broilygrill.json'; // Đổi đường dẫn nếu cần

  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;

  // Format tiền tệ: cs-CZ, giữ "Kč bez DPH"
  const fmtPrice = (value) => {
    const formatted = new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    return `${formatted} Kč bez DPH`;
  };

  // CHỈ 3 CHỈ SỐ: Š (width) - V (height) - H (depth) theo đúng thứ tự ảnh
  const fmtDims = ({ w, d, h }) => `Š: ${w}\u00A0 V: ${h}\u00A0 H: ${d}`;

  // Helper tạo link sang contact kèm query
  const contactHref = (p) => {
    const qs = new URLSearchParams({
      product_id: p.id,
      product_name: p.name
    }).toString();
    return `contact.html?${qs}`;
  };

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
            <p class="text-dark fs-5 fw-bold mb-0">${fmtPrice(p.price)}</p>
            <a href="${contactHref(p)}"
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

    // KHÔNG còn add-to-cart nên không gắn handler gì ở đây

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
