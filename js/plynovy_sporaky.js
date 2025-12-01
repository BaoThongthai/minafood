// /js/products_filter_paged.js
(async function () {
  const GRID_SELECTOR = "#product-grid";
  const COUNT_EL = "#product-count";
  const PAGER_SLOT = "#pager-slot";
  const CATEGORY_SLOT = "#category-slot";
  const EXTRA_FILTER_SLOT = "#extra-filter-slot"; // optional: filter số hořák + loại thiết bị + nguồn nhiệt + cooking range + base

  const DATA_URL = "js/data/plynovy_sporaky.json"; // đổi sang JSON khác nếu dùng cho trang khác

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

  // ========= I18N đơn giản (EN / CS) =========
  const LANGS = ["en", "cs"];

  function getLang() {
    const g = (window.minaLang || "").toLowerCase();
    return LANGS.includes(g) ? g : "cs"; // default Czech
  }

  const I18N = {
    categoryTitle: { en: "Category", cs: "Kategorie" },
    all: { en: "All", cs: "Vše" },

    catElectric: { en: "Electric stoves", cs: "Elektrické sporáky" },
    catGas: { en: "Gas stoves", cs: "Plynové sporáky" },
    catOther: { en: "Accessories / Others", cs: "Příslušenství / Ostatní" },

    burnersTitle: { en: "Number of burners", cs: "Počet hořáků" },
    burnersAll: { en: "All", cs: "Vše" },
    burners1: { en: "1 burner", cs: "1 hořák" },
    burners2: { en: "2 burners", cs: "2 hořáky" },
    burners3: { en: "3 burners", cs: "3 hořáky" },
    burners4plus: { en: "4+ burners", cs: "4+ hořáků" },

    // Loại thiết bị
    typeTitle: { en: "Appliance type", cs: "Typ zařízení" },
    typeAll: { en: "All", cs: "Vše" },
    typeStove: { en: "Stoves / wok", cs: "Sporáky / wok" },
    typeGrill: { en: "Grills / BBQ", cs: "Grilly / BBQ" },
    typeFryer: { en: "Deep fryers", cs: "Fritézy" },
    typeChinese: { en: "Chinese cooker", cs: "Čínský sporák" },
    typeSpare: { en: "Accessories", cs: "Příslušenství" },

    // Nguồn nhiệt
    powerTitle: { en: "Power source", cs: "Typ ohřevu" },
    powerAll: { en: "All", cs: "Vše" },
    powerGas: { en: "Gas", cs: "Plyn" },
    powerElectric: { en: "Electric", cs: "Elektřina" },
    powerCombo: {
      en: "Gas & electric / Infrared",
      cs: "Kombinované / infra",
    },

    // 🔹 Cooking range type (hình 1)
    rangeKindTitle: {
      en: "Cooking range type",
      cs: "Typ varné desky",
    },
    rangeAll: { en: "All", cs: "Vše" },
    rangeRange: { en: "Range", cs: "Range" },
    rangeInduction: { en: "Induction", cs: "Indukce" },
    rangeWithOven: { en: "Range with oven", cs: "Range s troubou" },

    // 🔹 Base (hình 2)
    baseTitle: { en: "Base", cs: "Base" },
    baseAll: { en: "All", cs: "Vše" },
    base700: { en: "Base 700", cs: "Base 700" },
    base700Top: {
      en: "Base 700 Countertop",
      cs: "Base 700 Countertop",
    },
    base900: { en: "Base 900", cs: "Base 900" },
    baseDropIn: {
      en: "Drop-in cooking range",
      cs: "Drop-in cooking range",
    },
  };

  function t(key) {
    const lang = getLang();
    const obj = I18N[key];
    return obj ? obj[lang] || obj["cs"] || key : key;
  }

  // Cho phép nơi khác đổi ngôn ngữ:
  window.minaSetLang = function (lang) {
    if (!LANGS.includes(lang)) return;
    window.minaLang = lang;
    // re-render filter theo lang mới
    renderCategorySidebar();
    renderExtraFilters();
    renderProducts();
  };

  // ========= CATEGORY RULES =========
  const CATEGORY_RULES = [
    {
      key: "electric",
      test: (t) => /(electric|elektrick|induction|indukční)/i.test(t),
    },
    {
      key: "gas",
      test: (t) =>
        /(plynov|gas)/i.test(t) &&
        !/(burner tile|burner head|shield plate)/i.test(t),
    },
    {
      key: "other",
      test: (_t) => true,
    },
  ];

  function getCategoryLabel(key) {
    switch (key) {
      case "electric":
        return t("catElectric");
      case "gas":
        return t("catGas");
      case "other":
      default:
        return t("catOther");
    }
  }

  const CAT_ALL_KEY = "all";

  // ========= EXTRA FILTER: số hořák =========
  const BURNER_KEYS = ["all", "1", "2", "3", "4+"];

  function getBurnerLabel(key) {
    switch (key) {
      case "1":
        return t("burners1");
      case "2":
        return t("burners2");
      case "3":
        return t("burners3");
      case "4+":
        return t("burners4plus");
      case "all":
      default:
        return t("burnersAll");
    }
  }

  // ========= FILTER: LOẠI THIẾT BỊ =========
  const TYPE_KEYS = ["all", "stove", "grill", "fryer", "chinese", "spare"];

  function getTypeLabel(key) {
    switch (key) {
      case "stove":
        return t("typeStove");
      case "grill":
        return t("typeGrill");
      case "fryer":
        return t("typeFryer");
      case "chinese":
        return t("typeChinese");
      case "spare":
        return t("typeSpare");
      case "all":
      default:
        return t("typeAll");
    }
  }

  // đọc loại thiết bị từ name / line1 / line2 / label
  function detectTypeGroup(p = {}) {
    const text = [p.name, p.line1, p.line2, p.label]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    // Deep fryer
    if (/fryer/.test(text)) return "fryer";

    // Chinese / Eurasia / wok
    if (/(cucina cinese|eurasia|wok)/.test(text)) return "chinese";

    // Grill / BBQ / skewer / teppanyaki / stone sausage
    if (/(grill|bbq|skewer|teppanyaki|stone sausage)/.test(text)) return "grill";

    // Phụ tùng / tile / burner head...
    if (/(burner tile|burner head|shield plate|spare part|tile)/.test(text))
      return "spare";

    // còn lại coi như bếp / wok
    return "stove";
  }

  // ========= FILTER: NGUỒN NHIỆT =========
  const POWER_KEYS = ["all", "gas", "electric", "combo"];

  function getPowerLabel(key) {
    switch (key) {
      case "gas":
        return t("powerGas");
      case "electric":
        return t("powerElectric");
      case "combo":
        return t("powerCombo");
      case "all":
      default:
        return t("powerAll");
    }
  }

  function detectPowerGroup(p = {}) {
    const text = [p.name, p.line1, p.line2, p.label]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const hasGas = /(gas|plynový|plynovy)/.test(text);
    const hasElec = /(electric|elektrick|induction|indukční)/.test(text);

    if (hasGas && hasElec) return "combo";
    if (hasGas) return "gas";
    if (hasElec) return "electric";

    return "all";
  }

  // ========= NEW: COOKING RANGE TYPE (Range / Induction / Range with oven) =========
  const RANGE_KIND_KEYS = ["all", "range", "induction", "range_oven"];

  function getRangeKindLabel(key) {
    switch (key) {
      case "range":
        return t("rangeRange");
      case "induction":
        return t("rangeInduction");
      case "range_oven":
        return t("rangeWithOven");
      case "all":
      default:
        return t("rangeAll");
    }
  }

  function detectRangeKind(p = {}) {
    const text = [p.name, p.line1, p.line2, p.label]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/induction/.test(text)) return "induction";
    if (/(range with oven|with oven)/.test(text)) return "range_oven";
    if (/range/.test(text)) return "range";

    return "all";
  }

  // ========= NEW: BASE TYPE (Base 700 / Base 900 / Drop-in...) =========
  const BASE_KEYS = ["all", "base700", "base700top", "base900", "dropin"];

  function getBaseLabel(key) {
    switch (key) {
      case "base700":
        return t("base700");
      case "base700top":
        return t("base700Top");
      case "base900":
        return t("base900");
      case "dropin":
        return t("baseDropIn");
      case "all":
      default:
        return t("baseAll");
    }
  }

  function detectBaseGroup(p = {}) {
    const text = [p.name, p.line1, p.line2, p.label]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/base 700 countertop/.test(text)) return "base700top";
    if (/base 900/.test(text)) return "base900";
    if (/drop[-\s]?in/.test(text)) return "dropin";
    if (/base 700/.test(text)) return "base700";

    return "all";
  }

  const SEE_ALL = LABELS.seeAll;

  // ========= STATE =========
  let allProducts = [];
  let filteredProducts = [];
  let currentPage = 1;
  let currentCategory = CAT_ALL_KEY;
  let currentBurners = "all";
  let currentType = "all";
  let currentPower = "all";
  let currentRangeKind = "all"; // NEW
  let currentBase = "all"; // NEW

  // đọc ?cat & ?page (cat = key)
  const qs = new URLSearchParams(location.search);
  const initCat = qs.get("cat");
  const initPage = parseInt(qs.get("page"), 10);
  if (initCat) currentCategory = initCat;
  if (!isNaN(initPage) && initPage >= 1) currentPage = initPage;

  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;

  // ========= UTIL: chuẩn hoá data =========
  const normalize = (p) => {
    const s = p?.specs || {};

    const width = s.width ?? s.larghezza ?? null;
    const height = s.height ?? s.altezza ?? null;
    const depth = s.depth ?? s["profondità"] ?? s.profondita ?? null;
    const weight = s.weight ?? s.peso ?? p.weight ?? null;
    const volume = s.volume ?? p.volume ?? null;

    const burners = s.burners ?? s.bruciatori ?? null;
    const burners_combination =
      s.burners_combination ?? s.combinazione_bruciatori ?? "";

    const dimStr =
      width || depth || height
        ? `Dimensioni (L×P×H): ${[width, depth, height]
          .filter(Boolean)
          .join(" x ")} mm`
        : "";

    const detailParts = [];
    if (weight != null) detailParts.push(`Peso: ${weight} kg`);
    if (volume != null) detailParts.push(`Volume: ${volume} m³`);
    if (burners != null) detailParts.push(`Bruciatori: ${burners}`);
    if (burners_combination)
      detailParts.push(`Combinazione bruciatori: ${burners_combination}`);
    const detailStr = detailParts.join(" • ");

    return {
      id: p?.code || p?.id || p?.name || "",
      sku: p?.code || p?.sku || "",
      name: p?.name || "",
      line1: p?.line1 || dimStr,
      line2: p?.line2 || detailStr,
      label: p?.label || "",
      price: p?.price === "" || p?.price == null ? null : Number(p.price),
      currency: (p?.currency || "").trim(),
      image: p?.image || p?.image_large || "img/placeholder.webp",
      href: p?.url || p?.href || "#",
      sp: p?.sp ?? null,
      specs: {
        width,
        depth,
        height,
        weight,
        volume,
        burners,
        burners_combination,
      },
    };
  };

  const specsHTML = (p) => {
    const s = p.specs || {};
    const rows = [];

    if (s.width || s.depth || s.height) {
      rows.push(
        `Dimensioni (L×P×H): ${[s.width, s.depth, s.height]
          .filter(Boolean)
          .join(" x ")} mm`
      );
    }
    if (s.weight != null) rows.push(`Peso: ${s.weight} kg`);
    if (s.volume != null) rows.push(`Volume: ${s.volume} m³`);
    if (s.burners != null) rows.push(`Bruciatori: ${s.burners}`);
    if (s.burners_combination)
      rows.push(`Combinazione bruciatori: ${s.burners_combination}`);

    if (!rows.length) return "";

    return `
    <ul class="list-unstyled mb-2 small text-muted">
      ${rows.map((r) => `<li>${r}</li>`).join("")}
    </ul>
  `;
  };

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

  function detectCategory(p = {}) {
    const text = [p.name, p.line1, p.line2, p.label]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    for (const rule of CATEGORY_RULES) {
      if (rule.test(text)) return rule.key;
    }
    return "other";
  }

  // đọc số hořák từ text (hořák / burner / bruciatori)
  function detectBurnerGroup(p = {}) {
    const text = [p.name, p.line1, p.line2, p.label]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/(^|\s)1\s*(hoř|horak|burner|bruciatori|fuochi)/.test(text)) return "1";
    if (/(^|\s)2\s*(hoř|horak|burner|bruciatori|fuochi)/.test(text)) return "2";
    if (/(^|\s)3\s*(hoř|horak|burner|bruciatori|fuochi)/.test(text)) return "3";
    if (
      /(4|5|6|7|8|9)\s*(hoř|horak|burner|bruciatori|fuochi)/.test(text) ||
      /(4\s*\+?\s*burners?)/.test(text)
    )
      return "4+";

    return "all";
  }

  // ========= RENDER CARD =========
  const cardHTML = (p) => {
    const priceText = fmtPrice(p.price, p.currency);
    const hasPrice = Number.isFinite(p.price) && Number(p.price) > 0;
    const msg = encodeURIComponent(buildInquiryMessage(p));

    return `
    <div class="col-md-6 col-lg-4 col-xl-3">
      <div class="rounded position-relative fruite-item h-100" data-id="${String(
      p.id
    ).replace(/"/g, "&quot;")}">
        <div class="fruite-img">
          <img src="${p.image}" class="img-fluid w-100 rounded-top border border-secondary" alt="${p.name}">
        </div>

        ${p.label
        ? `
        <div class="text-white bg-secondary px-3 py-1 rounded position-absolute"
             style="top:10px;left:10px;font-size:12px">${p.label}</div>`
        : ""
      }

        <div class="p-4 border border-secondary border-top-0 rounded-bottom d-flex flex-column">

          <h4 class="mb-1 line-clamp-2" title="${p.name}">${p.name}</h4>
          ${p.sku
        ? `<p class="mb-1 small text-secondary">Code: ${p.sku}</p>`
        : ""
      }

          ${specsHTML(p)}

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

  // ========= POPUP =========
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

    const s = p.specs || {};
    const rows = [];

    if (s.width || s.depth || s.height) {
      rows.push(
        `Dimensioni (L×P×H): ${[s.width, s.depth, s.height]
          .filter(Boolean)
          .join(" x ")} mm`
      );
    }
    if (s.weight != null) rows.push(`Peso: ${s.weight} kg`);
    if (s.volume != null) rows.push(`Volume: ${s.volume} m³`);
    if (s.burners != null) rows.push(`Bruciatori: ${s.burners}`);
    if (s.burners_combination)
      rows.push(`Combinazione bruciatori: ${s.burners_combination}`);

    const html = rows.length
      ? rows.map((r) => `<div>${r}</div>`).join("")
      : [p.line1, p.line2].filter(Boolean).join(" • ");

    popupDim.innerHTML = html;
    popupWeight.textContent = p.sku ? `Code: ${p.sku}` : "";

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

  // ========= ADD TO CART =========
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

  // ========= URL helper =========
  function updateURL() {
    const url = new URL(location.href);
    url.searchParams.set("page", String(currentPage));
    url.searchParams.set("cat", currentCategory);
    history.replaceState(null, "", url);
  }

  // ========= CATEGORY SIDEBAR =========
  function renderCategorySidebar() {
    const slot = document.querySelector(CATEGORY_SLOT);
    if (!slot) return;

    const counts = {};
    for (const p of allProducts) {
      const catKey = detectCategory(p);
      counts[catKey] = (counts[catKey] || 0) + 1;
    }
    const totalAll = allProducts.length;

    const orderedKeys = [CAT_ALL_KEY, ...CATEGORY_RULES.map((r) => r.key)];

    slot.innerHTML = orderedKeys
      .map((key) => {
        const isAll = key === CAT_ALL_KEY;
        const label = isAll ? t("all") : getCategoryLabel(key);
        const count = isAll ? totalAll : counts[key] || 0;
        const active = key === currentCategory ? "active" : "";

        return `
          <a href="#"
             class="mf-filter-row d-flex justify-content-between ${active}"
             data-cat="${key}">
            <span>${label}</span>
            <span class="count text-muted">(${count})</span>
          </a>
        `;
      })
      .join("");

    slot.querySelectorAll(".mf-filter-row").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const cat = a.getAttribute("data-cat") || CAT_ALL_KEY;
        currentCategory = cat;
        currentPage = 1;
        applyFilter();
        renderCategorySidebar();
        renderExtraFilters();
        renderProducts();
      });
    });
  }

  // ========= EXTRA FILTER: Burners + Type + Power + RangeKind + Base =========
  function renderExtraFilters() {
    const slot = document.querySelector(EXTRA_FILTER_SLOT);
    if (!slot) return;

    const burnerCounts = {};
    const typeCounts = {};
    const powerCounts = {};
    const rangeKindCounts = {};
    const baseCounts = {};

    for (const p of allProducts) {
      const b = detectBurnerGroup(p);
      burnerCounts[b] = (burnerCounts[b] || 0) + 1;

      const ty = detectTypeGroup(p);
      typeCounts[ty] = (typeCounts[ty] || 0) + 1;

      const pw = detectPowerGroup(p);
      powerCounts[pw] = (powerCounts[pw] || 0) + 1;

      const rk = detectRangeKind(p);
      rangeKindCounts[rk] = (rangeKindCounts[rk] || 0) + 1;

      const base = detectBaseGroup(p);
      baseCounts[base] = (baseCounts[base] || 0) + 1;
    }

    const totalAll = allProducts.length;

    let html = "";

    // 🔹 Nhóm COOKING RANGE TYPE (Range / Induction / Range with oven)
    html += `
      <div class="mb-2 fw-semibold text-uppercase" style="font-size: 0.85rem;">
        ${t("rangeKindTitle")}
      </div>
    `;

    html += RANGE_KIND_KEYS.map((k) => {
      const label = getRangeKindLabel(k);
      const count = k === "all" ? totalAll : rangeKindCounts[k] || 0;
      const active = k === currentRangeKind ? "active" : "";
      return `
        <a href="#"
           class="mf-filter-row d-flex justify-content-between ${active}"
           data-range-kind="${k}">
          <span>${label}</span>
          <span class="count text-muted">(${count})</span>
        </a>
      `;
    }).join("");

    html += `<hr class="my-3">`;

    // 🔹 Nhóm BASE (Base 700 / Base 900 / Drop-in...)
    html += `
      <div class="mb-2 fw-semibold text-uppercase" style="font-size: 0.85rem;">
        ${t("baseTitle")}
      </div>
    `;

    html += BASE_KEYS.map((k) => {
      const label = getBaseLabel(k);
      const count = k === "all" ? totalAll : baseCounts[k] || 0;
      const active = k === currentBase ? "active" : "";
      return `
        <a href="#"
           class="mf-filter-row d-flex justify-content-between ${active}"
           data-base="${k}">
          <span>${label}</span>
          <span class="count text-muted">(${count})</span>
        </a>
      `;
    }).join("");

    html += `<hr class="my-3">`;

    // 🔹 Nhóm BURNERS
    html += `
      <div class="mb-2 fw-semibold text-uppercase" style="font-size: 0.85rem;">
        ${t("burnersTitle")}
      </div>
    `;

    html += BURNER_KEYS.map((k) => {
      const label = getBurnerLabel(k);
      const count = k === "all" ? totalAll : burnerCounts[k] || 0;
      const active = k === currentBurners ? "active" : "";

      return `
        <a href="#"
           class="mf-filter-row d-flex justify-content-between ${active}"
           data-burners="${k}">
          <span>${label}</span>
          <span class="count text-muted">(${count})</span>
        </a>
      `;
    }).join("");

    html += `<hr class="my-3">`;

    // 🔹 Nhóm TYPE
    html += `
      <div class="mb-2 fw-semibold text-uppercase" style="font-size: 0.85rem;">
        ${t("typeTitle")}
      </div>
    `;

    html += TYPE_KEYS.map((k) => {
      const label = getTypeLabel(k);
      const count = k === "all" ? totalAll : typeCounts[k] || 0;
      const active = k === currentType ? "active" : "";

      return `
        <a href="#"
           class="mf-filter-row d-flex justify-content-between ${active}"
           data-type="${k}">
          <span>${label}</span>
          <span class="count text-muted">(${count})</span>
        </a>
      `;
    }).join("");

    html += `<hr class="my-3">`;

    // 🔹 Nhóm POWER
    html += `
      <div class="mb-2 fw-semibold text-uppercase" style="font-size: 0.85rem;">
        ${t("powerTitle")}
      </div>
    `;

    html += POWER_KEYS.map((k) => {
      const label = getPowerLabel(k);
      const count = k === "all" ? totalAll : powerCounts[k] || 0;
      const active = k === currentPower ? "active" : "";

      return `
        <a href="#"
           class="mf-filter-row d-flex justify-content-between ${active}"
           data-power="${k}">
          <span>${label}</span>
          <span class="count text-muted">(${count})</span>
        </a>
      `;
    }).join("");

    slot.innerHTML = html;

    // click – range kind
    slot.querySelectorAll("[data-range-kind]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const key = a.getAttribute("data-range-kind") || "all";
        currentRangeKind = key;
        currentPage = 1;
        applyFilter();
        renderExtraFilters();
        renderProducts();
      });
    });

    // click – base
    slot.querySelectorAll("[data-base]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const key = a.getAttribute("data-base") || "all";
        currentBase = key;
        currentPage = 1;
        applyFilter();
        renderExtraFilters();
        renderProducts();
      });
    });

    // click – burners
    slot.querySelectorAll("[data-burners]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const key = a.getAttribute("data-burners") || "all";
        currentBurners = key;
        currentPage = 1;
        applyFilter();
        renderExtraFilters();
        renderProducts();
      });
    });

    // click – type
    slot.querySelectorAll("[data-type]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const key = a.getAttribute("data-type") || "all";
        currentType = key;
        currentPage = 1;
        applyFilter();
        renderExtraFilters();
        renderProducts();
      });
    });

    // click – power source
    slot.querySelectorAll("[data-power]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const key = a.getAttribute("data-power") || "all";
        currentPower = key;
        currentPage = 1;
        applyFilter();
        renderExtraFilters();
        renderProducts();
      });
    });
  }

  // ========= PAGINATION =========
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
            : `<a href="#"
                    class="mf-pg-btn ${p === currentPage ? "is-active" : ""}"
                    data-page="${p}"
                    aria-label="Page ${p}">${p}</a>`
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
    filteredProducts = allProducts.filter((p) => {
      const catKey = detectCategory(p);
      const burnerKey = detectBurnerGroup(p);
      const typeKey = detectTypeGroup(p);
      const powerKey = detectPowerGroup(p);
      const rangeKindKey = detectRangeKind(p);
      const baseKey = detectBaseGroup(p);

      const okCat =
        currentCategory === CAT_ALL_KEY || catKey === currentCategory;
      const okBurner =
        currentBurners === "all" || burnerKey === currentBurners;
      const okType = currentType === "all" || typeKey === currentType;
      const okPower = currentPower === "all" || powerKey === currentPower;
      const okRangeKind =
        currentRangeKind === "all" || rangeKindKey === currentRangeKind;
      const okBase = currentBase === "all" || baseKey === currentBase;

      return okCat && okBurner && okType && okPower && okRangeKind && okBase;
    });
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

  // ========= LOAD JSON & INIT =========
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

    renderCategorySidebar();
    renderExtraFilters();
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
  }

  // ========= INQUIRY MODAL + EMAILJS (giữ nguyên) =========
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
})();
