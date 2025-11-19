// js/unox_trays.js
(async function () {
    const GRID_SELECTOR = "#product-grid";
    const CATEGORY_NAV_SELECTOR = "#side-category";
    const PAGER_SLOT = "#pager-slot";

    const DATA_URL = "js/data/unox_gastronomic_accessories.json"; // file tổng 110 sản phẩm

    const LABELS = {
        loadingAria: "loading",
        error: "Không tải được danh sách khay. Vui lòng thử lại sau.",
        addToCart: "Add to Cart",
        added: "Added!",
        contact: "Na poptávku"
    };

    const PAGE_SIZE = 24;
    const ALL_CAT_SLUG = "all";

    let allProducts = [];
    let filteredProducts = [];
    let categories = [];
    let currentCategorySlug = ALL_CAT_SLUG;

    // state cho price filter
    let globalMinPrice = null;
    let globalMaxPrice = null;
    let priceMin = null;
    let priceMax = null;

    const grid = document.querySelector(GRID_SELECTOR);
    const nav = document.querySelector(CATEGORY_NAV_SELECTOR);
    if (!grid || !nav) return;

    // ===== DOM PRICE FILTER =====
    const priceMinInput = document.getElementById("price-min");
    const priceMaxInput = document.getElementById("price-max");
    const priceMinLabel = document.getElementById("price-min-label");
    const priceMaxLabel = document.getElementById("price-max-label");

    // ===== POPUP DOM =====
    const popup = document.getElementById("product-popup");
    const popupImg = document.getElementById("popup-img");
    const popupName = document.getElementById("popup-name");
    const popupDim = document.getElementById("popup-dim");
    const popupWeight = document.getElementById("popup-weight");
    const popupClose = document.querySelector(".product-popup-close");

    const txt = (v) => (v ?? "").toString().trim();

    const slugify = (s) =>
        txt(s)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "other";

    const fmtPrice = (price, currency) => {
        if (price == null || isNaN(price) || Number(price) <= 0) return "";
        const formatted = new Intl.NumberFormat("cs-CZ", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(price));
        const tail = (currency || "Kč bez DPH").trim();
        return `${formatted} ${tail}`.trim();
    };

    const buildInquiryMessage = (p = {}) => {
        const lines = [
            "Hello, I want to ask about this tray:",
            p.name ? `• Product name: ${p.name}` : "",
            p.line1 ? `• Detail: ${p.line1}` : "",
            p.sku ? `• SKU: ${p.sku}` : "",
            `• Source Page: ${location.href}`
        ].filter(Boolean);
        return lines.join("\n");
    };

    // ===== Chuẩn hoá sản phẩm từ JSON =====
    const normalize = (p) => {
        const seriesArr = Array.isArray(p.series) ? p.series : [];
        const featuresArr = Array.isArray(p.features) ? p.features : [];

        const categoryLabel = txt(p.category) || "Others";
        const categorySlug = txt(p.category_slug) || slugify(categoryLabel);

        return {
            id: p.model || p.id || p.sku || p.name || "",
            sku: p.model || p.sku || "",
            name: txt(p.name),

            line1: [txt(p.productType), seriesArr.join(" • ")]
                .filter(Boolean)
                .join(" • "),
            line2: "",

            label: txt(p.badge),
            price:
                p.price_czk == null || isNaN(Number(p.price_czk))
                    ? null
                    : Number(p.price_czk),
            currency: (p.currency || (p.price_czk != null ? "Kč" : "")).trim(),

            image: p.image || "img/placeholder.webp",
            href: p.url || p.href || "#",

            power: txt(p.power),
            series: seriesArr,
            features: featuresArr,
            consumption_text: p.consumption_text || "",
            emissions_text: p.emissions_text || "",
            vat_note: p.vat_note || "",
            price_text_raw: p.price_text || "",

            width_mm: p.width_mm ?? null,
            depth_mm: p.depth_mm ?? null,
            height_mm: p.height_mm ?? null,

            categoryLabel,
            categorySlug
        };
    };

    // ===== Card HTML =====
    const cardHTML = (p) => {
        const priceText = fmtPrice(p.price, p.currency);
        const hasPrice = Number.isFinite(p.price) && Number(p.price) > 0;
        const msg = encodeURIComponent(buildInquiryMessage(p));

        return `
      <div class="col-md-6 col-lg-4">
        <div class="rounded position-relative fruite-item h-100"
             data-id="${String(p.id).replace(/"/g, "&quot;")}">
          <div class="fruite-img">
            <img src="${p.image}"
                 class="img-fluid w-100 rounded-top border border-secondary"
                 alt="${p.name}">
          </div>
          ${p.label
                ? `<div class="text-white bg-secondary px-3 py-1 rounded position-absolute"
                     style="top:10px;left:10px;font-size:12px">
                   ${p.label}
                 </div>`
                : ""
            }
          <div class="p-4 border border-secondary border-top-0 rounded-bottom d-flex flex-column">
            <h4 class="mb-2 line-clamp-2" title="${p.name}">${p.name}</h4>
            ${p.line1
                ? `<p class="mb-1 text-muted line-clamp-2" title="${p.line1}">${p.line1}</p>`
                : ""
            }
            ${p.sku
                ? `<p class="mb-1 small text-secondary" title="SKU: ${p.sku}">SKU: ${p.sku}</p>`
                : ""
            }
            ${p.power
                ? `<p class="mb-1 small text-secondary">Power: ${p.power}</p>`
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
    };

    // ===== POPUP =====
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

        const dimHtml =
            p.width_mm || p.depth_mm || p.height_mm
                ? `<div class="mt-2 small">
             ${p.width_mm != null
                    ? `<div><strong>Width:</strong> ${p.width_mm} mm</div>`
                    : ""
                }
             ${p.depth_mm != null
                    ? `<div><strong>Depth:</strong> ${p.depth_mm} mm</div>`
                    : ""
                }
             ${p.height_mm != null
                    ? `<div><strong>Height:</strong> ${p.height_mm} mm</div>`
                    : ""
                }
           </div>`
                : "";

        const greenBoxHtml =
            p.consumption_text || p.emissions_text
                ? `<div class="mt-3 p-2 rounded small" style="background:#e3f6df;">
             ${p.consumption_text || ""}<br>
             ${p.emissions_text || ""}
           </div>`
                : "";

        popupDim.innerHTML = `
      ${p.sku || p.line1
                ? `<div class="mb-1 small text-muted">
               ${p.sku ? `<strong>${p.sku}</strong>` : ""}${p.line1 ? ` – ${p.line1}` : ""
                }
             </div>`
                : ""
            }
      ${seriesHtml}
      ${featuresHtml}
      ${dimHtml}
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
    if (popup) {
        popup.addEventListener("click", (e) => {
            if (e.target === popup) closePopup();
        });
    }

    function attachCardHandlers() {
        grid.querySelectorAll(".fruite-item").forEach((item) => {
            item.addEventListener("click", (ev) => {
                // Nếu bấm vào nút/cart link thì không mở popup
                if (ev.target.closest("a,button")) return;

                const id = item.dataset.id;
                const p =
                    filteredProducts.find((prod) => String(prod.id) === String(id)) ||
                    allProducts.find((prod) => String(prod.id) === String(id));
                if (p) openPopup(p);
            });
        });
    }

    // ===== Phân trang =====
    function renderPager(totalItems) {
        const slot = document.querySelector(PAGER_SLOT);
        if (!slot) return;

        const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
        if (totalPages <= 1) {
            slot.innerHTML = "";
            return;
        }

        let currentPage = Number(
            new URLSearchParams(location.search).get("page") || "1"
        );
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

    function getCurrentPage() {
        const qs = new URLSearchParams(location.search);
        const p = parseInt(qs.get("page") || "1", 10);
        return isNaN(p) || p < 1 ? 1 : p;
    }

    // ===== FILTER sản phẩm theo category + price =====
    function applyFilters() {
        let list;

        if (currentCategorySlug === ALL_CAT_SLUG) {
            list = allProducts.slice();
        } else {
            list = allProducts.filter((p) => p.categorySlug === currentCategorySlug);
        }

        if (Number.isFinite(priceMin) && Number.isFinite(priceMax)) {
            list = list.filter((p) => {
                if (!Number.isFinite(p.price)) return false; // sản phẩm không có giá thì ẩn khi lọc theo CENA
                return p.price >= priceMin && p.price <= priceMax;
            });
        }

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

    function initStaticCategoryNav() {
        const qs = new URLSearchParams(location.search);
        const initSlug = qs.get("cat");
        if (initSlug) currentCategorySlug = initSlug;

        // Set active theo ?cat trên URL (nếu có)
        nav.querySelectorAll(".mf-cat-link").forEach((a) => {
            const slug = a.getAttribute("data-cat") || ALL_CAT_SLUG;
            if (slug === currentCategorySlug) {
                a.classList.add("active");
            }

            a.addEventListener("click", (e) => {
                e.preventDefault();
                const newSlug = a.getAttribute("data-cat") || ALL_CAT_SLUG;
                if (newSlug === currentCategorySlug) return;

                currentCategorySlug = newSlug;

                // đổi active
                nav.querySelectorAll(".mf-cat-link")
                    .forEach((el) => el.classList.remove("active"));
                a.classList.add("active");

                // update URL
                const url = new URL(location.href);
                url.searchParams.set("cat", newSlug);
                url.searchParams.set("page", "1");
                history.replaceState(null, "", url);

                applyFilters();
                renderProducts();
            });
        });
    }


    // ===== PRICE FILTER init =====
    function initPriceFilter() {
        if (!priceMinInput || !priceMaxInput) return;

        const prices = allProducts
            .map((p) => p.price)
            .filter((v) => Number.isFinite(v));

        if (!prices.length) return;

        globalMinPrice = Math.floor(Math.min(...prices));
        globalMaxPrice = Math.ceil(Math.max(...prices));

        const qs = new URLSearchParams(location.search);
        let qsMin = parseInt(qs.get("min") || "", 10);
        let qsMax = parseInt(qs.get("max") || "", 10);
        if (!Number.isFinite(qsMin)) qsMin = globalMinPrice;
        if (!Number.isFinite(qsMax)) qsMax = globalMaxPrice;
        if (qsMin > qsMax) {
            qsMin = globalMinPrice;
            qsMax = globalMaxPrice;
        }

        priceMin = qsMin;
        priceMax = qsMax;

        priceMinInput.min = String(globalMinPrice);
        priceMinInput.max = String(globalMaxPrice);
        priceMaxInput.min = String(globalMinPrice);
        priceMaxInput.max = String(globalMaxPrice);

        priceMinInput.value = String(priceMin);
        priceMaxInput.value = String(priceMax);

        if (priceMinLabel)
            priceMinLabel.textContent = priceMin.toLocaleString("cs-CZ");
        if (priceMaxLabel)
            priceMaxLabel.textContent = priceMax.toLocaleString("cs-CZ");

        const onRangeChange = (e) => {
            let vMin = parseInt(priceMinInput.value || "", 10);
            let vMax = parseInt(priceMaxInput.value || "", 10);

            if (!Number.isFinite(vMin)) vMin = globalMinPrice;
            if (!Number.isFinite(vMax)) vMax = globalMaxPrice;

            if (vMin > vMax) {
                if (e.target === priceMinInput) {
                    vMax = vMin;
                } else {
                    vMin = vMax;
                }
            }

            priceMin = vMin;
            priceMax = vMax;

            priceMinInput.value = String(priceMin);
            priceMaxInput.value = String(priceMax);

            if (priceMinLabel)
                priceMinLabel.textContent = priceMin.toLocaleString("cs-CZ");
            if (priceMaxLabel)
                priceMaxLabel.textContent = priceMax.toLocaleString("cs-CZ");

            const url = new URL(location.href);
            url.searchParams.set("min", String(priceMin));
            url.searchParams.set("max", String(priceMax));
            url.searchParams.set("page", "1");
            history.replaceState(null, "", url);

            applyFilters();
            renderProducts();
        };

        priceMinInput.addEventListener("input", onRangeChange);
        priceMaxInput.addEventListener("input", onRangeChange);
    }

    // ===== Add to Cart (giữ như cũ) =====
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
            qty: 1
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

    // ===== Load JSON & init =====
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

        initPriceFilter();
        initStaticCategoryNav();  // dùng menu HTML sẵn có
        applyFilters();
        renderProducts();
    } catch (err) {
        console.error("Load trays failed:", err);
        grid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger" role="alert">${LABELS.error}</div>
      </div>
    `;
        const ps = document.querySelector(PAGER_SLOT);
        if (ps) ps.innerHTML = "";
    }
})();
