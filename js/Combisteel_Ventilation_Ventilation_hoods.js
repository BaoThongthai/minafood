// js/speed_oven_filter.js
// Load JSON Combisteel + render product grid + filter giống block Ventilation

(async function () {
    const GRID_SELECTOR = "#product-grid";
    const FILTER_PANEL_SELECTOR = "#filter-panel";
    const PAGER_SLOT = "#pager-slot";

    // TODO: sửa lại path JSON đúng với bạn
    const DATA_URL = "js/data/Combisteel_Ventilation_Ventilation_hoods.json";

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

    // ===== NORMALIZE PRODUCT =====
    // Giả định JSON Combisteel dạng:
    // { code, name, url, image, price, price_currency, price_text,
    //   specs:{ width, depth, height, material, parcel_ready, lights, voltage, color, ... } }
    function normalize(raw) {
        const s = raw.specs || {};

        const numOrNull = (val) => {
            if (val == null || val === "") return null;
            const n = Number(val);
            return Number.isFinite(n) ? n : null;
        };

        const price = numOrNull(raw.price);

        return {
            id: raw.code || raw.id || raw.name || "",
            sku: raw.code || "",
            name: txt(raw.name),
            href: raw.url || "#",
            image: raw.image || raw.image_large || "img/placeholder.webp",
            price,
            currency: txt(raw.price_currency) || "CZK",
            price_text_raw: txt(raw.price_text),

            // kích thước (mm)
            width_mm: numOrNull(s.width),
            depth_mm: numOrNull(s.depth),
            height_mm: numOrNull(s.height),

            // thông số chính
            material: txt(s.material),
            parcel_ready: txt(s.parcel_ready), // Yes / No
            lights: txt(s.lights),             // No / Yes / Yes, LED
            voltage: txt(s.voltage),           // 12 / 230 / 400
            color: txt(s.color),               // Stainless steel, ...

            // ventilation-specific
            filters: txt(s.filters),           // Yes / No
            tap: txt(s.tap),                   // Yes / No
            controller: txt(s.controller),     // Yes / No
            engine: txt(s.engine),             // Yes / No (nhóm Engine thứ 1)
            engine2: txt(s.engine_2 || s.engine_box || ""), // Yes / No (nhóm Engine thứ 2)
            box_filter: txt(s.box_filter),     // Yes
            filter_bags: txt(s.filter_bags),   // Yes / No
            carbon_filter: txt(s.carbon_filter), // Yes

            // KHÔNG dùng catalogue/category nữa
            // category: undefined,
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
            ${dimText ? `<p class="mb-1 small text-secondary">${dimText}</p>` : ""}
            ${p.voltage
                ? `<p class="mb-1 small text-secondary">Voltage: ${p.voltage}</p>`
                : ""
            }

            ${priceText
                ? `<p class="mb-3 fw-semibold">${priceText}</p>`
                : `<p class="mb-3"></p>`
            }

            <div class="mt-auto d-flex justify-content-between gap-2">
              ${hasPrice
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

        popupDim.innerHTML = `
      ${p.sku
                ? `<div class="mb-1 small text-muted"><strong>${p.sku}</strong></div>`
                : ""
            }
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

    // ===== PAGINATION =====
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
          <a href="#" class="mf-pg-btn ${currentPage === 1 ? "is-disabled" : ""
            }" data-page="${currentPage - 1}" aria-label="Previous">‹</a>
          ${pages
                .map((p) =>
                    p === "..."
                        ? `<span class="mf-pg-ellipsis">…</span>`
                        : `<a href="#"
                       class="mf-pg-btn ${p === currentPage ? "is-active" : ""
                        }"
                       data-page="${p}">${p}</a>`
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

    // ===== FILTER CONFIG =====
    // Chỉ 1 lựa chọn mỗi nhóm – giống Magento / Combisteel
    const FILTERS_STATE = {
        depth: null,
        height: null,
        width: null,
        price: null,

        filters: null,
        tap: null,
        controller: null,
        engine: null,
        engine2: null,
        box_filter: null,
        filter_bags: null,
        carbon_filter: null,

        material: null,
        lights: null,
        parcel_ready: null,
        voltage: null,
        color: null,
    };

    const FILTER_CONFIG = {
        // DEPTH
        depth: {
            label: "Depth",
            key: "depth_mm",
            type: "range",
            buckets: [
                { id: "d-0-199", label: "0 - 199", min: 0, max: 199 },
                { id: "d-200-399", label: "200 - 399", min: 200, max: 399 },
                { id: "d-400-599", label: "400 - 599", min: 400, max: 599 },
                { id: "d-600-799", label: "600 - 799", min: 600, max: 799 },
                { id: "d-800-999", label: "800 - 999", min: 800, max: 999 },
                { id: "d-1000-1199", label: "1000 - 1199", min: 1000, max: 1199 },
                { id: "d-1200-1399", label: "1200 - 1399", min: 1200, max: 1399 },
            ],
        },

        // HEIGHT
        height: {
            label: "Height",
            key: "height_mm",
            type: "range",
            buckets: [
                { id: "h-0-199", label: "0 - 199", min: 0, max: 199 },
                { id: "h-200-399", label: "200 - 399", min: 200, max: 399 },
                { id: "h-400-599", label: "400 - 599", min: 400, max: 599 },
                { id: "h-600-799", label: "600 - 799", min: 600, max: 799 },
                { id: "h-1000-1199", label: "1000 - 1199", min: 1000, max: 1199 },
            ],
        },

        // WIDTH
        width: {
            label: "Width",
            key: "width_mm",
            type: "range",
            buckets: [
                { id: "w-0-199", label: "0 - 199", min: 0, max: 199 },
                { id: "w-200-399", label: "200 - 399", min: 200, max: 399 },
                { id: "w-400-599", label: "400 - 599", min: 400, max: 599 },
                { id: "w-600-799", label: "600 - 799", min: 600, max: 799 },
                { id: "w-800-999", label: "800 - 999", min: 800, max: 999 },
                { id: "w-1000-1199", label: "1000 - 1199", min: 1000, max: 1199 },
                { id: "w-1200-1399", label: "1200 - 1399", min: 1200, max: 1399 },
                { id: "w-1400-1599", label: "1400 - 1599", min: 1400, max: 1599 },
                { id: "w-1600-1799", label: "1600 - 1799", min: 1600, max: 1799 },
                { id: "w-1800-1999", label: "1800 - 1999", min: 1800, max: 1999 },
                { id: "w-2000-2199", label: "2000 - 2199", min: 2000, max: 2199 },
                { id: "w-2400-2599", label: "2400 - 2599", min: 2400, max: 2599 },
                { id: "w-2600-plus", label: "2600 and above", min: 2600, max: Infinity },
            ],
        },

        // PRICE
        price: {
            label: "Price",
            key: "price",
            type: "range",
            buckets: [
                {
                    id: "p-0-1000",
                    label: "0.00 - 999.99",
                    min: 0,
                    max: 999.99,
                },
                {
                    id: "p-1000-2000",
                    label: "1,000.00 - 1,999.99",
                    min: 1000,
                    max: 1999.99,
                },
                {
                    id: "p-2000-3000",
                    label: "2,000.00 - 2,999.99",
                    min: 2000,
                    max: 2999.99,
                },
                {
                    id: "p-3000-4000",
                    label: "3,000.00 - 3,999.99",
                    min: 3000,
                    max: 3999.99,
                },
                {
                    id: "p-5000-plus",
                    label: "5,000.00 and above",
                    min: 5000,
                    max: Infinity,
                },
            ],
        },

        // Filters (Yes/No)
        filters: {
            label: "Filters",
            key: "filters",
            type: "value",
            buckets: [
                { id: "filters-no", label: "No", value: "No" },
                { id: "filters-yes", label: "Yes", value: "Yes" },
            ],
        },

        // Tap
        tap: {
            label: "Tap",
            key: "tap",
            type: "value",
            buckets: [
                { id: "tap-no", label: "No", value: "No" },
                { id: "tap-yes", label: "Yes", value: "Yes" },
            ],
        },

        // Controller
        controller: {
            label: "Controller",
            key: "controller",
            type: "value",
            buckets: [
                { id: "ctrl-no", label: "No", value: "No" },
                { id: "ctrl-yes", label: "Yes", value: "Yes" },
            ],
        },

        // Engine (bo6629)
        engine: {
            label: "Engine",
            key: "engine",
            type: "value",
            buckets: [
                { id: "eng-no", label: "No", value: "No" },
                { id: "eng-yes", label: "Yes", value: "Yes" },
            ],
        },

        // Box filter
        box_filter: {
            label: "Box filter",
            key: "box_filter",
            type: "value",
            buckets: [{ id: "box-yes", label: "Yes", value: "Yes" }],
        },

        // Filter bags
        filter_bags: {
            label: "Filter bags",
            key: "filter_bags",
            type: "value",
            buckets: [
                { id: "bags-no", label: "No", value: "No" },
                { id: "bags-yes", label: "Yes", value: "Yes" },
            ],
        },

        // Carbon filter
        carbon_filter: {
            label: "Carbon filter",
            key: "carbon_filter",
            type: "value",
            buckets: [{ id: "carbon-yes", label: "Yes", value: "Yes" }],
        },

        // Engine (bo6131 - nhóm thứ 2)
        engine2: {
            label: "Engine",
            key: "engine2",
            type: "value",
            buckets: [
                { id: "eng2-no", label: "No", value: "No" },
                { id: "eng2-yes", label: "Yes", value: "Yes" },
            ],
        },

        // Material
        material: {
            label: "Material",
            key: "material",
            type: "value",
            buckets: [
                { id: "mat-al", label: "Aluminium", value: "Aluminium" },
                {
                    id: "mat-ss430",
                    label: "Stainless steel 430",
                    value: "Stainless steel 430",
                },
                {
                    id: "mat-aisi201",
                    label: "Stainless steel Aisi 201",
                    value: "Stainless steel Aisi 201",
                },
                {
                    id: "mat-aisi304",
                    label: "Stainless steel Aisi 304",
                    value: "Stainless steel Aisi 304",
                },
            ],
        },

        // Lights
        lights: {
            label: "Lights",
            key: "lights",
            type: "value",
            buckets: [
                { id: "light-no", label: "No", value: "No" },
                { id: "light-yes", label: "Yes", value: "Yes" },
                { id: "light-led", label: "Yes, LED", value: "Yes, LED" },
            ],
        },

        // Parcel ready
        parcel_ready: {
            label: "Parcel ready",
            key: "parcel_ready",
            type: "value",
            buckets: [
                { id: "parcel-yes", label: "Yes", value: "Yes" },
                { id: "parcel-no", label: "No", value: "No" },
            ],
        },

        // Voltage
        voltage: {
            label: "Voltage (Volt)",
            key: "voltage",
            type: "value",
            buckets: [
                { id: "vol-12", label: "12", value: "12" },
                { id: "vol-230", label: "230", value: "230" },
                { id: "vol-400", label: "400", value: "400" },
            ],
        },

        // Color
        color: {
            label: "Color",
            key: "color",
            type: "value",
            buckets: [
                {
                    id: "color-ss",
                    label: "Stainless steel",
                    value: "Stainless steel",
                },
            ],
        },
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

    // ===== BUILD FILTER UI (Tailwind style giống code Combisteel) =====
    function buildFilterPanel() {
        const groupsHtml = Object.entries(FILTER_CONFIG)
            .map(([groupId, conf]) => {
                const bucketHtml = conf.buckets
                    .map((b) => {
                        const count = allProducts.filter((p) =>
                            matchBucket(p, conf, b)
                        ).length;

                        return `
              <a href="#"
                 class="flex justify-between py-1 hover:text-black mf-filter-link"
                 data-group="${groupId}"
                 data-bucket-id="${b.id}">
                <span>${b.label}</span>
                <span class="count text-gray-400">(${count})</span>
              </a>
            `;
                    })
                    .join("");

                return `
          <div class="filter-option mb-3 pb-3 border-black border-b" data-group="${groupId}">
            <div class="filter-options-title flex justify-between items-center cursor-pointer text-normal hover:text-ventilation pb-4">
              <span class="title text-normal uppercase">
                ${conf.label}
              </span>
              <span class="text-normal">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                     stroke-width="2" stroke="currentColor"
                     class="transition-transform transform duration-300 ease-in-out"
                     width="20" height="20" role="img">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                  <title>chevron-down</title>
                </svg>
              </span>
            </div>
            <div class="filter-options-content pb-4">
              ${bucketHtml}
            </div>
          </div>
        `;
            })
            .join("");

        // KHÔNG render "Shopping options" nữa để giống block Combisteel
        filterPanel.innerHTML = groupsHtml;

        // Toggle open/close
        filterPanel.querySelectorAll(".filter-option").forEach((opt) => {
            const header = opt.querySelector(".filter-options-title");
            const content = opt.querySelector(".filter-options-content");
            const icon = opt.querySelector("svg");

            // mặc định mở (giống link tĩnh trong code Combisteel)
            content.style.display = "block";

            header.addEventListener("click", () => {
                const isOpen = content.style.display !== "none";
                content.style.display = isOpen ? "none" : "block";
                if (icon) {
                    icon.classList.toggle("-rotate-180", !isOpen);
                }
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

            // toggle: click lại thì bỏ filter
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

    // ===== APPLY FILTERS =====
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

    // ===== ADD TO CART =====
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

    // ===== LOAD JSON & INIT =====
    grid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border" role="status" aria-label="${LABELS.loadingAria}"></div>
    </div>
  `;

    try {
        const res = await fetch(DATA_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        allProducts = (Array.isArray(raw) ? raw : [])
            .map(normalize)
            .filter((p) => p && p.name);

        buildFilterPanel();
        applyFilters();
        renderProducts();
    } catch (err) {
        console.error("Load Neutral Hygiene failed:", err);
        grid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger" role="alert">${LABELS.error}</div>
      </div>
    `;
        const ps = document.querySelector(PAGER_SLOT);
        if (ps) ps.innerHTML = "";
    }
})();
