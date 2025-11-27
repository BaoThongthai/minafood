// js/speed_oven_filter.js
// Load JSON Combisteel + render product grid + filter như hình screenshot

(async function () {
    const GRID_SELECTOR = "#product-grid";
    const FILTER_PANEL_SELECTOR = "#filter-panel";
    const PAGER_SLOT = "#pager-slot";

    // TODO: sửa lại path JSON đúng với bạn
    const DATA_URL = "js/data/Combisteel_Neutral_Hygiene.json";

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

    // Giả định JSON Combisteel dạng:
    // { code, name, url, image, price, price_currency, price_text, specs:{ width, depth, height, material, version, parcel_ready, piezo_ignition, model_type, voltage, ... } }
    function normalize(raw) {
        const s = raw.specs || {};

        const price = Number.isFinite(Number(raw.price))
            ? Number(raw.price)
            : null;

        return {
            id: raw.code || raw.id || raw.name || "",
            sku: raw.code || "",
            name: txt(raw.name),
            href: raw.url || "#",
            image: raw.image || raw.image_large || "img/placeholder.webp",
            price,
            currency: txt(raw.price_currency) || "CZK",
            price_text_raw: txt(raw.price_text),

            // kích thước
            width_mm: s.width != null ? Number(s.width) : null,
            depth_mm: s.depth != null ? Number(s.depth) : null,
            height_mm: s.height != null ? Number(s.height) : null,

            // các thông số chung
            material: txt(s.material),
            version: txt(s.version),                          // Electric / Gas / Induction
            parcel_ready: txt(s.parcel_ready),                // Yes / No
            piezo_ignition: txt(s.piezo_ignition),            // Yes / No
            model_type: txt(s["model_tabletop/_freestanding/drop-in"]), // Freestanding / Tabletop
            voltage: txt(s.voltage),

            // ★ thêm để match filter mới như hình
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

            // ★ thêm các field mới trong hình
            door_left_right_hinging: txt(s["door_left / right_hinging"] || s.door_left_right_hinging),
            door_reversible: txt(s.door_reversible),
            number_of_doors: s.number_of_doors != null ? String(s.number_of_doors).trim() : "",
            position_sink: txt(s.position_sink),// 230, 2x 230, ...

            // field riêng cho bộ filter mới
            insulation_thickness: txt(s.insulation_thickness),
            griddle_surface: txt(s.griddle_surface),          // Chromed smooth, Ribbed, ...
            energy_label: txt(s.energy_label),                // A, No energy label required
            mobile: txt(s.mobile),                            // Yes / No
            lockable: txt(s.lockable),                        // Yes / No
            type_of_cooling: txt(s.type_of_cooling),          // Ventilated
            drain_valve: txt(s.drain_valve),                  // Yes / No
            cooling_agent: txt(s.cooling_agent),              // R 290, R 600 A
            lights: txt(s.lights),                            // No / Yes / Yes, LED
            operation: txt(s.operation),                      // Digital / Knob / Manual / Touch screen
            color: txt(s.color),                              // Black, Stainless steel, ...
            dishwasher_proof: txt(s.dishwasher_proof),        // Yes / No
            execution_window: txt(s.execution_window),        // curved / Right

            // === CATEGORY nếu bạn có mapping riêng thì giữ nguyên, nếu không dùng có thể bỏ ===
            category: "Generic",

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
            ${dimText
                ? `<p class="mb-1 small text-secondary">${dimText}</p>`
                : ""
            }
            ${p.version
                ? `<p class="mb-1 small text-secondary">Version: ${p.version}</p>`
                : ""
            }
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

    // ===== FILTER CONFIG =====
    // Chỉ 1 lựa chọn mỗi nhóm – giống Magento
    // ===== FILTER CONFIG =====
    // Chỉ 1 lựa chọn mỗi nhóm – giống Magento
    const FILTERS_STATE = {
        // size + price
        depth: null,
        height: null,
        width: null,
        insulation_thickness: null,
        price: null,

        // kỹ thuật
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
        model_type: null,
        voltage: null,
        operation: null,

        // cửa / cửa sổ / số cửa, sink
        door_left_right_hinging: null,
        door_reversible: null,
        number_of_doors: null,
        position_sink: null,
        execution_window: null,

        // option khác
        lights: null,
        parcel_ready: null,
        piezo_ignition: null,
        color: null,
        dishwasher_proof: null,
    };


    const CATEGORY_ORDER = [
        "Combisteamers",
        "Convection ovens",
        "Microwaves",
        "Oven supports and accessories",
        "Generic",
    ];

    const FILTER_CONFIG = {
        // === COLOR ===
        color: {
            label: "COLOR",
            key: "color",
            type: "value",
            buckets: [
                { id: "c-black", label: "Black", value: "Black" },
                { id: "c-blue", label: "Blue", value: "Blue" },
                { id: "c-chrome", label: "Chrome", value: "Chrome" },
                { id: "c-grey", label: "Grey", value: "Grey" },
                { id: "c-red", label: "Red", value: "Red" },
                { id: "c-ss", label: "Stainless steel", value: "Stainless steel" },
                { id: "c-white", label: "White", value: "White" },
                { id: "c-white-blue", label: "White / Blue", value: "White / Blue" },
            ],
        },

        // === DISHWASHER PROOF ===
        dishwasher_proof: {
            label: "DISHWASHER PROOF",
            key: "dishwasher_proof",
            type: "value",
            buckets: [
                { id: "dw-yes", label: "Yes", value: "Yes" },
            ],
        },

        // === EXECUTION WINDOW ===
        execution_window: {
            label: "EXECUTION WINDOW",
            key: "execution_window",
            type: "value",
            buckets: [
                { id: "ew-curved", label: "curved", value: "curved" },
            ],
        },

        // === COOLING AGENT ===
        cooling_agent: {
            label: "COOLING AGENT",
            key: "cooling_agent",
            type: "value",
            buckets: [
                { id: "ca-r290", label: "R 290", value: "R 290" },
                { id: "ca-r600a", label: "R 600 A", value: "R 600 A" },
            ],
        },

        // === DOOR LEFT / RIGHT HINGING ===
        door_left_right_hinging: {
            label: "DOOR LEFT / RIGHT HINGING",
            key: "door_left_right_hinging",
            type: "value",
            buckets: [
                { id: "door-right", label: "Right", value: "Right" },
            ],
        },

        // === LIGHTS ===
        lights: {
            label: "LIGHTS",
            key: "lights",
            type: "value",
            buckets: [
                { id: "light-no", label: "No", value: "No" },
                { id: "light-yes-led", label: "Yes, LED", value: "Yes, LED" },
            ],
        },

        // === PARCEL READY ===
        parcel_ready: {
            label: "PARCEL READY",
            key: "parcel_ready",
            type: "value",
            buckets: [
                { id: "parcel-yes", label: "Yes", value: "Yes" },
                { id: "parcel-no", label: "No", value: "No" },
            ],
        },

        // === OPERATION ===
        operation: {
            label: "OPERATION",
            key: "operation",
            type: "value",
            buckets: [
                { id: "op-digital", label: "Digital", value: "Digital" },
                { id: "op-knob", label: "Knob", value: "Knob" },
            ],
        },

        // === MODEL TABLETOP/FREESTANDING/DROP-IN ===
        model_type: {
            label: "MODEL TABLETOP/FREESTANDING/DROP-IN",
            key: "model_type",
            type: "value",
            buckets: [
                { id: "model-dropin", label: "Drop-in", value: "Drop-in" },
                { id: "model-freestanding", label: "Freestanding", value: "Freestanding" },
                { id: "model-tabletop", label: "Tabletop", value: "Tabletop" },
            ],
        },

        // === VOLTAGE ===
        voltage: {
            label: "VOLTAGE (VOLT)",
            key: "voltage",
            type: "value",
            buckets: [
                { id: "vol-230", label: "230", value: "230" },
                { id: "vol-2x230", label: "2x 230", value: "2x 230" },
            ],
        },

        // === ENERGY LABEL ===
        energy_label: {
            label: "ENERGY LABEL",
            key: "energy_label",
            type: "value",
            buckets: [
                { id: "el-c", label: "C", value: "C" },
                { id: "el-d", label: "D", value: "D" },
                {
                    id: "el-no-label",
                    label: "No energy label required",
                    value: "No energy label required",
                },
            ],
        },

        // === DEFROST ===
        defrost: {
            label: "DEFROST",
            key: "defrost",
            type: "value",
            buckets: [
                { id: "def-auto", label: "Automatic", value: "Automatic" },
                { id: "def-manual", label: "Manual", value: "Manual" },
            ],
        },

        // === DOOR REVERSIBLE ===
        door_reversible: {
            label: "DOOR REVERSIBLE",
            key: "door_reversible",
            type: "value",
            buckets: [
                { id: "dr-no", label: "No", value: "No" },
                { id: "dr-yes", label: "Yes", value: "Yes" },
            ],
        },

        // === MOBILE ===
        mobile: {
            label: "MOBILE",
            key: "mobile",
            type: "value",
            buckets: [
                { id: "mobile-no", label: "No", value: "No" },
                { id: "mobile-yes", label: "Yes", value: "Yes" },
            ],
        },

        // === LOCKABLE ===
        lockable: {
            label: "LOCKABLE",
            key: "lockable",
            type: "value",
            buckets: [
                { id: "lock-yes", label: "Yes", value: "Yes" },
            ],
        },

        // === TYPE OF COOLING ===
        type_of_cooling: {
            label: "TYPE OF COOLING",
            key: "type_of_cooling",
            type: "value",
            buckets: [
                { id: "cool-static", label: "Static", value: "Static" },
                { id: "cool-ventilated", label: "Ventilated", value: "Ventilated" },
            ],
        },

        // === NUMBER OF DOORS ===
        number_of_doors: {
            label: "NUMBER OF DOORS",
            key: "number_of_doors",
            type: "value",
            buckets: [
                { id: "doors-1", label: "1", value: "1" },
                { id: "doors-2", label: "2", value: "2" },
                { id: "doors-3", label: "3", value: "3" },
            ],
        },

        // === MATERIAL ===
        material: {
            label: "MATERIAL",
            key: "material",
            type: "value",
            buckets: [
                { id: "m-chromed-steel", label: "Chromed steel", value: "Chromed steel" },
                { id: "m-polycarbonate", label: "Polycarbonate", value: "Polycarbonate" },
                { id: "m-polyethylene", label: "Polyethylene", value: "Polyethylene" },
                { id: "m-polypropylene", label: "Polypropylene", value: "Polypropylene" },
                { id: "m-powder", label: "Powder coated steel", value: "Powder coated steel" },
                { id: "m-ss", label: "Stainless steel", value: "Stainless steel" },
                { id: "m-ss-18-8", label: "Stainless steel 18/8", value: "Stainless steel 18/8" },
                { id: "m-ss-430", label: "Stainless steel 430", value: "Stainless steel 430" },
                { id: "m-ss-aisi304", label: "Stainless steel Aisi 304", value: "Stainless steel Aisi 304" },
                { id: "m-ss-jyh21ct", label: "Stainless steel JYH21CT", value: "Stainless steel JYH21CT" },
                { id: "m-synthetic", label: "Synthetic", value: "Synthetic" },
            ],
        },

        // === VERSION ===
        version: {
            label: "VERSION",
            key: "version",
            type: "value",
            buckets: [
                { id: "v-electric", label: "Electric", value: "Electric" },
            ],
        },

        // === WIDTH ===
        width: {
            label: "WIDTH",
            key: "width_mm",
            type: "range",
            buckets: [
                { id: "w-0-199", label: "0 – 199", min: 0, max: 199 },
                { id: "w-200-399", label: "200 – 399", min: 200, max: 399 },
                { id: "w-400-599", label: "400 – 599", min: 400, max: 599 },
                { id: "w-600-799", label: "600 – 799", min: 600, max: 799 },
                { id: "w-800-999", label: "800 – 999", min: 800, max: 999 },
                { id: "w-1000-1199", label: "1000 – 1199", min: 1000, max: 1199 },
                { id: "w-1200-1399", label: "1200 – 1399", min: 1200, max: 1399 },
                { id: "w-1400-1599", label: "1400 – 1599", min: 1400, max: 1599 },
                { id: "w-1600-1799", label: "1600 – 1799", min: 1600, max: 1799 },
                { id: "w-1800-1999", label: "1800 – 1999", min: 1800, max: 1999 },
                { id: "w-2000-2199", label: "2000 – 2199", min: 2000, max: 2199 },
                { id: "w-2400-2599", label: "2400 – 2599", min: 2400, max: 2599 },
            ],
        },

        // === INSULATION THICKNESS ===
        insulation_thickness: {
            label: "INSULATION THICKNESS",
            key: "insulation_thickness",
            type: "value",
            buckets: [
                { id: "ins-40-59", label: "40 – 59", value: "40 - 59" },
                { id: "ins-60-79", label: "60 – 79", value: "60 - 79" },
            ],
        },

        // === PRICE ===
        price: {
            label: "PRICE",
            key: "price",
            type: "range",
            buckets: [
                { id: "p-0-9999", label: "€0.00 – €9,999.99", min: 0, max: 9999.99 },
                { id: "p-10000-plus", label: "€10,000.00 and above", min: 10000, max: Infinity },
            ],
        },

        // === POSITION SINK ===
        position_sink: {
            label: "POSITION SINK",
            key: "position_sink",
            type: "value",
            buckets: [
                { id: "sink-left", label: "Left", value: "Left" },
                { id: "sink-right", label: "Right", value: "Right" },
            ],
        },

        // === DEPTH ===
        depth: {
            label: "DEPTH",
            key: "depth_mm",
            type: "range",
            buckets: [
                { id: "d-0-199", label: "0 – 199", min: 0, max: 199 },
                { id: "d-200-399", label: "200 – 399", min: 200, max: 399 },
                { id: "d-400-599", label: "400 – 599", min: 400, max: 599 },
                { id: "d-600-799", label: "600 – 799", min: 600, max: 799 },
                { id: "d-800-999", label: "800 – 999", min: 800, max: 999 },
                { id: "d-1000-1199", label: "1000 – 1199", min: 1000, max: 1199 },
                { id: "d-1200-1399", label: "1200 – 1399", min: 1200, max: 1399 },
                { id: "d-1600-1799", label: "1600 – 1799", min: 1600, max: 1799 },
            ],
        },

        // === HEIGHT ===
        height: {
            label: "HEIGHT",
            key: "height_mm",
            type: "range",
            buckets: [
                { id: "h-0-199", label: "0 – 199", min: 0, max: 199 },
                { id: "h-200-399", label: "200 – 399", min: 200, max: 399 },
                { id: "h-400-599", label: "400 – 599", min: 400, max: 599 },
                { id: "h-600-799", label: "600 – 799", min: 600, max: 799 },
                { id: "h-800-999", label: "800 – 999", min: 800, max: 999 },
                { id: "h-1000-1199", label: "1000 – 1199", min: 1000, max: 1199 },
                { id: "h-1200-1399", label: "1200 – 1399", min: 1200, max: 1399 },
                { id: "h-1400-1599", label: "1400 – 1599", min: 1400, max: 1599 },
                { id: "h-1600-1799", label: "1600 – 1799", min: 1600, max: 1799 },
                { id: "h-1800-1999", label: "1800 – 1999", min: 1800, max: 1999 },
                { id: "h-2000-2199", label: "2000 – 2199", min: 2000, max: 2199 },
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

    // ===== BUILD FILTER UI =====
    function buildFilterPanel() {
        const total = allProducts.length;

        const groupsHtml = Object.entries(FILTER_CONFIG)
            .map(([groupId, conf]) => {
                const bucketHtml = conf.buckets
                    .map((b) => {
                        const count = allProducts.filter((p) =>
                            matchBucket(p, conf, b)
                        ).length;

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
            if (icon) icon.style.transform = "rotate(180deg)"; // thích thì để, không cần cũng được

            header.addEventListener("click", () => {
                const isOpen = content.style.display !== "none";
                content.style.display = isOpen ? "none" : "block";
                if (icon) icon.style.transform = isOpen ? "rotate(180deg)" : "rotate(180deg)";
                // hoặc nếu muốn mở ra thì mũi tên quay xuống:
                // if (icon) icon.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
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
