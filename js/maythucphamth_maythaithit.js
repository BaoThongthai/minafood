// /js/products_filter_paged.js
(async function () {
    const GRID_SELECTOR = "#product-grid";
    const COUNT_EL = "#product-count";
    const PAGER_SLOT = "#pager-slot";
    const CATEGORY_SLOT = "#category-slot";

    const DATA_URL = "js/data/maythucphamth_maythaithit.json";

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

    // ========= CATEGORY RULES =========
    // (Bạn giữ nguyên các rules cũ của bạn ở đây nếu có)

    const SEE_ALL = LABELS.seeAll;

    // ========= STATE =========
    let allProducts = [];
    let filteredProducts = [];
    let currentPage = 1;
    let currentCategory = SEE_ALL;

    const qs = new URLSearchParams(location.search);
    const initCat = qs.get("cat");
    const initPage = parseInt(qs.get("page"), 10);
    if (initCat) currentCategory = initCat;
    if (!isNaN(initPage) && initPage >= 1) currentPage = initPage;

    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return;

    // ========= UTIL (CORE UPDATE HERE) =========

    /**
     * Hàm chuẩn hóa dữ liệu: Biến cả JSON cũ và JSON mới thành 1 format chung
     */
    const normalize = (p) => {
        if (!p) return null;

        // 1. Xác định các trường cơ bản
        // Cũ: id/sku - Mới: code
        const rawId = p.id || p.sku || p.code || p.name || "";
        const id = String(rawId).replace(/"/g, ""); // Clean ID

        // Cũ: sku - Mới: code
        const sku = p.sku || p.code || "";

        const name = p.name || "";

        // 2. Xử lý giá tiền
        // Cũ: price - Mới: price (số nguyên)
        let price = null;
        if (p.price !== "" && p.price != null) {
            price = Number(p.price);
        }

        // Cũ: currency - Mới: price_currency
        const currency = (p.currency || p.price_currency || "").trim();

        // 3. Xử lý hình ảnh
        // Cũ & Mới đều dùng key "image". 
        // Lưu ý: Nếu JSON mới dùng link tuyệt đối (https://...) thì vẫn hoạt động tốt.
        const image = p.image || "img/placeholder.webp";

        // 4. Xử lý đường dẫn chi tiết
        // Cũ: href - Mới: url
        const href = p.href || p.url || "#";

        // 5. Xử lý thông tin hiển thị (Line 1 & Line 2)
        // Đây là phần quan trọng nhất để hiển thị đẹp cho JSON mới
        let line1 = p.line1 || "";
        let line2 = p.line2 || "";

        // Nếu là JSON mới (có trường specs), ta tự động tạo line1/line2 từ specs
        if (p.specs) {
            const s = p.specs;

            // Line 1: Ưu tiên Kích thước (WxDxH) hoặc Thương hiệu
            const dims = [s.width, s.depth, s.height].filter(x => x).join('x');
            if (dims) {
                line1 = `Dim: ${dims} mm`;
            } else if (s.brand) {
                line1 = `Brand: ${s.brand}`;
            }

            // Line 2: Ưu tiên Điện áp, Công suất hoặc Đặc điểm
            const technical = [];
            if (s.voltage) technical.push(`${s.voltage}V`);
            if (s.electrical_power) technical.push(`${s.electrical_power}kW`);
            if (s.capacity_in_units_per_hour) technical.push(s.capacity_in_units_per_hour);

            if (technical.length > 0) {
                line2 = technical.join(" | ");
            } else {
                line2 = s.particulars || s.color || "";
            }
        }

        return {
            id: id,
            sku: sku,
            name: name,
            line1: line1,
            line2: line2,
            label: p.label || "", // JSON mới không có label, để trống
            price: price,
            currency: currency,
            image: image,
            href: href,
            // Giữ lại specs gốc nếu cần dùng sau này (ví dụ popup)
            specs: p.specs || null,
            accessories: p.accessories || []
        };
    };

    const fmtPrice = (price, currency) => {
        if (price == null || price === "" || isNaN(price) || Number(price) <= 0)
            return "";
        const formatted = new Intl.NumberFormat("cs-CZ", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(price));
        // Mặc định CZK nếu không có currency
        const tail = (currency || "Kč bez DPH").trim();
        // Nếu currency là "CZK" (từ json mới), ta có thể đổi hiển thị thành "Kč" cho đẹp nếu muốn
        const displayTail = tail === "CZK" ? "Kč" : tail;

        return `${formatted} ${displayTail}`.trim();
    };

    const buildInquiryMessage = (p = {}) => {
        const lines = [
            'Hello, I want to ask about this product:',
            p.name ? `• Product name: ${p.name}` : '',
            p.line1 ? `• Detail 1: ${p.line1}` : '',
            p.line2 ? `• Detail 2: ${p.line2}` : '',
            p.sku ? `• SKU: ${p.sku}` : '',
            `• Source Page: ${location.href}`
        ].filter(Boolean);
        return lines.join('\n');
    };

    function detectCategoryByName(name = "") {
        // Lưu ý: Đảm bảo biến CATEGORY_RULES đã được định nghĩa ở file khác hoặc phía trên
        if (typeof CATEGORY_RULES === 'undefined') return SEE_ALL;

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
    <div class="col-md-6 col-lg-4 col-xl-3">
      <div class="rounded position-relative fruite-item h-100" data-id="${p.id}">
        <div class="fruite-img">
          <img src="${p.image}" class="img-fluid w-100 rounded-top border border-secondary" alt="${p.name}" loading="lazy">
        </div>
        ${p.label ? `<div class="text-white bg-secondary px-3 py-1 rounded position-absolute" style="top:10px;left:10px;font-size:12px">${p.label}</div>` : ''}

        <div class="p-4 border border-secondary border-top-0 rounded-bottom d-flex flex-column">
            <h4 class="mb-2 line-clamp-2" title="${p.name}">${p.name}</h4>
            
            ${p.line1 ? `<p class="mb-1 text-muted line-clamp-2" title="${p.line1}">${p.line1}</p>` : ''}
            ${p.line2 ? `<p class="mb-2 text-muted line-clamp-2" title="${p.line2}">${p.line2}</p>` : ''}
            ${p.sku ? `<p class="mb-2 small text-secondary line-clamp-1" title="SKU: ${p.sku}">SKU: ${p.sku}</p>` : ''}

            ${priceText ? `<p class="mb-3 fw-semibold">${priceText}</p>` : `<p class="mb-3"></p>`}

            <div class="mt-auto d-flex justify-content-between gap-2">
            ${hasPrice
                ? `
                  <a href="#"
                     class="btn border border-secondary rounded-pill px-3 text-primary add-to-cart"
                     data-id="${p.id}"
                     data-name="${p.name}"
                     data-price="${p.price ?? ""}"
                     data-currency="${p.currency || "Kč"}"
                     data-image="${p.image}">
                     <i class="fa fa-shopping-bag me-2 text-primary"></i>
                     <span>${LABELS.addToCart}</span>
                  </a>
                `
                : `
                  <a href="/contact.html?msg=${msg}"
                     class="btn border border-secondary rounded-pill px-3 text-primary js-inquiry-btn"
                     data-id="${p.id}"
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

    // Popup Logic
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

        // Popup hiển thị line1 và line2 (đã được normalize từ specs nếu là json mới)
        popupDim.textContent = [p.line1, p.line2].filter(Boolean).join(" • ");

        popupWeight.textContent = [
            p.sku ? `SKU: ${p.sku}` : "",
            fmtPrice(p.price, p.currency),
        ].filter(Boolean).join(" | ");

        popup.classList.remove("hidden");
    }

    function closePopup() {
        if (popup) popup.classList.add("hidden");
    }

    if (popupClose) popupClose.addEventListener("click", closePopup);
    if (popup) popup.addEventListener("click", (e) => {
        if (e.target === popup) closePopup();
    });

    function attachCardHandlers() {
        grid.querySelectorAll(".fruite-item").forEach((item) => {
            item.addEventListener("click", (ev) => {
                if (ev.target.closest("a,button")) return;
                const id = item.dataset.id;
                const p = filteredProducts.find((prod) => String(prod.id) === String(id));
                if (p) openPopup(p);
            });
        });
    }

    // ===== Add to Cart =====
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

    // ===== Dropdown category =====
    function updateURL() {
        const url = new URL(location.href);
        url.searchParams.set("page", String(currentPage));
        url.searchParams.set("cat", currentCategory);
        history.replaceState(null, "", url);
    }

    function renderCategoryDropdown() {
        const slot = document.querySelector(CATEGORY_SLOT);
        if (!slot) return;

        // Nếu CATEGORY_RULES chưa define thì bỏ qua hoặc handle lỗi
        if (typeof CATEGORY_RULES === 'undefined') return;

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
          ${ordered.map((n) => `
            <li><a class="dropdown-item ${n === currentCategory ? "active" : ""}" href="#" data-cat="${n}">${n}</a></li>
          `).join("")}
        </ul>
      </div>`;

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

    // ===== Pager =====
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
        const addRange = (a, b) => { for (let i = a; i <= b; i++) pages.push(i); };

        const centerSpan = 2;
        const first = 1;
        const last = totalPages;

        push(first);
        let start = Math.max(first + 1, currentPage - centerSpan);
        let end = Math.min(last - 1, currentPage + centerSpan);

        const midCount = end >= start ? end - start + 1 : 0;
        let missing = centerSpan * 2 + 1 - midCount;
        while (missing > 0 && start > first + 1) { start--; missing--; }
        while (missing > 0 && end < last - 1) { end++; missing--; }

        if (start > first + 1) pages.push("...");
        if (end >= start) addRange(start, end);
        if (end < last - 1) pages.push("...");
        if (last > first) push(last);

        slot.innerHTML = `
        <div class="mf-pager-wrap">
          <nav class="mf-pager" aria-label="Pagination">
            <a href="#" class="mf-pg-btn ${currentPage === 1 ? "is-disabled" : ""}" data-page="${currentPage - 1}" aria-label="Previous">‹</a>
            ${pages.map((p) =>
            p === "..."
                ? '<span class="mf-pg-ellipsis" aria-hidden="true">…</span>'
                : `<a href="#" class="mf-pg-btn ${p === currentPage ? "is-active" : ""}" data-page="${p}" aria-label="Page ${p}">${p}</a>`
        ).join("")}
            <a href="#" class="mf-pg-btn ${currentPage === totalPages ? "is-disabled" : ""}" data-page="${currentPage + 1}" aria-label="Next">›</a>
          </nav>
        </div>`;

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
        if (currentCategory === SEE_ALL) {
            filteredProducts = allProducts.slice();
        } else {
            filteredProducts = allProducts.filter(
                (p) => detectCategoryByName(p.name) === currentCategory
            );
        }
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

    // ===== Loading & Fetch =====
    grid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border" role="status" aria-label="${LABELS.loadingAria}"></div>
    </div>`;

    try {
        const res = await fetch(DATA_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();

        // Chuẩn hóa dữ liệu ngay khi tải về
        allProducts = (Array.isArray(raw) ? raw : [])
            .map(normalize) // <--- Điểm mấu chốt: Map qua hàm normalize mới
            .filter((p) => p && p.name);

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
      </div>`;
        const ps = document.querySelector(PAGER_SLOT);
        if (ps) ps.innerHTML = "";
        const cs = document.querySelector(CATEGORY_SLOT);
        if (cs) cs.innerHTML = "";
    }

    // ========== INQUIRY MODAL ==========
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".js-inquiry-btn");
        if (!btn) return;

        e.preventDefault();
        const id = btn.getAttribute("data-id");
        // Tìm sản phẩm theo ID (đã được clean dấu ngoặc kép ở hàm normalize)
        const product = filteredProducts.find((x) => String(x.id) === String(id)) ||
            allProducts.find((x) => String(x.id) === String(id));

        if (!product) {
            console.warn("[Inquiry] Không tìm thấy sản phẩm id=", id);
            return;
        }

        const modalEl = document.getElementById("inquiryModal");
        if (!modalEl) return;

        const modal = (bootstrap?.Modal?.getInstance ? bootstrap.Modal.getInstance(modalEl) : null) || new bootstrap.Modal(modalEl);

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

        if (inqImg) {
            inqImg.src = product.image || "img/placeholder.webp";
            inqImg.alt = product.name || "";
        }
        if (inqName) inqName.textContent = product.name || "";
        if (inqLine) inqLine.textContent = [product.line1, product.line2].filter(Boolean).join(" • ");
        if (inqSku) inqSku.textContent = product.sku ? `SKU: ${product.sku}` : "";
        if (inqPrice) inqPrice.textContent = fmtPrice(product.price, product.currency);

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
                    if (inqStatus) inqStatus.textContent = "Please fill in your full Email and Phone Number.";
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
                    if (typeof emailjs === "undefined") throw new Error("EmailJS SDK missing");

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