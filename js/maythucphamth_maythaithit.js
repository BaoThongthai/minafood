// /js/products_filter_paged.js
(async function () {
    const GRID_SELECTOR = "#product-grid";
    const COUNT_EL = "#product-count";
    const PAGER_SLOT = "#pager-slot";
    const CATEGORY_SLOT = "#category-slot";

    const DATA_URL = "js/data/maythucphamth_maythaithit.json"; // ← đổi sang file JSON của bạn

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


    const SEE_ALL = LABELS.seeAll;

    // ========= STATE =========
    let allProducts = [];
    let filteredProducts = [];
    let currentPage = 1; // 1-based
    let currentCategory = SEE_ALL;

    // đọc ?cat & ?page
    const qs = new URLSearchParams(location.search);
    const initCat = qs.get("cat");
    const initPage = parseInt(qs.get("page"), 10);
    if (initCat) currentCategory = initCat;
    if (!isNaN(initPage) && initPage >= 1) currentPage = initPage;

    const grid = document.querySelector(GRID_SELECTOR);
    if (!grid) return;

    // ========= UTIL =========
    const normalize = (p) => ({
        id: p?.id || p?.sku || p?.name || "",
        sku: p?.sku || "",
        name: p?.name || "",
        line1: p?.line1 || "",
        line2: p?.line2 || "",
        label: p?.label || "",
        // cố gắng chuyển giá thành number; nếu rỗng => null
        price: p?.price === "" || p?.price == null ? null : Number(p.price),
        currency: (p?.currency || "").trim(), // có thể rỗng
        image: p?.image || "img/placeholder.webp",
        href: p?.href || "#",
        sp: p?.sp ?? null,
    });

    // Format giá: cs-CZ, 2 số lẻ. Nếu không có currency → mặc định "Kč bez DPH"
    const fmtPrice = (price, currency) => {
        // coi như “không có giá” nếu null/NaN/<=0
        if (price == null || price === "" || isNaN(price) || Number(price) <= 0)
            return "";
        const formatted = new Intl.NumberFormat("cs-CZ", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(price));
        const tail = (currency || "Kč bez DPH").trim();
        return `${formatted} ${tail}`.trim();
    };

    // Tạo nội dung tin nhắn hỏi hàng (đi qua trang contact)
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
      <div class="rounded position-relative fruite-item h-100" data-id="${String(p.id).replace(/"/g, "&quot;")}">
        <div class="fruite-img">
          <img src="${p.image}" class="img-fluid w-100 rounded-top border border-secondary" alt="${p.name}">
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


    // Popup (tận dụng markup sẵn)
    const popup = document.getElementById("product-popup");
    const popupImg = document.getElementById("popup-img");
    const popupName = document.getElementById("popup-name");
    const popupDim = document.getElementById("popup-dim");
    const popupWeight = document.getElementById("popup-weight");
    const popupClose = document.querySelector(".product-popup-close");

    function openPopup(p) {
        popupImg.src = p.image || "img/placeholder.webp";
        popupImg.alt = p.name || "";
        popupName.textContent = p.name || "";
        popupDim.textContent = [p.line1, p.line2].filter(Boolean).join(" • ");
        popupWeight.textContent = [
            p.sku ? `SKU: ${p.sku}` : "",
            fmtPrice(p.price, p.currency),
        ]
            .filter(Boolean)
            .join(" | ");
        popup.classList.remove("hidden");
    }
    function closePopup() {
        popup.classList.add("hidden");
    }
    if (popupClose) popupClose.addEventListener("click", closePopup);
    if (popup)
        popup.addEventListener("click", (e) => {
            if (e.target === popup) closePopup();
        });

    function attachCardHandlers() {
        grid.querySelectorAll(".fruite-item").forEach((item) => {
            item.addEventListener("click", (ev) => {
                // tránh mở popup khi bấm nút
                if (ev.target.closest("a,button")) return;
                const id = item.dataset.id;
                const p = filteredProducts.find(
                    (prod) => String(prod.id) === String(id)
                );
                if (p) openPopup(p);
            });
        });
    }

    // ===== Add to Cart (uỷ quyền trên grid để không mất sau re-render) =====
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

    // ===== Dropdown category (Bootstrap) =====
    function updateURL() {
        const url = new URL(location.href);
        url.searchParams.set("page", String(currentPage));
        url.searchParams.set("cat", currentCategory);
        history.replaceState(null, "", url);
    }

    function renderCategoryDropdown() {
        const slot = document.querySelector(CATEGORY_SLOT);
        if (!slot) return;

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

    // ===== Phân trang Prev / Select / Next =====
    function renderPager(totalItems) {
        const slot = document.querySelector(PAGER_SLOT);
        if (!slot) return;

        const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
        // Nếu chỉ 1 trang thì xoá pager & thoát
        if (totalPages <= 1) {
            slot.innerHTML = "";
            updateURL();
            return;
        }

        // Clamp currentPage
        currentPage = Math.min(Math.max(1, currentPage), totalPages);

        // Tạo dải trang kiểu: ‹ 1 … c-2 c-1 c c+1 c+2 … last ›
        const pages = [];
        const push = (n) => pages.push(n);
        const addRange = (a, b) => {
            for (let i = a; i <= b; i++) pages.push(i);
        };

        const centerSpan = 2; // số trang mỗi bên current
        const first = 1;
        const last = totalPages;

        push(first);

        let start = Math.max(first + 1, currentPage - centerSpan);
        let end = Math.min(last - 1, currentPage + centerSpan);

        // nới để đủ 5 trang trung tâm khi sát biên
        const desired = 1 + 1 + (centerSpan * 2 + 1) + 1; // 1 + mid(5) + 1 = 7 “điểm” (không tính …)
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

        // Gắn click (Prev/Next + số)
        slot.querySelectorAll(".mf-pg-btn").forEach((btn) => {
            const page = parseInt(btn.getAttribute("data-page"), 10);
            if (isNaN(page)) return;
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                if (page < 1 || page > totalPages || page === currentPage) return;
                currentPage = page;
                renderProducts(); // gọi lại render
            });
        });

        updateURL(); // đồng bộ ?page
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

    // ========== INQUIRY MODAL + EMAILJS (giữ nguyên logic bạn đang dùng) ==========
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
        inqLine.textContent = [product.line1, product.line2]
            .filter(Boolean)
            .join(" • ");
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
                    if (inqStatus)
                        inqStatus.textContent = "Done ! We will contact you soon.";
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
    // nhận search
})();
