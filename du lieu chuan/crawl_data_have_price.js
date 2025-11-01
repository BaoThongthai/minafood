(async () => {
  // ===== Helpers chung =====
  const absURL = (u) => new URL(u, location.origin).href;
  const q = (el, sel) => el.querySelector(sel);
  const tx = (el, sel) => (el.querySelector(sel)?.textContent || "").trim();
  const attr = (el, sel, name) => el.querySelector(sel)?.getAttribute(name) || "";

  const splitLines = (full) => {
    const s = (full || "").trim();
    if (!s) return { line1: "", line2: "" };
    const re = /(.*?)(?:\s+([A-Z]{1,4}[A-Z0-9\/\-]+(?:\s*\d+\/\d+)?))$/;
    const m = s.match(re);
    if (m && m[1].trim().length >= 4) return { line1: m[1].trim(), line2: m[2].trim() };
    return { line1: s, line2: "" };
  };

  // ===== Chuẩn hoá số: lấy dấu (.,) CUỐI CÙNG làm dấu thập phân =====
  const normalizeNumber = (raw) => {
    if (!raw) return null;
    const s = String(raw).replace(/\s+/g, "");
    const m = s.match(/[\d.,]+/);
    if (!m) return null;
    const n = m[0];
    const last = Math.max(n.lastIndexOf("."), n.lastIndexOf(","));
    if (last === -1) return parseFloat(n); // không có dấu nào
    const intPart  = n.slice(0, last).replace(/[.,]/g, ""); // bỏ mọi dấu trong phần nguyên
    const fracPart = n.slice(last + 1);
    const num = parseFloat(intPart + "." + fracPart);
    return Number.isFinite(num) ? num : null;
  };

  // ===== Phân tích giá từ text và từ thẻ itemprop =====
  const CURRENCY_MAP = { "€": "EUR", "$": "USD", "£": "GBP", "₫": "VND", "Kč": "CZK" };

  const parsePriceFromText = (raw) => {
    if (!raw) return { priceSrc: null, currency: "" };
    // bắt ký hiệu/đơn vị tiền
    const front = raw.match(/^\s*(€|\$|£|₫|Kč)/);
    const back  = raw.match(/(Kč|CZK|USD|EUR|GBP|VND)\s*$/i);
    let currency = "";
    if (front && front[1]) currency = CURRENCY_MAP[front[1]] || "";
    else if (back && back[1]) currency = (back[1].toUpperCase() === "KČ") ? "CZK" : back[1].toUpperCase();

    const num = normalizeNumber(raw);
    return { priceSrc: Number.isFinite(num) ? num : null, currency };
  };

  const extractPrice = (cell) => {
    // Ưu tiên dữ liệu có cấu trúc từ Odoo
    const pContent = attr(cell, '[itemprop="price"]', 'content');
    const pCurr    = attr(cell, '[itemprop="priceCurrency"]', 'content');
    if (pContent) {
      const num = parseFloat(pContent);
      const currency = (pCurr || "").toUpperCase() || "";
      return { priceSrc: Number.isFinite(num) ? num : null, currency };
    }
    // Fallback: các selector hay gặp
    const SELS = [
      '.oe_currency_value',
      '.o_wsale_products_item_price',
      '.o_wsale_product_price',
      '.product_price',
      '.o_wsale_price',
      '.o_price',
      '[itemprop="price"]',
    ];
    for (const sel of SELS) {
      const t = tx(cell, sel);
      if (/\d/.test(t)) return parsePriceFromText(t);
    }
    // Last resort: bất kỳ text nào nhìn giống giá
    const maybe = [...cell.querySelectorAll('*')]
      .map(el => el.textContent && el.textContent.trim())
      .filter(Boolean)
      .find(t => /[€$£₫]|Kč|CZK|USD|EUR|GBP|VND/.test(t) && /\d/.test(t));
    if (maybe) return parsePriceFromText(maybe);

    return { priceSrc: null, currency: "" };
  };

  // ===== Sinh URL trang /page/N =====
  const pageURL = (n) => {
    const u = new URL(location.href);
    if (/\/page\/\d+/.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\/page\/\d+/, `/page/${n}`);
    } else {
      u.pathname = u.pathname.replace(/\/?$/, '') + `/page/${n}`;
    }
    return u.toString();
  };

  // ===== Parse 1 trang =====
  const parsePage = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const cells = doc.querySelectorAll('td.oe_product .o_wsale_product_grid_wrapper, .o_wsale_product_grid_wrapper');
    return [...cells].map(cell => {
      const hrefRel = attr(cell, 'a.oe_product_image_link', 'href');
      const href = hrefRel ? absURL(hrefRel) : "";
      const imgEl = q(cell, '.oe_product_image img, .o_wsale_product_img img');
      const image = imgEl ? absURL(imgEl.getAttribute('src')) : "";
      const sku = attr(cell, '.o_wsale_products_item_title a.text-primary', 'content')
               || tx(cell, '.o_wsale_products_item_title a.text-primary');
      const name_full = attr(cell, '.o_wsale_products_item_title a.text-muted', 'content')
                     || tx(cell, '.o_wsale_products_item_title a.text-muted');
      const { line1, line2 } = splitLines(name_full);
      const label = [...cell.querySelectorAll('.o_ribbon, .o_ribbon_right')]
        .map(r => r.textContent.trim()).filter(Boolean).join(' · ');

      const { priceSrc, currency } = extractPrice(cell);
      // Giá đã nhân 25, làm tròn 2 chữ số
      const price = (priceSrc != null) ? Math.round(priceSrc * 25 * 100) / 100 : null;

      let id = "";
      try {
        const path = new URL(href, location.origin).pathname;
        const m = path.match(/\/shop\/(\d+)-/);
        id = m ? m[1] : sku || path.replace(/^\/+|\/+$/g, '');
      } catch { id = sku || ""; }

      return {
        id, sku,
        name: name_full,
        line1, line2,
        label,
        price,                // số đã nhân 25 (ví dụ 352.5)
        price_src: priceSrc,  // số gốc trên web (ví dụ 14.10)
        currency,             // đơn vị của giá gốc (EUR/CZK/...)
        image, href
      };
    }).filter(p => p.name);
  };

  // ===== Quét nhiều trang =====
  const TOTAL_PAGES = 9; // theo yêu cầu
  console.log(`🔎 Collecting ${TOTAL_PAGES} page(s)...`);

  const all = [];
  const seen = new Set();

  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const url = pageURL(p);
    console.log(`→ Fetching page ${p}/${TOTAL_PAGES}: ${url}`);
    const res = await fetch(url, { credentials: 'same-origin' });
    const html = await res.text();
    const items = parsePage(html);
    for (const it of items) {
      const key = it.id || it.href || (it.sku + it.name);
      if (!seen.has(key)) { seen.add(key); all.push(it); }
    }
    await new Promise(r => setTimeout(r, 150)); // dịu server
  }

  // Đánh số thứ tự
  all.forEach((p, i) => p.sp = i + 1);

  console.log(`✅ Total items: ${all.length}`);
  const json = JSON.stringify(all, null, 2);
  console.log(json);

  // ===== Copy/Download =====
  const download = (txt, name='products.json') => {
    const blob = new Blob([txt], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    console.log('⬇️ Downloaded', name);
  };

  try {
    if (typeof copy === 'function') { copy(json); console.log('📋 Copied via DevTools copy()'); }
    else if (navigator.clipboard && document.hasFocus()) {
      await navigator.clipboard.writeText(json);
      console.log('📋 Copied to clipboard');
    } else { download(json); }
  } catch { download(json); }
})();
