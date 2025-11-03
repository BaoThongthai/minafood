// js/fragment-loader.js
async function loadFragment(targetSelector, url) {
  try {
    const html = await fetch(url, { cache: "no-store" }).then(r => r.text());
    const root = document.querySelector(targetSelector);
    if (!root) return;
    root.innerHTML = html;

    // Bootstrap dropdown
    if (window.bootstrap) {
      root.querySelectorAll('[data-bs-toggle="dropdown"]')
        .forEach(el => new bootstrap.Dropdown(el));
    }

    // Helper: chuẩn hoá cat để so màu active (chỉ dùng trong loader)
    const normCat = (s='') => String(s)
      .replace(/\+/g, ' ')        // phòng link cũ dùng +
      .replace(/\s*&\s*/g, '&')   // chuẩn hoá khoảng trắng quanh &
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    // Đánh dấu active theo pathname
    const path = location.pathname.toLowerCase();
    root.querySelectorAll('.mf-link').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href || href === '#') return;
      const abs = new URL(href, location.origin).pathname.toLowerCase();
      if (path.endsWith(abs)) a.classList.add('text-primary');
    });

    // Gắn deep-link ?page=1&cat=... cho mọi item có data-cat
    root.querySelectorAll('.js-cat,[data-cat]').forEach(a => {
      const baseHref = a.getAttribute('href') || location.pathname;   // trang đích
      const cat = a.getAttribute('data-cat') || '';                   // tên category gốc (phải khớp RULES)
      const u = new URL(baseHref, location.origin);
      // set qua searchParams để URL encode đúng: space -> %20, & -> %26
      u.searchParams.set('page', '1');
      if (cat) u.searchParams.set('cat', cat);
      a.setAttribute('href', u.pathname + '?' + u.searchParams.toString());
    });

    // Tô active theo ?cat hiện tại (kể cả khi link cũ có "+")
    const currentCatRaw = new URLSearchParams(location.search).get('cat') || '';
    if (currentCatRaw) {
      root.querySelectorAll('.js-cat,[data-cat]').forEach(a => {
        const c = a.getAttribute('data-cat') || '';
        if (normCat(c) === normCat(currentCatRaw)) a.classList.add('active');
      });
    }

    // SPA: chỉ chặn click khi link trỏ tới chính trang hiện tại và có grid
    root.addEventListener('click', (e) => {
      const a = e.target.closest('.js-cat,[data-cat]');
      if (!a) return;

      const hrefAttr = a.getAttribute('href') || '';
      const cat = a.getAttribute('data-cat') || new URL(hrefAttr, location.origin).searchParams.get('cat') || '';

      const targetURL = new URL(hrefAttr, location.origin);
      const samePage  = targetURL.pathname === location.pathname;
      const hasGrid   = !!document.querySelector('#product-grid');

      if (samePage && hasGrid) {
        // Không điều hướng: chạy SPA
        e.preventDefault();

        // bắn event cho products_filter_paged.js (cat giữ nguyên gốc để khớp CATEGORY_RULES)
        document.dispatchEvent(new CustomEvent('mina:menuCategory', { detail: { cat } }));

        // đồng bộ URL (encode chuẩn)
        const u = new URL(location.href);
        u.searchParams.set('page', '1');
        if (cat) u.searchParams.set('cat', cat);
        history.replaceState(null, '', u.toString());
      }
      // khác trang: để trình duyệt điều hướng, vì href đã encode đúng (%20, %26)
    });
  } catch (e) {
    console.error('Load fragment failed', e);
  }
}
