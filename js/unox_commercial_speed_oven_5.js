// /js/unox_konvektomaty.js
(async function () {
    const GRID_SELECTOR = "#product-grid";
    const COUNT_EL = "#product-count";       // nếu không dùng thì cũng không sao
    const PAGER_SLOT = "#pager-slot";
    const CATEGORY_SLOT = "#category-slot";  // nếu chưa có category thì sẽ không render
    const FILTER_SLOT = "#filter-panel";     // ⬅ cột filter bên trái

    const DATA_URL = "js/data/unox_commercial_speed_oven_5.json";

    const LABELS = {
        loadingAria: "loading",
        error: "Không tải được danh sách sản phẩm. Vui lòng thử lại sau.",
        contact: "Na poptávku",
        prev: "«",
        next: "»",
        page: "Trang",
        seeAll: "SEE ALL",
        addToCart: "Add to Cart",
        added: "Added!",
    };

    const PAGE_SIZE = 30;

    const SEE_ALL = LABELS.seeAll;

    // ========= STATE =========
    let allProducts = [];
    let filteredProducts = [];
    let currentPage = 1; // 1-based
    let currentCategory = SEE_ALL;

    // FILTER state (multi-select)
    const filterState = {
        power: new Set(),   // các giá trị power được chọn
        series: new Set(),  // series được chọn
        gnCount: new Set(), // số GN được chọn (string)
        gnType: new Set(),  // loại GN 1/1, 2/1...
        priceMin: null,     // min giá đang chọn
        priceMax: null      // max giá đang chọn
    };

    // Min / Max giá toàn bộ sản phẩm (set sau khi load JSON)
    let globalMinPrice = null;
    let globalMaxPrice = null;


    // đọc ?cat & ?page
    const qs = new URLSearchParams(location.search);
    const initCat = qs.get("cat");
    const initPage = parseInt(qs.get("page"), 10);
    if (initCat) currentCategory = initCat;
    if (!isNaN(initPage) && initPage >= 1) currentPage = initPage;

    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return;

    // ========= UTIL =========
    function parseGnInfo(name = "") {
        // Ví dụ: "10 GN 1/1 vsuvů" -> gnCount=10, gnType="1/1"
        const m = /(\d+)\s*GN\s*([0-9/]+)/i.exec(name);
        if (!m) return { gnCount: null, gnType: null };
        return { gnCount: Number(m[1]), gnType: m[2] };
    }

    const normalize = (p) => {
        // Unox JSON:
        // url, image, badge, model, productType, series[], name, power,
        // features[], consumption_text, emissions_text, price_text, price_czk, vat_note
        const seriesArr = Array.isArray(p.series) ? p.series : [];
        const featuresArr = Array.isArray(p.features) ? p.features : [];
        const { gnCount, gnType } = parseGnInfo(p.name || "");

        return {
            id: p.model || p.id || p.sku || p.name || "",
            sku: p.model || p.sku || "",
            name: p.name || "",

            // mô tả ngắn ngay dưới tên
            line1: [p.productType || "", seriesArr.join(" • ")]
                .filter(Boolean)
                .join(" • "),
            line2: "",

            label: p.badge || p.label || "",

            price:
                p.price_czk == null || isNaN(Number(p.price_czk))
                    ? null
                    : Number(p.price_czk),
            currency: (p.currency || (p.price_czk != null ? "Kč" : "")).trim(),

            image: p.image || "img/placeholder.webp",
            href: p.url || p.href || "#",
            sp: p.sp ?? null,

            // details dùng cho popup / filter
            model: p.model || "",
            productType: p.productType || "",
            series: seriesArr,
            power: p.power || "",
            features: featuresArr,
            consumption_text: p.consumption_text || "",
            emissions_text: p.emissions_text || "",
            vat_note: p.vat_note || "",
            price_text_raw: p.price_text || "",

            // GN
            gnCount,
            gnType,
        };
    };

    // Format giá: cs-CZ, 2 số lẻ
    const fmtPrice = (price, currency) => {
        if (price == null || price === "" || isNaN(price) || Number(price) <= 0)
            return "";
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
            p.name ? `• Product name: ${p.name}` : "",
            p.line1 ? `• Detail 1: ${p.line1}` : "",
            p.line2 ? `• Detail 2: ${p.line2}` : "",
            p.sku ? `• SKU: ${p.sku}` : "",
            `• Source Page: ${location.href}`,
        ].filter(Boolean);
        return lines.join("\n");
    };

    // Nếu bạn có CATEGORY_RULES ở file khác, giữ nguyên hàm này
    function detectCategoryByName(name = "") {
        if (typeof CATEGORY_RULES === "undefined") return SEE_ALL;
        for (const rule of CATEGORY_RULES) {
            if (rule.patterns.some((re) => re.test(name))) return rule.name;
        }
        return SEE_ALL;
    }

    // ========= RENDER =========
    const cardHTML = (p) => {
        const priceText = fmtPrice(p.price, p.currency);
        const hasPrice = Number.isFinite(p.price) && Number(p.price) > 0;
        const msg = encodeURIComponent(buildInquiryMessage(p));

        return `
    <div class="col-md-6 col-lg-4">
      <div class="rounded position-relative fruite-item h-100" data-id="${String(
            p.id
        ).replace(/"/g, "&quot;")}">
        <div class="fruite-img">
          <img src="${p.image
            }" class="img-fluid w-100 rounded-top border border-secondary" alt="${p.name
            }">
        </div>
        ${p.label
                ? `<div class="text-white bg-secondary px-3 py-1 rounded position-absolute" style="top:10px;left:10px;font-size:12px">${p.label}</div>`
                : ""
            }

        <div class="p-4 border border-secondary border-top-0 rounded-bottom d-flex flex-column">
          <h4 class="mb-2 line-clamp-2" title="${p.name}">${p.name}</h4>
          ${p.line1
                ? `<p class="mb-1 text-muted line-clamp-2" title="${p.line1}">${p.line1}</p>`
                : ""
            }

          ${p.sku
                ? `<p class="mb-1 small text-secondary line-clamp-1" title="SKU: ${p.sku
                }">SKU: ${p.sku}</p>`
                : ""
            }

          ${p.power
                ? `<p class="mb-1 small text-secondary">Power: ${p.power}</p>`
                : ""
            }

          ${p.gnCount || p.gnType
                ? `<p class="mb-1 small text-secondary">
                   GN: ${p.gnCount ? String(p.gnCount) + "x " : ""
                }${p.gnType || ""}
                 </p>`
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
                     data-currency="${p.currency || "Kč"}"
                     data-image="${p.image}">
                     <i class="fa fa-shopping-bag me-2 text-primary"></i>
                     <span>${LABELS.addToCart}</span>
                  </a>
                `
                : `
                  <a href="/contact.html?msg=${msg}"
                     class="btn border border-secondary rounded-pill px-3 text-primary"
                     aria-label="${LABELS.contact}">
                     <i class="fa fa-envelope me-2 text-primary"></i>
                     <span>${LABELS.contact}</span>
                  </a>
                `
            }
          </div>
        </div>
      </div>
    </div>
  `;
    };

    // Popup
    const popup = document.getElementById("product-popup");
    const popupImg = document.getElementById("popup-img");
    const popupName = document.getElementById("popup-name");
    const popupDim = document.getElementById("popup-dim");
    const popupWeight = document.getElementById("popup-weight");
    const popupClose = document.querySelector(".product-popup-close");

    function openPopup(p) {
        if (!popup) return;

        popupImg.src = p.image || "img/placeholder.webp";
        popupImg.alt = p.name || "";
        popupName.textContent = p.name || "";

        const seriesHtml =
            p.series && p.series.length
                ? `<div class="mb-2">
             ${p.series.map((s) => `<div>${s}</div>`).join("")}
           </div>`
                : "";

        const featuresHtml =
            p.features && p.features.length
                ? `<ul class="mt-2 mb-0 small">
             ${p.features.map((f) => `<li>${f}</li>`).join("")}
           </ul>`
                : "";

        const greenBoxHtml =
            p.consumption_text || p.emissions_text
                ? `<div class="mt-3 p-2 rounded small" style="background:#e3f6df;">
             ${p.consumption_text || ""}<br>
             ${p.emissions_text || ""}
           </div>`
                : "";

        popupDim.innerHTML = `
      ${p.model || p.productType
                ? `<div class="mb-1 small text-muted">
               ${p.model ? `<strong>${p.model}</strong>` : ""
                }${p.productType ? ` – ${p.productType}` : ""}
             </div>`
                : ""
            }
      ${seriesHtml}
      ${p.power
                ? `<div class="mb-2">
               <span class="badge bg-warning text-dark">${p.power}</span>
             </div>`
                : ""
            }
      ${featuresHtml}
      ${greenBoxHtml}
    `;

        const priceText = fmtPrice(p.price, p.currency);
        popupWeight.textContent = [priceText, p.vat_note || ""]
            .filter(Boolean)
            .join(" ");

        popup.classList.remove("hidden");
    }

    function closePopup() {
        if (!popup) return;
        popup.classList.add("hidden");
    }
    if (popupClose) popupClose.addEventListener("click", closePopup);
    if (popup)
        popup.addEventListener("click", (e) => {
            if (e.target === popup) closePopup();
        });

    // gắn click mở popup
    function attachCardHandlers() {
        grid.querySelectorAll(".fruite-item").forEach((item) => {
            item.addEventListener("click", (ev) => {
                if (ev.target.closest("a,button")) return;
                const id = item.dataset.id;
                const p = filteredProducts.find(
                    (prod) => String(prod.id) === String(id)
                );
                if (p) openPopup(p);
            });
        });
    }

    // ===== Add to Cart (event delegation) =====
    grid.addEventListener("click", (e) => {
        const a = e.target.closest("a.add-to-cart");
        if (!a) return;
        e.preventDefault();

        const item = {
            id: a.dataset.id,
            name: a.dataset.name,
            price: Number(a.dataset.price),
            currency: a.dataset.currency || "Kč",
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

    // ===== URL helper =====
    function updateURL() {
        const url = new URL(location.href);
        url.searchParams.set("page", String(currentPage));
        url.searchParams.set("cat", currentCategory);
        history.replaceState(null, "", url);
    }

    // ===== Category dropdown (nếu có CATEGORY_RULES) =====
    function renderCategoryDropdown() {
        const slot = document.querySelector(CATEGORY_SLOT);
        if (!slot || typeof CATEGORY_RULES === "undefined") return;

        const foundSet = new Set([SEE_ALL]);
        for (const p of allProducts) foundSet.add(detectCategoryByName(p.name));
        const ordered = [
            SEE_ALL,
            ...CATEGORY_RULES.map((r) => r.name).filter((n) => foundSet.has(n)),
        ];

        slot.innerHTML = `
    <div class="dropdown">
      <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        ${currentCategory}
      </button>
      <ul class="dropdown-menu">
        ${ordered
                .map(
                    (n) => `
          <li><a class="dropdown-item ${n === currentCategory ? "active" : ""
                        }" href="#" data-cat="${n}">${n}</a></li>
        `
                )
                .join("")}
      </ul>
    </div>
  `;

        slot.querySelectorAll(".dropdown-item").forEach((a) => {
            a.addEventListener("click", (e) => {
                e.preventDefault();
                const cat = a.getAttribute("data-cat") || SEE_ALL;
                if (cat !== currentCategory) {
                    currentCategory = cat;
                    currentPage = 1;
                    applyFilter();
                    renderProducts();
                }
            });
        });
    }

    // ===== FILTER bên trái =====
    // ===== FILTER bên trái (accordion + checkbox + slider) =====
    function renderFilters() {
        const slot = document.querySelector(FILTER_SLOT);
        if (!slot) return;

        const powerSet = new Set();
        const seriesSet = new Set();
        const gnCountSet = new Set();
        const gnTypeSet = new Set();

        allProducts.forEach((p) => {
            if (p.power) powerSet.add(p.power);
            (p.series || []).forEach((s) => seriesSet.add(s));
            if (p.gnCount) gnCountSet.add(p.gnCount);
            if (p.gnType) gnTypeSet.add(p.gnType);
        });

        const powerHtml = [...powerSet]
            .sort()
            .map(
                (v) => `
      <label class="d-flex align-items-center mb-1 small">
        <input type="checkbox"
               class="form-check-input mf-filter-checkbox"
               data-filter="power"
               value="${v}">
        <span class="ms-2">${v}</span>
      </label>`
            )
            .join("");

        const seriesHtml = [...seriesSet]
            .sort()
            .map(
                (v) => `
      <label class="d-flex align-items-center mb-1 small">
        <input type="checkbox"
               class="form-check-input mf-filter-checkbox"
               data-filter="series"
               value="${v}">
        <span class="ms-2">${v}</span>
      </label>`
            )
            .join("");

        const gnCountHtml = [...gnCountSet]
            .sort((a, b) => a - b)
            .map(
                (v) => `
      <button type="button"
              class="btn btn-outline-primary btn-sm me-2 mb-2 mf-filter-chip"
              data-filter="gnCount"
              data-value="${v}">
        ${String(v).padStart(2, "0")}
      </button>`
            )
            .join("");

        const gnTypeHtml = [...gnTypeSet]
            .sort()
            .map(
                (v) => `
      <button type="button"
              class="btn btn-outline-primary btn-sm me-2 mb-2 mf-filter-chip"
              data-filter="gnType"
              data-value="${v}">
        ${v}
      </button>`
            )
            .join("");

        // PRICE slider
        let priceGroupHtml = "";
        if (globalMinPrice != null && globalMaxPrice != null) {
            const minVal = filterState.priceMin ?? globalMinPrice;
            const maxVal = filterState.priceMax ?? globalMaxPrice;
            priceGroupHtml = `
        <div class="mf-filter-group mb-3">
          <div class="d-flex justify-content-between align-items-center mb-2 mf-filter-toggle"
               data-target="mf-f-price"
               style="cursor:pointer;">
            <span class="fw-bold text-primary text-uppercase small" data-i18n="unox.filter.price">Cena</span>
            <span class="mf-filter-arrow small">▴</span>
          </div>
          <div id="mf-f-price" class="mf-filter-body">
            <div id="mf-price-label" class="small mb-2">
              ${fmtPrice(minVal, "Kč")} - ${fmtPrice(maxVal, "Kč")}
            </div>
            <div class="d-flex flex-column gap-1">
              <input type="range" class="form-range" id="mf-price-min"
                     min="${globalMinPrice}" max="${globalMaxPrice}"
                     value="${minVal}">
              <input type="range" class="form-range" id="mf-price-max"
                     min="${globalMinPrice}" max="${globalMaxPrice}"
                     value="${maxVal}">
              <div class="d-flex justify-content-between small">
                <span id="mf-price-min-label">${fmtPrice(minVal, "Kč")}</span>
                <span id="mf-price-max-label">${fmtPrice(maxVal, "Kč")}</span>
              </div>
            </div>
          </div>
        </div>`;
        }

        slot.innerHTML = `
      <h5 class="mb-3" data-i18n="unox.filter.title">Filter</h5>

      <!-- Napájení -->
      <div class="mf-filter-group mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2 mf-filter-toggle"
             data-target="mf-f-power"
             style="cursor:pointer;">
          <span class="fw-bold text-primary text-uppercase small" data-i18n="unox.filter.power">Napájení</span>
          <span class="mf-filter-arrow small">▴</span>
        </div>
        <div id="mf-f-power" class="mf-filter-body">
          ${powerHtml || '<div class="small text-muted" data-i18n="unox.filter.noData">No data</div>'}
        </div>
      </div>

      <!-- Řada -->
      <div class="mf-filter-group mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2 mf-filter-toggle"
             data-target="mf-f-series"
             style="cursor:pointer;">
          <span class="fw-bold text-primary text-uppercase small" data-i18n="unox.filter.series">Řada</span>
          <span class="mf-filter-arrow small">▴</span>
        </div>
        <div id="mf-f-series" class="mf-filter-body">
          ${seriesHtml || '<div class="small text-muted">No data</div>'}
        </div>
      </div>

      ${priceGroupHtml}

      <!-- Vsuvů (GN count) -->
      <div class="mf-filter-group mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2 mf-filter-toggle"
             data-target="mf-f-gncount"
             style="cursor:pointer;">
          <span class="fw-bold text-primary text-uppercase small" data-i18n="unox.filter.gnCount">Vsuvů</span>
          <span class="mf-filter-arrow small">▴</span>
        </div>
        <div id="mf-f-gncount" class="mf-filter-body">
          ${gnCountHtml || '<div class="small text-muted">No data</div>'}
        </div>
      </div>

      <!-- Typologie plechu (GN type) -->
      <div class="mf-filter-group mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2 mf-filter-toggle"
             data-target="mf-f-gntype"
             style="cursor:pointer;">
          <span class="fw-bold text-primary text-uppercase small" data-i18n="unox.filter.gnType">Typologie plechu</span>
          <span class="mf-filter-arrow small">▴</span>
        </div>
        <div id="mf-f-gntype" class="mf-filter-body">
          ${gnTypeHtml || '<div class="small text-muted">No data</div>'}
        </div>
      </div>
    `;

        // Accordion toggle
        slot.querySelectorAll(".mf-filter-toggle").forEach((tgl) => {
            const targetId = tgl.getAttribute("data-target");
            const body = slot.querySelector("#" + targetId);
            const arrow = tgl.querySelector(".mf-filter-arrow");
            tgl.addEventListener("click", () => {
                if (!body) return;
                body.classList.toggle("d-none");
                if (arrow) arrow.textContent = body.classList.contains("d-none") ? "▾" : "▴";
            });
        });

        // Checkbox filters (power, series)
        slot.querySelectorAll(".mf-filter-checkbox").forEach((cb) => {
            cb.addEventListener("change", () => {
                const key = cb.getAttribute("data-filter");
                const val = cb.value;
                const set = filterState[key];
                if (!(set instanceof Set)) return;
                if (cb.checked) set.add(val);
                else set.delete(val);
                currentPage = 1;
                applyFilter();
                renderProducts();
            });
        });

        // Pill buttons (gnCount, gnType)
        slot.querySelectorAll(".mf-filter-chip").forEach((btn) => {
            btn.addEventListener("click", () => {
                const key = btn.getAttribute("data-filter");
                const val = btn.getAttribute("data-value");
                const set = filterState[key];
                if (!(set instanceof Set)) return;

                if (set.has(val)) {
                    set.delete(val);
                    btn.classList.remove("active");
                } else {
                    set.add(val);
                    btn.classList.add("active");
                }
                currentPage = 1;
                applyFilter();
                renderProducts();
            });
        });

        // Price slider
        const minInput = slot.querySelector("#mf-price-min");
        const maxInput = slot.querySelector("#mf-price-max");
        const priceLabel = slot.querySelector("#mf-price-label");
        const minLabel = slot.querySelector("#mf-price-min-label");
        const maxLabel = slot.querySelector("#mf-price-max-label");

        if (minInput && maxInput && priceLabel) {
            const updatePrice = () => {
                let minVal = Number(minInput.value);
                let maxVal = Number(maxInput.value);
                if (minVal > maxVal) [minVal, maxVal] = [maxVal, minVal];

                filterState.priceMin = minVal;
                filterState.priceMax = maxVal;

                minInput.value = minVal;
                maxInput.value = maxVal;

                const minText = fmtPrice(minVal, "Kč");
                const maxText = fmtPrice(maxVal, "Kč");
                priceLabel.textContent = `${minText} - ${maxText}`;
                if (minLabel) minLabel.textContent = minText;
                if (maxLabel) maxLabel.textContent = maxText;

                currentPage = 1;
                applyFilter();
                renderProducts();
            };

            minInput.addEventListener("input", updatePrice);
            maxInput.addEventListener("input", updatePrice);
        }
    }


    function matchPrice(p) {
        if (!p.price || globalMinPrice == null) return true;
        const min = filterState.priceMin ?? globalMinPrice;
        const max = filterState.priceMax ?? globalMaxPrice;
        return p.price >= min && p.price <= max;
    }


    function matchesFilters(p) {
        // Napájení
        if (filterState.power.size && !filterState.power.has(p.power)) {
            return false;
        }

        // Řada (ít nhất 1 series trùng)
        if (filterState.series.size) {
            const hasAny = (p.series || []).some((s) => filterState.series.has(s));
            if (!hasAny) return false;
        }

        // Vsuvů (GN count)
        if (filterState.gnCount.size) {
            const key = String(p.gnCount);
            if (!filterState.gnCount.has(key)) return false;
        }

        // Typologie plechu (GN type)
        if (filterState.gnType.size) {
            if (!filterState.gnType.has(p.gnType)) return false;
        }

        // Giá
        if (!matchPrice(p)) return false;

        return true;
    }


    // ===== Phân trang =====
    function renderPager(totalItems) {
        const slot = document.querySelector(PAGER_SLOT);
        if (!slot) return;

        const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
        if (totalPages <= 1) {
            slot.innerHTML = "";
            updateURL();
            return;
        }

        currentPage = Math.min(Math.max(1, currentPage), totalPages);

        const pages = [];
        const push = (n) => pages.push(n);
        const addRange = (a, b) => {
            for (let i = a; i <= b; i++) pages.push(i);
        };

        const centerSpan = 2;
        const first = 1;
        const last = totalPages;

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
                        ? '<span class="mf-pg-ellipsis" aria-hidden="true">…</span>'
                        : `<a href="#" class="mf-pg-btn ${p === currentPage ? "is-active" : ""
                        }" data-page="${p}" aria-label="Page ${p}">${p}</a>`
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
                currentPage = page;
                renderProducts();
            });
        });

        updateURL();
    }

    function applyFilter() {
        let base;
        if (currentCategory === SEE_ALL) {
            base = allProducts.slice();
        } else {
            base = allProducts.filter(
                (p) => detectCategoryByName(p.name) === currentCategory
            );
        }
        filteredProducts = base.filter(matchesFilters);
    }

    function renderProducts() {
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageItems = filteredProducts.slice(start, end);

        grid.innerHTML = pageItems.map(cardHTML).join("");
        attachCardHandlers();
        renderPager(filteredProducts.length);

        const cnt = document.querySelector(COUNT_EL);
        if (cnt) cnt.textContent = `${filteredProducts.length} Prodotti`;

        try {
            document.dispatchEvent(
                new CustomEvent("mina:productsRendered", {
                    detail: { page: currentPage, total: filteredProducts.length },
                })
            );
        } catch { }
    }

    // ===== Loading & fetch =====
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
        // Tính min/max giá
        const prices = allProducts
            .map((p) => p.price)
            .filter((v) => typeof v === "number" && !isNaN(v));

        if (prices.length) {
            globalMinPrice = Math.min(...prices);
            globalMaxPrice = Math.max(...prices);
            // mặc định slider full range
            filterState.priceMin = globalMinPrice;
            filterState.priceMax = globalMaxPrice;
        }


        renderFilters();
        renderCategoryDropdown();
        applyFilter();

        const maxPage = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
        if (currentPage > maxPage) currentPage = 1;

        renderProducts();
    } catch (err) {
        console.error("Load products failed:", err);
        grid.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger" role="alert">${LABELS.error}</div>
    </div>
  `;
        const ps = document.querySelector(PAGER_SLOT);
        if (ps) ps.innerHTML = "";
        const cs = document.querySelector(CATEGORY_SLOT);
        if (cs) cs.innerHTML = "";
    }

    // ===== INQUIRY MODAL + EMAILJS (nếu bạn đang dùng, giữ nguyên block cũ) =====
    // (bỏ qua nếu trang này không có modal inquiry)
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".js-inquiry-btn");
        if (!btn) return;

        e.preventDefault();
        const id = btn.getAttribute("data-id");
        const product =
            filteredProducts.find((x) => String(x.id) === String(id)) ||
            allProducts.find((x) => String(x.id) === String(id));
        if (!product) {
            console.warn("[Inquiry] Không tìm thấy sản phẩm id=", id);
            return;
        }

        const modalEl = document.getElementById("inquiryModal");
        if (!modalEl) {
            console.warn("[Inquiry] #inquiryModal not found");
            return;
        }
        const modal =
            (bootstrap?.Modal?.getInstance
                ? bootstrap.Modal.getInstance(modalEl)
                : null) || new bootstrap.Modal(modalEl);

        const inqImg = document.getElementById("inq-img");
        const inqName = document.getElementById("inq-name");
        const inqLine = document.getElementById("inq-line");
        const inqSku = document.getElementById("inq-sku");
        const inqPrice = document.getElementById("inq-price");

        const inqEmail = document.getElementById("inq-email");
        const inqPhone = document.getElementById("inq-phone");
        const inqMsg = document.getElementById("inq-message");
        const inqForm = document.getElementById("inquiryForm");
        const inqStatus = document.getElementById("inq-status");
        const inqSubmit = document.getElementById("inq-submit");

        modalEl._currentProduct = product;

        inqImg.src = product.image || "img/placeholder.webp";
        inqImg.alt = product.name || "";
        inqName.textContent = product.name || "";
        inqLine.textContent = [product.line1, product.line2].filter(Boolean).join(" • ");
        inqSku.textContent = product.sku ? `SKU: ${product.sku}` : "";
        inqPrice.textContent = fmtPrice(product.price, product.currency);

        inqForm?.classList.remove("was-validated");
        if (inqEmail) inqEmail.value = "";
        if (inqPhone) inqPhone.value = "";
        if (inqMsg) inqMsg.value = "";
        if (inqStatus) inqStatus.textContent = "";

        modal.show();

        if (!modalEl._sendBound && inqSubmit) {
            modalEl._sendBound = true;
            inqSubmit.addEventListener("click", async () => {
                if (!inqForm) return;
                inqForm.classList.add("was-validated");
                if (!inqEmail?.checkValidity?.() || !inqPhone?.checkValidity?.()) {
                    if (inqStatus)
                        inqStatus.textContent =
                            "Please fill in your full Email and Phone Number.";
                    return;
                }
                const p = modalEl._currentProduct;
                if (!p) {
                    if (inqStatus) inqStatus.textContent = "Không tìm thấy sản phẩm.";
                    return;
                }

                inqSubmit.disabled = true;
                if (inqStatus) inqStatus.textContent = "Đang gửi...";

                const params = {
                    product_name: p.name || "",
                    product_line1: p.line1 || "",
                    product_line2: p.line2 || "",
                    product_sku: p.sku || "",
                    product_price: fmtPrice(p.price, p.currency),
                    product_image: p.image || "",
                    product_link: p.href || "",
                    page_url: window.location.href,
                    user_email: inqEmail.value.trim(),
                    user_phone: inqPhone.value.trim(),
                    user_message: inqMsg.value.trim(),
                };

                try {
                    const EMAILJS_SERVICE_ID = "service_d7r5mo7";
                    const EMAILJS_TEMPLATE_ID = "template_nnbndsu";
                    if (typeof emailjs === "undefined")
                        throw new Error("EmailJS SDK chưa được nạp hoặc chưa init");
                    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
                    if (inqStatus) inqStatus.textContent = "Done ! We will contact you soon.";
                    setTimeout(() => bootstrap.Modal.getInstance(modalEl)?.hide(), 1200);
                } catch (err) {
                    console.error(err);
                    if (inqStatus) inqStatus.textContent = "Fail. Please send Again.";
                } finally {
                    inqSubmit.disabled = false;
                }
            });
        }
    });

})();
