// /js/products.js
(async function () {
  const GRID_SELECTOR = '#product-grid';
  const DATA_URL = 'js/casta_equiment/data/frytezy_lady900_1.json';

  const LABELS = {
    showMore: 'Show More',
    loadingAria: 'loading',
    error: 'Không tải được danh sách sản phẩm. Vui lòng thử lại sau.',
    contact: 'Na poptávku' // 👈 thêm nhãn để mở popup
  };

  const PAGE_SIZE = 5;
  let visible = PAGE_SIZE;
  let allProducts = [];

  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;

  // Định dạng kích thước: Š (width) - V (height) - H (depth)
  const fmtDims = ({ w, h, d }) => `Š: ${w}\u00A0 V: ${h}\u00A0 H: ${d}`;
  // hàm gửi thông tin messege với sản phẩm không có giá
  const buildInquiryMessage = (p) => {
    const { w, h, d } = p.dimensions || {};
    return [
      "Hello, I want to ask about the product : ",
      `• Product name : ${p.name}`,
      `• Size : Š ${w}   V ${h}   H ${d}`,
      `• Weight : ${p.weight} kg`,
      `• Source Page : ${location.href}`
    ].join("\n");
  };

  // ---- Popup helpers (sử dụng #inquiryModal giống trang chuẩn) ----
  function openInquiry(product) {
    const modalEl = document.getElementById('inquiryModal');
    if (!modalEl) { console.warn('[Inquiry] #inquiryModal not found'); return; }
    const modal = (bootstrap?.Modal?.getInstance ? bootstrap.Modal.getInstance(modalEl) : null) || new bootstrap.Modal(modalEl);

    const inqImg = document.getElementById('inq-img');
    const inqName = document.getElementById('inq-name');
    const inqLine = document.getElementById('inq-line');
    const inqSku = document.getElementById('inq-sku');
    const inqPrice = document.getElementById('inq-price');

    const inqEmail = document.getElementById('inq-email');
    const inqPhone = document.getElementById('inq-phone');
    const inqMsg = document.getElementById('inq-message');
    const inqForm = document.getElementById('inquiryForm');
    const inqStatus = document.getElementById('inq-status');
    const inqSubmit = document.getElementById('inq-submit');

    // Lưu tạm sản phẩm vào modal để submit dùng lại
    modalEl._currentProduct = product;

    inqImg.src = product.image || 'img/placeholder.webp';
    inqImg.alt = product.name || '';
    inqName.textContent = product.name || '';
    // hiển thị line là kích thước
    inqLine.textContent = product.dimensions ? fmtDims(product.dimensions) : '';
    // không có SKU thì để trống
    inqSku.textContent = product.sku ? `SKU: ${product.sku}` : '';
    // trang Lady900 không có price → hiển thị cân nặng cho khách dễ trao đổi
    inqPrice.textContent = product.weight ? `Weight: ${product.weight} kg` : '';

    inqForm?.classList.remove('was-validated');
    if (inqEmail) inqEmail.value = '';
    if (inqPhone) inqPhone.value = '';
    if (inqMsg) inqMsg.value = '';
    if (inqStatus) inqStatus.textContent = '';

    modal.show();

    // Bind nút gửi (chỉ bind 1 lần)
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

        // Chuẩn bị tham số EmailJS (giữ đúng tên biến bạn đang dùng ở template)
        const params = {
          product_name: p.name || '',
          product_line1: p.dimensions ? fmtDims(p.dimensions) : '',
          product_line2: '', // không dùng
          product_sku: p.sku || '',
          product_price: '', // trang này không có giá
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
  }

  // Template hiển thị sản phẩm
  const cardHTML = (p, idx) => `
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
            <!-- 👇 đổi sang nút mở popup -->
            <a href="#"
               class="btn border border-secondary rounded-pill px-3 text-primary js-inquiry-btn"
               data-idx="${idx}">
              <i class="fa fa-envelope me-2 text-primary"></i>
              <span>${LABELS.contact}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render danh sách (theo số lượng 'visible')
  const renderProducts = () => {
    const slice = allProducts.slice(0, visible);
    grid.innerHTML = slice.map((p, i) => cardHTML(p, i)).join('');
    renderShowMore();
  };

  // Chèn/ẩn nút "Hiển thị thêm"
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

      const btn = moreRow.querySelector('.js-show-more-btn');
      btn.addEventListener('click', () => {
        visible += PAGE_SIZE;
        renderProducts();
      });
    }
  };

  // Ủy quyền click để mở popup khi bấm vào LABELS.contact
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-inquiry-btn');
    if (!btn) return;
    e.preventDefault();

    const idx = Number(btn.getAttribute('data-idx') || -1);
    // vì grid đang hiển thị slice(0, visible), idx ở đây map trực tiếp vào allProducts[idx]
    const product = allProducts[idx];
    if (!product) {
      console.warn('[Inquiry] product not found at index', idx);
      return;
    }
    openInquiry(product);
  });

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
