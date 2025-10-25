// /js/products.js

(async function () {
  const GRID_SELECTOR = '#product-grid';
  const DATA_URL = 'js/casta_equiment/data/frytezy_lady900_1.json'; // Đường dẫn JSON

  const LABELS = {
    showMore: 'Show More',
    loadingAria: 'loading',
    error: 'Không tải được danh sách sản phẩm. Vui lòng thử lại sau.'
  };

  const PAGE_SIZE = 5;           // 👉 Mỗi lần hiện 5 sp
  let visible = PAGE_SIZE;       // 👉 Số lượng đang hiển thị
  let allProducts = [];          // 👉 Lưu toàn bộ dữ liệu để bấm "hiển thị thêm"

  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;

  // Định dạng kích thước: Š (width) - V (height) - H (depth)
  const fmtDims = ({ w, h, d }) => `Š: ${w}\u00A0 V: ${h}\u00A0 H: ${d}`;

  // Template hiển thị sản phẩm
  const cardHTML = (p) => `
    <div class="col-md-6 col-lg-4 col-xl-3">
      <div class="rounded position-relative fruite-item h-100">
        <div class="fruite-img">
          <img src="${p.image}"
               class="img-fluid w-100 rounded-top border border-secondary"
               alt="${p.name}">
        </div>
        ${p.label ? `
        <div class="text-white bg-secondary px-3 py-1 rounded position-absolute"
             style="top: 10px; left: 10px;font-size:12px">${p.label}</div>` : ''}
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

  // Render danh sách (theo số lượng 'visible')
  const renderProducts = () => {
    const slice = allProducts.slice(0, visible);
    grid.innerHTML = slice.map(cardHTML).join('');
    renderShowMore();
  };

  // Chèn/ẩn nút "Hiển thị thêm"
  const renderShowMore = () => {
    // Nếu còn sp chưa hiển thị thì thêm 1 col full width chứa nút
    const hasMore = visible < allProducts.length;
    // Xóa nút cũ (nếu có)
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

      const btn = moreRow.querySelector('.js-show-more-btn');
      btn.addEventListener('click', () => {
        visible += PAGE_SIZE;          // 👉 Mỗi lần bấm tăng thêm 4
        renderProducts();              // 👉 Vẽ lại
      }, { once: false });
    }
  };

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

    // Lọc hợp lệ (bắt buộc có name, image, dimensions)
    allProducts = Array.isArray(products)
      ? products.filter(p => p && p.name && p.image && p.dimensions)
      : [];

    // Reset số lượng hiển thị khi load xong
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
