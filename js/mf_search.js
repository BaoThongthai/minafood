/* =======================
   MinaFood – Global Search
   File: /js/mf_search.js
   ======================= */

(() => {
  // ==== CẤU HÌNH NGUỒN DỮ LIỆU (đúng theo tên file bạn đang dùng) ====
  const SOURCES = [
    { json: '/js/data/cnboriental_tableware.json',   page: '/cnboriental_tableware.html',    cat: 'TABLEWARE' },
    { json: '/js/data/cnboriental_kitchenware.json', page: '/cnboriental_kitchenware.html',  cat: 'KITCHENWARE' },
    { json: '/js/data/cnboriental_sushi&ramen.json', page: '/cnboriental_sushi&ramen.html',  cat: 'SUSHI & RAMEN' },
    { json: '/js/data/cnboriental_chopsticks.json',  page: '/cnboriental_chopsticks.html',   cat: 'CHOPSTICKS' },
    // Lưu ý: file data của bạn là "tea&coffe.json" (thiếu chữ 'e' cuối) → giữ nguyên để tránh 404:
    { json: '/js/data/cnboriental_tea&coffee.json',   page: '/cnboriental_tea&coffee.html',   cat: 'TEA & COFFEE' },
    { json: '/js/data/cnboriental_giftsets.json',    page: '/cnboriental_gift.html',         cat: 'GIFTSETS' },
    { json: '/js/data/cnboriental_grilling.json',    page: '/cnboriental_grilling.html',     cat: 'GRILLING' },
    // File data là "decoration.json" nhưng page là "decorations.html"
    { json: '/js/data/cnboriental_decorations.json',  page: '/cnboriental_decorations.html',  cat: 'DECORATIONS' },
    { json: '/js/data/cnboriental_healthcare.json',  page: '/cnboriental_healthcare.html',   cat: 'HEALTHCARE' },
    {json: '/js/data/decoration_1.json',  page: '/decoration.html',   cat: ''},
    {json: '/js/data/gline.json',  page: '/gas_g-line.html',   cat: 'G-line'},
    {json: '/js/data/ice_machine/ice_trays.json', page: '/ice_trays.html'},
    {json: '/js/casta_equiment/data/frytezy_lady900_1.json'},
  ];

  // ==== PHẦN TỬ FORM TRONG HEADER (nếu trang hiện tại có include topmenu) ====
  const FORM    = document.querySelector('#mf-search-form');
  const INPUT   = document.querySelector('#mf-search-input');
  const SUGGEST = document.querySelector('#mf-search-suggest');

  // ==== UTIL ====
  const deaccent = (s='') =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’“”]/g,'"');

  const fetchNoStore = (url) => fetch(url, { cache: 'no-store' }).then(r => r.json());

  const esc = (s) =>
    String(s || '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

  const scoreItem = (q, norm) => {
    // q & norm đều đã lowercase + deaccent
    let sc = 0;
    if (norm.includes(q)) sc += 10;
    if (norm.startsWith(q)) sc += 5;
    const toks = q.split(/\s+/).filter(Boolean);
    toks.forEach(t => { if (norm.includes(t)) sc += 2; });
    return sc;
  };

  // ==== BUILD INDEX & CACHE ====
  const STORAGE_KEY = 'mf_search_index_v1';
  const TTL_MS = 1000 * 60 * 30; // 30 phút

  async function loadIndex() {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (cached && (Date.now() - cached.ts) < TTL_MS) return cached.items;

      const all = [];
      for (const s of SOURCES) {
        try {
          const data = await fetchNoStore(s.json);
          (data || []).forEach(p => {
            const name = (p.name || '').trim();
            const sku  = (p.sku || p.code || p.model || p.id || '').toString();
            const url  = p.url || p.link || p.href || s.page; // fallback về trang category
            all.push({
              name,
              sku,
              price: p.price,
              currency: p.currency,
              image: p.image || p.img || '',
              page: s.page,
              cat: s.cat,
              url,
              _norm: deaccent(`${name} ${sku} ${s.cat} ${url}`).toLowerCase()
            });
          });
        } catch (e) {
          // nguồn lỗi → bỏ qua để không chặn index toàn site
          // console.warn('Search source failed:', s.json, e);
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), items: all }));
      return all;
    } catch (e) {
      return [];
    }
  }

  // Cho /search.html có thể gọi nếu cần:
  window.mfSearch = window.mfSearch || {};
  window.mfSearch.loadIndex = loadIndex;

  // ==== GỢI Ý NHANH Ở HEADER ====
  function renderSuggest(items, qRaw) {
    if (!SUGGEST) return;
    if (!qRaw || !items.length) { SUGGEST.hidden = true; return; }

    const hi = (txt) => {
      try {
        const re = new RegExp('(' + qRaw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')','ig');
        return esc(txt).replace(re, '<mark>$1</mark>');
      } catch {
        return esc(txt);
      }
    };

    SUGGEST.innerHTML = items.slice(0, 8).map(it => `
      <a class="mf-s-item" href="/search.html?q=${encodeURIComponent(qRaw)}#${encodeURIComponent(it.name)}">
        <img loading="lazy" src="${esc(it.image || '/img/placeholder.webp')}" alt="">
        <div class="mf-s-text">
          <div class="mf-s-name">${hi(it.name)}</div>
          <div class="mf-s-meta">${esc(it.cat)}${it.sku ? ' • ' + esc(it.sku) : ''}</div>
        </div>
      </a>
    `).join('');
    SUGGEST.hidden = false;
  }

  let INDEX = null;
  let LOADING = false;
  let debounceTimer = null;

  async function doSuggest(qRaw) {
    if (!INPUT || !SUGGEST) return;
    const q = deaccent((qRaw || '').trim()).toLowerCase();
    if (!q) { SUGGEST.hidden = true; return; }
    if (!INDEX && !LOADING) { LOADING = true; INDEX = await loadIndex(); LOADING = false; }
    if (!INDEX) return;

    const ranked = INDEX
      .map(it => ({ it, sc: scoreItem(q, it._norm) }))
      .filter(x => x.sc > 0)
      .sort((a,b) => b.sc - a.sc)
      .map(x => x.it);

    renderSuggest(ranked, qRaw);
  }

  // ==== EVENT CHO FORM Ở HEADER ====
  if (INPUT && FORM) {
    INPUT.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => doSuggest(e.target.value), 180);
    });
    INPUT.addEventListener('focus', () => { if (INPUT.value) doSuggest(INPUT.value); });
    document.addEventListener('click', (e) => {
      if (!FORM.contains(e.target)) SUGGEST && (SUGGEST.hidden = true);
    });

    // Ngăn submit rỗng
    FORM.addEventListener('submit', (e) => {
      if (!INPUT.value.trim()) { e.preventDefault(); SUGGEST && (SUGGEST.hidden = true); }
    });
  }

  // ==== HỖ TRỢ /search.html HIỂN THỊ KẾT QUẢ (nếu trang đó đã include file này) ====
  // Trang /search.html chỉ cần có #mf-grid, #mf-count, và đọc ?q=
  async function bootstrapSearchPageIfNeeded() {
    const grid = document.querySelector('#mf-grid');
    const count= document.querySelector('#mf-count');
    if (!grid || !count) return; // không phải trang search.html

    const params = new URLSearchParams(location.search);
    const qRaw = params.get('q') || '';
    if (INPUT) INPUT.value = qRaw;

    const q = deaccent(qRaw.trim()).toLowerCase();
    const data = await loadIndex();

    const ranked = data
      .map(it => ({ it, sc: scoreItem(q, it._norm) }))
      .filter(x => x.sc > 0)
      .sort((a,b)=> b.sc - a.sc)
      .map(x => x.it);

    if (!ranked.length) {
      count.textContent = '0 kết quả';
      grid.innerHTML = '<div class="mf-empty">Không tìm thấy sản phẩm phù hợp.</div>';
      return;
    }

    count.textContent = `${ranked.length} kết quả cho “${qRaw}”`;

    grid.innerHTML = ranked.map(p => `
      <div class="mf-card" id="${encodeURIComponent(p.name)}" style="border:1px solid #e5e7eb;border-radius:12px;padding:12px">
        <img loading="lazy" src="${esc(p.image || '/img/placeholder.webp')}" alt=""
             style="width:100%;height:180px;object-fit:cover;border-radius:8px;background:#fafafa;border:1px solid #eee">
        <h3 style="font-size:1rem;margin:.55rem 0 .25rem">${esc(p.name)}</h3>
        <div class="meta" style="font-size:.85rem;color:#6b7280">${esc(p.cat)}${p.sku?(' • '+esc(p.sku)) : ''}</div>
        ${p.price!=null ? `<div class="price" style="font-weight:700;margin-top:.35rem">${p.price} ${p.currency||''}</div>` : ''}
        <a class="mf-btn" href="${esc(p.url || p.page)}" style="display:inline-block;margin-top:.5rem">Add to Cart</a>
      </div>
    `).join('');
  }

  // Tự kích hoạt nếu đang ở /search.html
  bootstrapSearchPageIfNeeded();
})();
