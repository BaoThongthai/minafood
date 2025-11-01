(async () => {
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
  const pageURL = (n) => {
    const u = new URL(location.href);
    if (/\/page\/\d+/.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\/page\/\d+/, `/page/${n}`);
    } else {
      u.pathname = u.pathname.replace(/\/?$/, '') + `/page/${n}`;
    }
    return u.toString();
  };
  const parsePage = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const cells = doc.querySelectorAll('td.oe_product .o_wsale_product_grid_wrapper');
    return [...cells].map(cell => {
      const hrefRel = attr(cell, 'a.oe_product_image_link', 'href');
      const href = hrefRel ? absURL(hrefRel) : "";
      const imgEl = q(cell, '.oe_product_image img');
      const image = imgEl ? absURL(imgEl.getAttribute('src')) : "";
      const sku = attr(cell, '.o_wsale_products_item_title a.text-primary', 'content')
               || tx(cell, '.o_wsale_products_item_title a.text-primary');
      const name_full = attr(cell, '.o_wsale_products_item_title a.text-muted', 'content')
                     || tx(cell, '.o_wsale_products_item_title a.text-muted');
      const { line1, line2 } = splitLines(name_full);
      const label = [...cell.querySelectorAll('.o_ribbon, .o_ribbon_right')]
        .map(r => r.textContent.trim()).filter(Boolean).join(' · ');
      let id = "";
      try {
        const path = new URL(href, location.origin).pathname;
        const m = path.match(/\/shop\/(\d+)-/);
        id = m ? m[1] : sku || path.replace(/^\/+|\/+$/g, '');
      } catch { id = sku || ""; }
      return { id, sku, name: name_full, line1, line2, label, price: "", currency: "", image, href };
    }).filter(p => p.name);
  };

  // ---------- QUÉT 70 TRANG CỐ ĐỊNH ----------
  const TOTAL_PAGES = 70;
  console.log(`🔎 Collecting ${TOTAL_PAGES} page(s)...`);
  // ------------------------------------------

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
    await new Promise(r => setTimeout(r, 150));
  }

  // giữ nguyên: thêm số thứ tự sp
  all.forEach((p, i) => p.sp = i + 1);

  console.log(`✅ Total items: ${all.length}`);
  const json = JSON.stringify(all, null, 2);
  console.log(json);

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
