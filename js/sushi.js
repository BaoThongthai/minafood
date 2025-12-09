// js/speed_oven_filter.js
// Load JSON Combisteel + render product grid + filter như hình screenshot

(async function () {
  const GRID_SELECTOR = "#product-grid";
  const FILTER_PANEL_SELECTOR = "#filter-panel";
  const PAGER_SLOT = "#pager-slot";

  // TODO: sửa lại path JSON đúng với bạn
  // SỬA: Cập nhật đường dẫn JSON mới
  const DATA_URL = "js/data/sushi.json";

  const LABELS = {
    loadingAria: "loading",
    error: "Không tải được danh sách sản phẩm. Vui lòng thử lại sau.",
    addToCart: "Add to Cart",
    added: "Added!",
    contact: "Na poptávku",
    shoppingOptions: "Shopping options",
  };

  const PAGE_SIZE = 24;

  let allProducts = [];
  let filteredProducts = [];

  // ===== POPUP DOM =====
  const popup = document.getElementById("product-popup");
  const popupImg = document.getElementById("popup-img");
  const popupName = document.getElementById("popup-name");
  const popupDim = document.getElementById("popup-dim");
  const popupWeight = document.getElementById("popup-weight");
  const popupClose = document.querySelector(".product-popup-close");

  const grid = document.querySelector(GRID_SELECTOR);
  const filterPanel = document.querySelector(FILTER_PANEL_SELECTOR);

  if (!grid || !filterPanel) return;

  const txt = (v) => (v ?? "").toString().trim();

  // SỬA: Hàm normalize để xử lý cấu trúc JSON mới
  function normalize(raw) {
    const s = raw.specs || {}; // Giữ lại để tương thích với cấu trúc cũ nếu có
    const dim = raw.dimensions || {};

    const price = Number.isFinite(Number(raw.price))
      ? Number(raw.price)
      : null;

    return {
      id: raw.id || raw.name || "",
      sku: raw.id || "", // Dùng 'id' làm 'sku' nếu không có trường 'code'
      name: txt(raw.name),
      href: raw.url || "#",
      image: raw.image || "img/placeholder.webp",
      price,
      currency: txt(raw.currency) || "CZK",
      price_text_raw: txt(raw.status), // Sử dụng 'status' hoặc 'availability' cho price_text_raw nếu cần hiển thị

      // kích thước - LẤY TỪ raw.dimensions
      // Chú ý: Dữ liệu JSON mới cho 'w', 'd', 'h' là chuỗi số, ta chuyển sang Number.
      width_mm: dim.w != null ? Number(dim.w) : null,
      depth_mm: dim.d != null ? Number(dim.d) : null,
      height_mm: dim.h != null ? Number(dim.h) : null,

      // các thông số chung - Tạm thời giữ nguyên các key cũ và set rỗng/null vì JSON mới không có.
      // Nếu bạn muốn lọc theo 'availability'/'status' thì cần bổ sung vào FILTER_CONFIG
      material: txt(s.material),
      version: txt(s.version),
      parcel_ready: txt(s.parcel_ready),
      piezo_ignition: txt(s.piezo_ignition),
      model_type: txt(s["model_tabletop/_freestanding/drop-in"]),
      voltage: txt(s.voltage),

      // field riêng cho bộ filter mới
      insulation_thickness: txt(s.insulation_thickness),
      griddle_surface: txt(s.griddle_surface),
      energy_label: txt(s.energy_label),
      mobile: txt(s.mobile),
      lockable: txt(s.lockable),
      type_of_cooling: txt(s.type_of_cooling),
      drain_valve: txt(s.drain_valve),
      cooling_agent: txt(s.cooling_agent),
      lights: txt(s.lights),
      operation: txt(s.operation),
      color: txt(s.color),
      dishwasher_proof: txt(s.dishwasher_proof),
      execution_window: txt(s.execution_window),

      // Thêm trường mới nếu cần:
      availability: txt(raw.availability), // "In stock" / "On order"
      status: txt(raw.status), // "Na sklade" / "Na objednávku"

      // === CATEGORY ===
      category: "Sushi Cabinet", // Hardcode category vì JSON mới không có field này
    };
  }


  const fmtPrice = (price, currency) => {
    if (price == null || isNaN(price) || Number(price) <= 0) return "";
    const formatted = new Intl.NumberFormat("cs-CZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(price));
    const tail = (currency || "Kč bez DPH").trim();
    return `${formatted} ${tail}`.trim();
  };

  const buildInquiryMessage = (p = {}) => {
    const lines = [
      "Hello, I want to ask about this product:",
      p.name ? `• Name: ${p.name}` : "",
      p.sku ? `• Code: ${p.sku}` : "",
      `• Source Page: ${location.href}`,
    ].filter(Boolean);
    return lines.join("\n");
  };

  // ===== CARD HTML =====
  function cardHTML(p) {
    const priceText = fmtPrice(p.price, p.currency);
    const hasPrice = Number.isFinite(p.price) && Number(p.price) > 0;
    const msg = encodeURIComponent(buildInquiryMessage(p));

    const dimText =
      p.width_mm || p.depth_mm || p.height_mm
        ? [
          p.width_mm ? `${p.width_mm} mm` : "",
          p.depth_mm ? `x ${p.depth_mm} mm` : "",
          p.height_mm ? `x ${p.height_mm} mm` : "",
        ]
          .join(" ")
          .trim()
        : "";

    // SỬA: Hiển thị thêm trạng thái hàng (availability/status)
    const statusText = p.status ? `<p class="mb-1 small text-info">Status: ${p.status}</p>` : '';


    return `
      <div class="col-md-6 col-lg-4">
        <div class="rounded position-relative fruite-item h-100"
              data-id="${String(p.id).replace(/"/g, "&quot;")}">
          <div class="fruite-img">
            <img src="${p.image}"
                  class="img-fluid w-100 rounded-top border border-secondary"
                  alt="${p.name}">
          </div>
          <div class="p-4 border border-secondary border-top-0 rounded-bottom d-flex flex-column">
            <h4 class="mb-2 line-clamp-2 product-name" title="${p.name}">${p.name}</h4>
            ${p.sku
        ? `<p class="mb-1 small text-secondary" title="Code: ${p.sku}">Code: ${p.sku}</p>`
        : ""
      }
            ${dimText
        ? `<p class="mb-1 small text-secondary">${dimText}</p>`
        : ""
      }
            ${statusText} ${priceText
        ? `<p class="mb-3 fw-semibold">${priceText}</p>`
        : `<p class="mb-3"></p>`
      }

            <div class="mt-auto d-flex justify-content-between gap-2">
              ${hasPrice && p.availability === 'In stock' // Thêm điều kiện chỉ "Add to Cart" nếu có giá và có sẵn
        ? `
                    <a href="#"
                        class="btn border border-secondary rounded-pill px-3 text-primary add-to-cart"
                        data-id="${String(p.id).replace(/"/g, "&quot;")}"
                        data-name="${String(p.name).replace(/"/g, "&quot;")}"
                        data-price="${p.price ?? ""}"
                        data-currency="${p.currency || "CZK"}"
                        data-image="${p.image}">
                        <i class="fa fa-shopping-bag me-2 text-primary"></i>
                        <span>${LABELS.addToCart}</span>
                    </a>`
        : `
                    <a href="/contact.html?msg=${msg}"
                        class="btn border border-secondary rounded-pill px-3 text-primary"
                        aria-label="${LABELS.contact}">
                        <i class="fa fa-envelope me-2 text-primary"></i>
                        <span>${LABELS.contact}</span>
                    </a>`
      }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ===== POPUP =====
  function openPopup(p) {
    if (!popup) return;
    popupImg.src = p.image || "img/placeholder.webp";
    popupImg.alt = p.name || "";
    popupName.textContent = p.name || "";

    const dimLines = [];
    if (p.width_mm != null) dimLines.push(`Width: ${p.width_mm} mm`);
    if (p.depth_mm != null) dimLines.push(`Depth: ${p.depth_mm} mm`);
    if (p.height_mm != null) dimLines.push(`Height: ${p.height_mm} mm`);

    // SỬA: Thêm status/availability vào popup
    const statusLine = p.status ? `<div class="mb-1 small text-info">Status: ${p.status}</div>` : '';

    popupDim.innerHTML = `
      ${p.sku
        ? `<div class="mb-1 small text-muted"><strong>Code: ${p.sku}</strong></div>`
        : ""
      }
      ${statusLine}
      ${dimLines.length
        ? `<div class="mt-2 small">${dimLines.join("<br>")}</div>`
        : ""
      }
    `;

    const priceText = fmtPrice(p.price, p.currency);
    popupWeight.textContent = priceText || p.price_text_raw || "";
    popup.classList.remove("hidden");
  }

  function closePopup() {
    if (!popup) return;
    popup.classList.add("hidden");
  }

  if (popupClose) popupClose.addEventListener("click", closePopup);
  if (popup) {
    popup.addEventListener("click", (e) => {
      if (e.target === popup) closePopup();
    });
  }

  function attachCardHandlers() {
    grid.querySelectorAll(".fruite-item").forEach((item) => {
      item.addEventListener("click", (ev) => {
        if (ev.target.closest("a,button")) return;
        const id = item.dataset.id;
        const p =
          filteredProducts.find((prod) => String(prod.id) === String(id)) ||
          allProducts.find((prod) => String(prod.id) === String(id));
        if (p) openPopup(p);
      });
    });
  }

  // ===== PAGINATION - Giữ nguyên logic cũ =====
  function getCurrentPage() {
    const qs = new URLSearchParams(location.search);
    const p = parseInt(qs.get("page") || "1", 10);
    return isNaN(p) || p < 1 ? 1 : p;
  }

  function renderPager(totalItems) {
    const slot = document.querySelector(PAGER_SLOT);
    if (!slot) return;

    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (totalPages <= 1) {
      slot.innerHTML = "";
      return;
    }

    let currentPage = getCurrentPage();
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const pages = [];
    const push = (n) => pages.push(n);
    const addRange = (a, b) => {
      for (let i = a; i <= b; i++) pages.push(i);
    };

    const first = 1;
    const last = totalPages;
    const centerSpan = 2;

    push(first);
    let start = Math.max(first + 1, currentPage - centerSpan);
    let end = Math.min(last - 1, currentPage + centerSpan);

    const midCount = end >= start ? end - start + 1 : 0;
    let missing = centerSpan * 2 + 1 - midCount;
    while (missing > 0 && start > first + 1) {
      start--;
      missing--;
    }
    while (missing > 0 && end < last - 1) {
      end++;
      missing--;
    }

    if (start > first + 1) pages.push("...");
    if (end >= start) addRange(start, end);
    if (end < last - 1) pages.push("...");
    if (last > first) push(last);

    slot.innerHTML = `
      <div class="mf-pager-wrap">
        <nav class="mf-pager" aria-label="Pagination">
          <a href="#" class="mf-pg-btn ${currentPage === 1 ? "is-disabled" : ""}" data-page="${currentPage - 1
      }" aria-label="Previous">‹</a>
          ${pages
        .map((p) =>
          p === "..."
            ? `<span class="mf-pg-ellipsis">…</span>`
            : `<a href="#" class="mf-pg-btn ${p === currentPage ? "is-active" : ""
            }" data-page="${p}">${p}</a>`
        )
        .join("")}
          <a href="#" class="mf-pg-btn ${currentPage === totalPages ? "is-disabled" : ""
      }" data-page="${currentPage + 1}" aria-label="Next">›</a>
        </nav>
      </div>
    `;

    slot.querySelectorAll(".mf-pg-btn").forEach((btn) => {
      const page = parseInt(btn.getAttribute("data-page"), 10);
      if (isNaN(page)) return;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (page < 1 || page > totalPages || page === currentPage) return;
        const url = new URL(location.href);
        url.searchParams.set("page", String(page));
        history.replaceState(null, "", url);
        renderProducts();
      });
    });
  }

  // ===== FILTER CONFIG - Cần điều chỉnh nếu bạn muốn lọc theo Kích thước mới hoặc Availability/Status =====
  const FILTERS_STATE = {
    category: null,

    depth: null,
    height: null,
    width: null,
    insulation_thickness: null,
    price: null,

    // SỬA: Thêm trạng thái có sẵn (Nếu bạn muốn dùng filter này)
    availability: null,

    material: null,
    version: null,
    griddle_surface: null,
    energy_label: null,
    defrost: null,
    mobile: null,
    lockable: null,
    type_of_cooling: null,
    drain_valve: null,
    cooling_agent: null,

    lights: null,
    parcel_ready: null,
    piezo_ignition: null,
    operation: null,
    model_type: null,
    voltage: null,
    color: null,
    dishwasher_proof: null,
    execution_window: null,
  };

  const CATEGORY_ORDER = [
    "Sushi Cabinet", // SỬA: Cập nhật Category mới
    "Combisteamers",
    "Convection ovens",
    "Microwaves",
    "Oven supports and accessories",
    "Generic",
  ];

  const FILTER_CONFIG = {


    // === SIZE ===
    // GIỮ NGUYÊN cấu hình bucket, chỉ cần đảm bảo hàm normalize đã lấy đúng width_mm, depth_mm, height_mm
    depth: {
      label: "DEPTH (mm)",
      key: "depth_mm",
      type: "range",
      buckets: [
        // Dựa vào JSON mẫu (d = 345mm), có thể làm hẹp lại khoảng này nếu cần
        { id: "d-300-399", label: "300 – 399", min: 300, max: 399 },
        { id: "d-400-599", label: "400 – 599", min: 400, max: 599 },
        { id: "d-600-799", label: "600 – 799", min: 600, max: 799 },
      ],
    },
    height: {
      label: "HEIGHT (mm)",
      key: "height_mm",
      type: "range",
      buckets: [
        // Dựa vào JSON mẫu (h = 270mm)
        { id: "h-0-299", label: "0 – 299", min: 0, max: 299 },
        { id: "h-300-599", label: "300 – 599", min: 300, max: 599 },
        { id: "h-600-999", label: "600 – 999", min: 600, max: 999 },
      ],
    },
    width: {
      label: "WIDTH (mm)",
      key: "width_mm",
      type: "range",
      buckets: [
        // Dựa vào JSON mẫu (w = 1200, 1500, 1800, 2100mm)
        { id: "w-1000-1299", label: "1000 – 1299", min: 1000, max: 1299 },
        { id: "w-1300-1599", label: "1300 – 1599", min: 1300, max: 1599 },
        { id: "w-1600-1899", label: "1600 – 1899", min: 1600, max: 1899 },
        { id: "w-1900-plus", label: "1900 +", min: 1900, max: 3000 },
      ],
    },

    // SỬA: Thêm bộ lọc Availability nếu cần
    availability: {
      label: "AVAILABILITY",
      key: "availability",
      type: "value",
      buckets: [
        { id: "av-instock", label: "In stock", value: "In stock" },
        { id: "av-onorder", label: "On order", value: "On order" },
      ],
    },

    // === PRICE ===
    price: {
      label: "PRICE (Kč)",
      key: "price",
      type: "range",
      buckets: [
        // Dựa vào JSON mẫu (giá khoảng 79k - 121k)
        { id: "p-0-79999", label: "Kč 0.00 – 79,999.99", min: 0, max: 79999.99 },
        { id: "p-80000-99999", label: "Kč 80,000.00 – 99,999.99", min: 80000, max: 99999.99 },
        { id: "p-100000-plus", label: "Kč 100,000.00 and above", min: 100000, max: Infinity },
      ],
    },

    // Loại bỏ các bộ lọc không còn liên quan nếu không có dữ liệu
    // Ví dụ: material, version, griddle_surface, ... có thể bỏ đi
    // Tuy nhiên, tôi GIỮ NGUYÊN cấu hình cũ để đảm bảo không lỗi nếu các trường này được điền trong tương lai.
    // Bạn có thể tự mình xóa các nhóm filter không sử dụng trong FILTER_CONFIG.

    // ... (Giữ nguyên các FILTER_CONFIG khác)
    insulation_thickness: { /* ... */ },
    material: { /* ... */ },
    version: { /* ... */ },
    griddle_surface: { /* ... */ },
    energy_label: { /* ... */ },
    defrost: { /* ... */ },
    mobile: { /* ... */ },
    lockable: { /* ... */ },
    type_of_cooling: { /* ... */ },
    drain_valve: { /* ... */ },
    cooling_agent: { /* ... */ },
    lights: { /* ... */ },
    parcel_ready: { /* ... */ },
    piezo_ignition: { /* ... */ },
    operation: { /* ... */ },
    model_type: { /* ... */ },
    voltage: { /* ... */ },
    color: { /* ... */ },
    dishwasher_proof: { /* ... */ },
    execution_window: { /* ... */ },
  };


  function matchBucket(p, conf, bucket) {
    const val = p[conf.key];
    if (conf.type === "range") {
      if (!Number.isFinite(val)) return false;
      return val >= bucket.min && val <= bucket.max;
    }
    if (conf.type === "value") {
      return txt(val).toLowerCase() === txt(bucket.value).toLowerCase();
    }
    return true;
  }

  // ===== BUILD FILTER UI - Giữ nguyên logic cũ =====
  function buildFilterPanel() {
    const total = allProducts.length;

    // Lọc ra các nhóm filter không có sản phẩm nào khớp để không hiển thị (tùy chọn)
    const activeFilterGroups = Object.entries(FILTER_CONFIG).filter(([groupId, conf]) => {
      if (conf.type === "range") {
        // Với range, kiểm tra xem có sản phẩm nào có giá trị không null/NaN không
        return allProducts.some(p => Number.isFinite(p[conf.key]));
      }
      if (conf.type === "value") {
        // Với value, kiểm tra xem có bucket nào có count > 0 không
        return conf.buckets.some(b => allProducts.filter(p => matchBucket(p, conf, b)).length > 0);
      }
      return false;
    });


    const groupsHtml = activeFilterGroups
      .map(([groupId, conf]) => {
        const bucketHtml = conf.buckets
          .map((b) => {
            const count = allProducts.filter((p) =>
              matchBucket(p, conf, b)
            ).length;

            // Ẩn bucket nếu count = 0 (tùy chọn)
            if (count === 0) return '';

            return `
              <a href="#"
                  class="d-flex justify-content-between py-1 mf-filter-link"
                  data-group="${groupId}"
                  data-bucket-id="${b.id}">
                <span>${b.label}</span>
                <span class="count text-muted">(${count})</span>
              </a>
            `;
          })
          .join("");

        // Ẩn cả nhóm filter nếu không có bucket nào hiển thị
        if (bucketHtml.trim() === '') return '';

        return `
          <div class="filter-option mb-3 pb-3 border-bottom" data-group="${groupId}">
            <div class="filter-options-title d-flex justify-content-between align-items-center cursor-pointer text-normal"
                  data-toggle="collapse">
              <span class="title text-normal text-uppercase">${conf.label}</span>
              <span class="text-normal">
                <i class="fa-solid fa-chevron-down" style="transition: transform .3s"></i>
              </span>
            </div>
            <div class="filter-options-content pt-2">
              ${bucketHtml}
            </div>
          </div>
        `;
      })
      .join("");

    filterPanel.innerHTML = `
      <div class="mb-3">
        <strong>${LABELS.shoppingOptions}</strong>
      </div>
      ${groupsHtml}
    `;

    // toggle open/close (accordion style)
    filterPanel.querySelectorAll(".filter-option").forEach((opt) => {
      const header = opt.querySelector(".filter-options-title");
      const content = opt.querySelector(".filter-options-content");
      const icon = opt.querySelector("i.fa-chevron-down");

      // ✅ mặc định ĐÓNG khi load trang
      content.style.display = "none";
      if (icon) icon.style.transform = "rotate(0deg)"; // Đóng: Mũi tên xuống

      header.addEventListener("click", () => {
        const isOpen = content.style.display !== "none";
        content.style.display = isOpen ? "none" : "block";
        // Mở ra: Mũi tên quay lên (hoặc ngược lại tùy bạn thích)
        if (icon) icon.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
      });
    });


    // click filter
    filterPanel.addEventListener("click", (e) => {
      const link = e.target.closest(".mf-filter-link");
      if (!link) return;
      e.preventDefault();

      const group = link.dataset.group;
      const bucketId = link.dataset.bucketId;
      if (!group || !bucketId) return;

      // toggle: click lại lần nữa thì bỏ filter
      if (FILTERS_STATE[group] === bucketId) {
        FILTERS_STATE[group] = null;
        link.classList.remove("active");
      } else {
        FILTERS_STATE[group] = bucketId;

        // set active trong group
        filterPanel
          .querySelectorAll(`.mf-filter-link[data-group="${group}"]`)
          .forEach((a) => a.classList.remove("active"));
        link.classList.add("active");
      }

      // reset page về 1
      const url = new URL(location.href);
      url.searchParams.set("page", "1");
      history.replaceState(null, "", url);

      applyFilters();
      renderProducts();
    });
  }

  // ===== APPLY FILTERS - Giữ nguyên logic cũ =====
  function applyFilters() {
    let list = allProducts.slice();

    Object.entries(FILTERS_STATE).forEach(([groupId, bucketId]) => {
      if (!bucketId) return;
      const conf = FILTER_CONFIG[groupId];
      if (!conf) return;
      const bucket = conf.buckets.find((b) => b.id === bucketId);
      if (!bucket) return;

      list = list.filter((p) => matchBucket(p, conf, bucket));
    });

    filteredProducts = list;
  }

  function renderProducts() {
    const page = getCurrentPage();
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = filteredProducts.slice(start, end);

    grid.innerHTML = pageItems.map(cardHTML).join("");
    attachCardHandlers();
    renderPager(filteredProducts.length);
  }

  // ===== ADD TO CART - Giữ nguyên logic cũ =====
  grid.addEventListener("click", (e) => {
    const a = e.target.closest("a.add-to-cart");
    if (!a) return;
    e.preventDefault();

    const item = {
      id: a.dataset.id,
      name: a.dataset.name,
      price: Number(a.dataset.price),
      currency: a.dataset.currency || "CZK",
      image: a.dataset.image,
      qty: 1,
    };

    document.dispatchEvent(new CustomEvent("cart:add", { detail: item }));

    a.classList.add("disabled");
    const span = a.querySelector("span");
    if (span) span.textContent = LABELS.added;
    setTimeout(() => {
      a.classList.remove("disabled");
      if (span) span.textContent = LABELS.addToCart;
    }, 1200);
  });

  // ===== LOAD JSON & INIT - Giữ nguyên logic cũ =====
  grid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border" role="status" aria-label="${LABELS.loadingAria}"></div>
    </div>
  `;

  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    // SỬA: Lọc ra các sản phẩm không có ID/Name
    allProducts = (Array.isArray(raw) ? raw : [])
      .map(normalize)
      .filter((p) => p && p.name && p.id);

    buildFilterPanel();
    applyFilters();
    renderProducts();
  } catch (err) {
    console.error("Load speed ovens failed:", err);
    grid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger" role="alert">${LABELS.error}</div>
      </div>
    `;
    const ps = document.querySelector(PAGER_SLOT);
    if (ps) ps.innerHTML = "";
  }
})();