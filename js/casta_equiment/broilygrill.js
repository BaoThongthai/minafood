// /js/products.js

(async function () {
  const GRID_SELECTOR = '#product-grid';
  const DATA_URL = 'js/casta_equiment/data/broilygrill.json'; // Đường dẫn JSON

  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;

  // Định dạng kích thước: Š (width) - V (height) - H (depth)
  const fmtDims = ({ w, h, d }) => `Š: ${w}\u00A0 V: ${h}\u00A0 H: ${d}`;

  // Template hiển thị sản phẩm
  const cardHTML = (p) => `
    <div class="col-md-6 col-lg-4 col-xl-3">
      <div class="rounded position-relative fruite-item">
        <div class="fruite-img">
          <img src="${p.image}"
               class="img-fluid w-100 rounded-top border border-secondary"
               alt="${p.name}">
        </div>
        ${p.label ? `
        <div class="text-white bg-secondary px-3 py-1 rounded position-absolute"
             style="top: 10px; left: 10px;">${p.label}</div>` : ''}
        <div class="p-4 border border-secondary border-top-0 rounded-bottom">
          <h4>${p.name}</h4>
          <p>${fmtDims(p.dimensions)}</p>
          <p>Peso: ${p.weight} kg</p>
          <div class="d-flex justify-content-end">
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

  // Render danh sách
  const renderProducts = (list) => {
    grid.innerHTML = list.map(cardHTML).join('');
  };

  // Loading spinner
  grid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border" role="status" aria-label="loading"></div>
    </div>
  `;

  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json();

    // Lọc hợp lệ (bắt buộc có name, image, dimensions)
    const safe = Array.isArray(products)
      ? products.filter(p => p && p.name && p.image && p.dimensions)
      : [];

    renderProducts(safe);
  } catch (err) {
    console.error('Load products failed:', err);
    grid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger" role="alert">
          Không tải được danh sách sản phẩm. Vui lòng thử lại sau.
        </div>
      </div>
    `;
  }
})();
