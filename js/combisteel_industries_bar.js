// js/speed_oven_filter.js
// Load JSON Combisteel + render product grid + filter như hình screenshot

(async function () {
    const GRID_SELECTOR = "#product-grid";
    const FILTER_PANEL_SELECTOR = "#filter-panel";
    const PAGER_SLOT = "#pager-slot";

    // TODO: sửa lại path JSON đúng với bạn
    const DATA_URL = "js/data/Combisteel_industries_bar.json";

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
            voltage: txt(s.voltage),                          // 230, 2x 230, ...

            // ====== field riêng cho filter giống HTML combisteel ======
            // dùng số để làm range
            insulation_thickness: s.insulation_thickness != null ? Number(s.insulation_thickness) : null,
            number_of_doors: s.number_of_doors != null ? Number(s.number_of_doors) : null,
            number_of_drawers: s.number_of_drawers != null ? Number(s.number_of_drawers) : null,

            defrost: txt(s.defrost),                          // Automatic
            energy_label: txt(s.energy_label),                // A, B, C, ...
            mobile: txt(s.mobile),                            // Yes / No
            lockable: txt(s.lockable),                        // Yes / No
            type_of_cooling: txt(s.type_of_cooling),          // Static with fan / Ventilated
            drain_valve: txt(s.drain_valve),                  // (có thể không dùng ở đây)
            cooling_agent: txt(s.cooling_agent),              // R 290, R 600 A
            lights: txt(s.lights),                            // Yes, LED / ...
            operation: txt(s.operation),                      // Digital / ...
            color: txt(s.color),                              // Black / Stainless steel
            dishwasher_proof: txt(s.dishwasher_proof),
            execution_window: txt(s.execution_window),
            door_reversible: txt(s.door_reversible),          // Yes / No
            door_left_right_hinging: txt(
                s["door left / right hinging"] ||
                s["door_left / right hinging"] ||
                s["door_left_right_hinging"] ||
                s["door_left/right_hinging"] ||
                s.door_left_right_hinging
            ),

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
    // ===== FILTER CONFIG =====
    // Chỉ 1 lựa chọn mỗi nhóm – giống Magento
    const FILTERS_STATE = {
        depth: null,
        height: null,
        width: null,
        insulation_thickness: null,
        price: null,
        number_of_doors: null,
        number_of_drawers: null,
        material: null,
        energy_label: null,
        defrost: null,
        door_reversible: null,
        mobile: null,
        lockable: null,
        type_of_cooling: null,
        cooling_agent: null,
        door_left_right_hinging: null,
        lights: null,
        parcel_ready: null,
        operation: null,
        model_type: null,
        voltage: null,
        color: null,
    };


    const CATEGORY_ORDER = [
        "Combisteamers",
        "Convection ovens",
        "Microwaves",
        "Oven supports and accessories",
        "Generic",
    ];

    const FILTER_CONFIG = {

        // === Depth ===
        depth: {
            label: "Depth",
            key: "depth_mm",
            type: "range",
            buckets: [
                { id: "d-400-599", label: "400 - 599", min: 400, max: 599 },
                { id: "d-600-799", label: "600 - 799", min: 600, max: 799 },
            ],
        },

        // === Height ===
        height: {
            label: "Height",
            key: "height_mm",
            type: "range",
            buckets: [
                { id: "h-800-999", label: "800 - 999", min: 800, max: 999 },
                { id: "h-1600-1799", label: "1600 - 1799", min: 1600, max: 1799 },
                { id: "h-1800-1999", label: "1800 - 1999", min: 1800, max: 1999 },
            ],
        },

        // === Width ===
        width: {
            label: "Width",
            key: "width_mm",
            type: "range",
            buckets: [
                { id: "w-200-399", label: "200 - 399", min: 200, max: 399 },
                { id: "w-400-599", label: "400 - 599", min: 400, max: 599 },
                { id: "w-600-799", label: "600 - 799", min: 600, max: 799 },
                { id: "w-800-999", label: "800 - 999", min: 800, max: 999 },
                { id: "w-1200-1399", label: "1200 - 1399", min: 1200, max: 1399 },
                { id: "w-1400-1599", label: "1400 - 1599", min: 1400, max: 1599 },
                { id: "w-1800-1999", label: "1800 - 1999", min: 1800, max: 1999 },
                { id: "w-2000-2199", label: "2000 - 2199", min: 2000, max: 2199 },
                { id: "w-2400-2599", label: "2400 - 2599", min: 2400, max: 2599 },
            ],
        },

        // === Insulation thickness ===
        insulation_thickness: {
            label: "Insulation thickness",
            key: "insulation_thickness",
            type: "range",
            buckets: [
                { id: "ins-40-59", label: "40 - 59", min: 40, max: 59 },
                { id: "ins-60-79", label: "60 - 79", min: 60, max: 79 },
            ],
        },

        // === Price ===
        price: {
            label: "Price",
            key: "price",
            type: "range",
            buckets: [
                {
                    id: "p-0-999-99",
                    label: "0.00 - 999.99",
                    min: 0,
                    max: 999.99,
                },
                {
                    id: "p-1000-1999-99",
                    label: "1,000.00 - 1,999.99",
                    min: 1000,
                    max: 1999.99,
                },
                {
                    id: "p-2000-2999-99",
                    label: "2,000.00 - 2,999.99",
                    min: 2000,
                    max: 2999.99,
                },
                {
                    id: "p-3000-3999-99",
                    label: "3,000.00 - 3,999.99",
                    min: 3000,
                    max: 3999.99,
                },
                {
                    id: "p-4000-plus",
                    label: "4,000.00 and above",
                    min: 4000,
                    max: Infinity,
                },
            ],
        },

        // === Number of doors ===
        number_of_doors: {
            label: "Number of doors",
            key: "number_of_doors",
            type: "value",
            buckets: [
                { id: "doors-1", label: "1", value: 1 },
                { id: "doors-2", label: "2", value: 2 },
                { id: "doors-3", label: "3", value: 3 },
                { id: "doors-4", label: "4", value: 4 },
            ],
        },

        // === Number of drawers ===
        number_of_drawers: {
            label: "Number of drawers",
            key: "number_of_drawers",
            type: "value",
            buckets: [
                { id: "drawers-2", label: "2", value: 2 },
                { id: "drawers-4", label: "4", value: 4 },
                { id: "drawers-6", label: "6", value: 6 },
            ],
        },

        // === Material ===
        material: {
            label: "Material",
            key: "material",
            type: "value",
            buckets: [
                { id: "mat-powder-steel", label: "Powder coated steel", value: "Powder coated steel" },
                { id: "mat-ss", label: "Stainless steel", value: "Stainless steel" },
                { id: "mat-ss-430", label: "Stainless steel 430", value: "Stainless steel 430" },
                { id: "mat-zwart", label: "Zwart gelakt staal", value: "Zwart gelakt staal" },
            ],
        },

        // === Energy label ===
        energy_label: {
            label: "Energy label",
            key: "energy_label",
            type: "value",
            buckets: [
                { id: "el-A", label: "A", value: "A" },
                { id: "el-B", label: "B", value: "B" },
                { id: "el-C", label: "C", value: "C" },
                { id: "el-D", label: "D", value: "D" },
                { id: "el-E", label: "E", value: "E" },
                { id: "el-F", label: "F", value: "F" },
                { id: "el-G", label: "G", value: "G" },
            ],
        },

        // === Defrost ===
        defrost: {
            label: "Defrost",
            key: "defrost",
            type: "value",
            buckets: [
                { id: "def-automatic", label: "Automatic", value: "Automatic" },
            ],
        },

        // === Door reversible ===
        door_reversible: {
            label: "Door reversible",
            key: "door_reversible",
            type: "value",
            buckets: [
                { id: "door-rev-no", label: "No", value: "No" },
                { id: "door-rev-yes", label: "Yes", value: "Yes" },
            ],
        },

        // === Mobile ===
        mobile: {
            label: "Mobile",
            key: "mobile",
            type: "value",
            buckets: [
                { id: "mobile-no", label: "No", value: "No" },
            ],
        },

        // === Lockable ===
        lockable: {
            label: "Lockable",
            key: "lockable",
            type: "value",
            buckets: [
                { id: "lock-no", label: "No", value: "No" },
                { id: "lock-yes", label: "Yes", value: "Yes" },
            ],
        },

        // === Type of cooling ===
        type_of_cooling: {
            label: "Type of cooling",
            key: "type_of_cooling",
            type: "value",
            buckets: [
                { id: "cool-static-fan", label: "Static with fan", value: "Static with fan" },
                { id: "cool-vent", label: "Ventilated", value: "Ventilated" },
            ],
        },

        // === Cooling agent ===
        cooling_agent: {
            label: "Cooling agent",
            key: "cooling_agent",
            type: "value",
            buckets: [
                { id: "cool-R290", label: "R 290", value: "R 290" },
                { id: "cool-R600A", label: "R 600 A", value: "R 600 A" },
            ],
        },

        // === Door left / right hinging ===
        door_left_right_hinging: {
            label: "Door left / right hinging",
            key: "door_left_right_hinging",
            type: "value",
            buckets: [
                { id: "hing-left-right", label: "Left and right hinged", value: "Left and right hinged" },
                { id: "hing-right", label: "Right", value: "Right" },
            ],
        },

        // === Lights ===
        lights: {
            label: "Lights",
            key: "lights",
            type: "value",
            buckets: [
                { id: "light-led", label: "Yes, LED", value: "Yes, LED" },
            ],
        },

        // === Parcel ready ===
        parcel_ready: {
            label: "Parcel ready",
            key: "parcel_ready",
            type: "value",
            buckets: [
                { id: "parcel-no", label: "No", value: "No" },
            ],
        },

        // === Operation ===
        operation: {
            label: "Operation",
            key: "operation",
            type: "value",
            buckets: [
                { id: "op-digital", label: "Digital", value: "Digital" },
            ],
        },

        // === Model tabletop / freestanding / drop-in ===
        model_type: {
            label: "Model tabletop/ freestanding/drop-in",
            key: "model_type",
            type: "value",
            buckets: [
                { id: "model-freestanding", label: "Freestanding", value: "Freestanding" },
                { id: "model-tabletop", label: "Tabletop", value: "Tabletop" },
            ],
        },

        // === Voltage (Volt) ===
        voltage: {
            label: "Voltage (Volt)",
            key: "voltage",
            type: "value",
            buckets: [
                { id: "volt-230", label: "230", value: "230" },
            ],
        },

        // === Color ===
        color: {
            label: "Color",
            key: "color",
            type: "value",
            buckets: [
                { id: "color-black", label: "Black", value: "Black" },
                { id: "color-ss", label: "Stainless steel", value: "Stainless steel" },
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
