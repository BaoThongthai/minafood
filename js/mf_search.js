/* =======================
   MinaFood – Global Search
   File: /js/mf_search.js
   ======================= */
(function () {
  // khóa đánh dấu đã fix 1 lần
  const FIX_KEY = 'mf_first_search_fix_v1';

  const url = new URL(location.href);
  const hasPage = url.searchParams.has('page');

  // Nếu chưa có ?page và chưa từng fix → thêm page=1, replace để không tạo history
  if (!hasPage && !localStorage.getItem(FIX_KEY)) {
    url.searchParams.set('page', '1');
    localStorage.setItem(FIX_KEY, Date.now().toString());
    location.replace(url.toString());
  }
})();
(() => {
  // ==== CẤU HÌNH NGUỒN DỮ LIỆU (đúng theo tên file bạn đang dùng) ====
  const SOURCES = [
    { json: '/js/data/cnboriental_tableware.json', page: '/cnboriental_tableware.html', cat: 'TABLEWARE' },
    { json: '/js/data/cnboriental_kitchenware.json', page: '/cnboriental_kitchenware.html', cat: 'KITCHENWARE' },
    { json: '/js/data/cnboriental_sushi&ramen.json', page: '/cnboriental_sushi&ramen.html', cat: 'SUSHI & RAMEN' },
    { json: '/js/data/cnboriental_chopsticks.json', page: '/cnboriental_chopsticks.html', cat: 'CHOPSTICKS' },
    { json: '/js/data/cnboriental_giftsets.json', page: '/cnboriental_gift.html', cat: 'GIFTSETS' },
    { json: '/js/data/cnboriental_grilling.json', page: '/cnboriental_grilling.html', cat: 'GRILLING' },
    { json: '/js/data/cnboriental_decoration.json', page: '/cnboriental_decorations.html', cat: 'DECORATIONS' },
    { json: '/js/data/cnboriental_healthcare.json', page: '/cnboriental_healthcare.html', cat: 'HEALTHCARE' },
    { json: '/js/data/cnboriental_tea&coffee.json', page: '/cnboriental_tea&coffee.html', cat: 'TEA & COFFEE' },
    { json: '/js/data/chladici_pos.json', page: '/chladici_pos.html', cat: 'CHLADICI POS' },
    { json: '/js/data/chladici.json', page: '/chladici.html', cat: 'CHLADICI' },
    { json: '/js/data/gas_svarec.json', page: '/gas_svarec.html', cat: 'GAS SVAREC' },
    { json: '/js/data/gline.json', page: '/gline.html', cat: 'GLINE' },
    { json: '/js/data/komory.json', page: '/komory.html', cat: 'KOMORY' },
    { json: '/js/data/nerezove_chladici.json', page: '/nerezove_chladici.html', cat: 'NEREZOVE CHLADICI' },
    { json: '/js/data/nerezove_mrazici.json', page: '/nerezove_mrazici.html', cat: 'NEREZOVE MRAZICI' },
    { json: '/js/data/porcelain_1.json', page: '/porcelain_1.html', cat: 'PORCELAIN' },
    { json: '/js/data/products_cooling_and_freezing_tables.json', page: '/products_cooling_and_freezing_tables.html', cat: 'COOLING & FREEZING TABLES' },
    { json: '/js/data/saladatey.json', page: '/saladatey.html', cat: 'SALADATEY' },
    { json: '/js/data/sushi.json', page: '/sushi.html', cat: 'SUSHI' },
    { json: '/js/data/table_accessories.json', page: '/table_accessories.html', cat: 'TABLE ACCESSORIES' },
    { json: '/js/data/gas_konvektonmaty.json', page: '/gas_konvektonmaty.html', cat: 'GAS KONVEKTONMATY' },
    { json: '/js/data/decoration_1.json', page: '/decoration_1.html', cat: 'DECORATION 1' },
    { json: '/js/data/decoration_2.json', page: '/decoration_2.html', cat: 'DECORATION 2' },
    { json: '/js/data/decoration_3.json', page: '/decoration_3.html', cat: 'DECORATION 3' },
    { json: '/js/data/decoration_4.json', page: '/decoration_4.html', cat: 'DECORATION 4' },
    /* ===== ICE MACHINE ===== */
    { json: '/js/data/ice_machine/Chladnicky.json', page: '/Chladnicky.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_21x21x14_6G.json', page: '/ice_21x21x14_6G.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_25x25x23_13G.json', page: '/ice_25x25x23_13G.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_filtracia.json', page: '/ice_filtracia.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_nahradne_28x28x23_17.json', page: '/ice_nahradne_28x28x23_17.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_nahradne_28x28x23_23G.json', page: '/ice_nahradne_28x28x23_23G.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_nahradne_32x32x32_31G.json', page: '/ice_nahradne_32x32x32_31G.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_nahradne_gule_45G.json', page: '/ice_nahradne_gule_45G.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_nahradne_vlocky_70.json', page: '/ice_nahradne_vlocky_70.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_nahradne_xxl_kocky_48x48x58_120G.json', page: '/ice_nahradne_xxl_kocky_48x48x58_120G.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_nahradne_xxl_kocky_58x103x48_240G.json', page: '/ice_nahradne_xxl_kocky_58x103x48_240G.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_trays.json', page: '/ice_trays.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/ice_vycpane.json', page: '/ice_vycpane.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icebuckets_1.json', page: '/icebuckets_1.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icebuckets_2.json', page: '/icebuckets_2.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_6g.json', page: '/icemaker_6g.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_13g.json', page: '/icemaker_13g.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_17g.json', page: '/icemaker_17g.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_17g_2.json', page: '/icemaker_17g_2.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_19g.json', page: '/icemaker_19g.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_23g.json', page: '/icemaker_23g.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_23g_2.json', page: '/icemaker_23g_2.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_23g_3.json', page: '/icemaker_23g_3.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_23g_4.json', page: '/icemaker_23g_4.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_31g.json', page: '/icemaker_31g.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_davkovace_ladu.json', page: '/icemaker_davkovace_ladu.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_polmesiacovy.json', page: '/icemaker_polmesiacovy.html', cat: 'ICE MACHINE' },
    { json: '/js/data/ice_machine/icemaker_special.json', page: '/icemaker_special.html', cat: 'ICE MACHINE' },
    /* ===== FRYTEZY SERIES ===== */
    { json: '/js/casta_equiment/data/frytezy_Easy700_2.json', page: '/frytezy_Easy700_2.html', cat: 'FRYTEZY EASY700' },
    { json: '/js/casta_equiment/data/frytezy_Easy700_4.json', page: '/frytezy_Easy700_4.html', cat: 'FRYTEZY EASY700' },
    { json: '/js/casta_equiment/data/frytezy_Easy700_6.json', page: '/frytezy_Easy700_6.html', cat: 'FRYTEZY EASY700' },
    { json: '/js/casta_equiment/data/frytezy_Easy700_7.json', page: '/frytezy_Easy700_7.html', cat: 'FRYTEZY EASY700' },
    { json: '/js/casta_equiment/data/frytezy_Easy700_8.json', page: '/frytezy_Easy700_8.html', cat: 'FRYTEZY EASY700' },
    { json: '/js/casta_equiment/data/frytezy_Easy700_9.json', page: '/frytezy_Easy700_9.html', cat: 'FRYTEZY EASY700' },
    { json: '/js/casta_equiment/data/frytezy_Easy700.json', page: '/frytezy_Easy700.html', cat: 'FRYTEZY EASY700' },
    { json: '/js/casta_equiment/data/frytezy_fast700.json', page: '/frytezy_fast700.html', cat: 'FRYTEZY FAST700' },
    { json: '/js/casta_equiment/data/frytezy_Lady900_1.json', page: '/frytezy_Lady900_1.html', cat: 'FRYTEZY LADY900' },
    { json: '/js/casta_equiment/data/frytezy_Lady900_2.json', page: '/frytezy_Lady900_2.html', cat: 'FRYTEZY LADY900' },
    { json: '/js/casta_equiment/data/frytezy_Lady900_3.json', page: '/frytezy_Lady900_3.html', cat: 'FRYTEZY LADY900' },
    { json: '/js/casta_equiment/data/frytezy_Lady900_4.json', page: '/frytezy_Lady900_4.html', cat: 'FRYTEZY LADY900' },
    { json: '/js/casta_equiment/data/frytezy_Lady900_5.json', page: '/frytezy_Lady900_5.html', cat: 'FRYTEZY LADY900' },
    { json: '/js/casta_equiment/data/frytezy_Lady900_6.json', page: '/frytezy_Lady900_6.html', cat: 'FRYTEZY LADY900' },
    { json: '/js/casta_equiment/data/frytezy_Lady900_7.json', page: '/frytezy_Lady900_7.html', cat: 'FRYTEZY LADY900' },
    { json: '/js/casta_equiment/data/frytezy_Lady900_8.json', page: '/frytezy_Lady900_8.html', cat: 'FRYTEZY LADY900' },
    { json: '/js/casta_equiment/data/frytezy_Lady900_9.json', page: '/frytezy_Lady900_9.html', cat: 'FRYTEZY LADY900' },
    { json: '/js/casta_equiment/data/frytezy_Lady900_10.json', page: '/frytezy_Lady900_10.html', cat: 'FRYTEZY LADY900' },
    { json: '/js/casta_equiment/data/frytezy_Lady900_11.json', page: '/frytezy_Lady900_11.html', cat: 'FRYTEZY LADY900' },
    { json: '/js/casta_equiment/data/frytezy_PastryFryers.json', page: '/frytezy_PastryFryers.html', cat: 'FRYTEZY PASTRYFRYERS' },
    { json: '/js/casta_equiment/data/frytezy_prime700.json', page: '/frytezy_prime700.html', cat: 'FRYTEZY PRIME700' },
    { json: '/js/casta_equiment/data/frytezy_Smart700.json', page: '/frytezy_Smart700.html', cat: 'FRYTEZY SMART700' },
    { json: '/js/casta_equiment/data/grill_plate.json', page: '/grill_plate.html', cat: 'GRILL PLATE' },

    /* ===== MAYTHAITHIT ===== */
    { json: '/js/data/maythucphamth_mayxaythit.json', page: '/maythucphamth_mayxaythit.html', cat: 'MAYTHAITHIT' },
    { json: '/js/data/maythucphamth_lovitquay.json', page: '/maythucphamth_maylovaithit.html', cat: 'MAYTHAITHIT' },
    { json: '/js/data/maythucphamth_maycuaxuong.json', page: '/maythucphamth_maycuaxuong.html', cat: 'MAYTHAITHIT' },
    { json: '/js/data/maythucphamth_maythairau.json', page: '/maythucphamth_maythairau.html', cat: 'MAYTHAITHIT' },
    { json: '/js/data/maythucphamth_pho.json', page: '/maythucphamth_pho.html', cat: 'MAYTHAITHIT' },
    { json: '/js/data/maythucphamth_maythaithit.json', page: '/maythucphamth_maythaithit.html', cat: 'MAYTHAITHIT' },

  ];

  // ==== PHẦN TỬ FORM TRONG HEADER (nếu trang hiện tại có include topmenu) ====
  const FORM = document.querySelector('#mf-search-form');
  const INPUT = document.querySelector('#mf-search-input');
  const SUGGEST = document.querySelector('#mf-search-suggest');

  // ==== UTIL ====
  const deaccent = (s = '') =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’“”]/g, '"');

  const fetchNoStore = (url) => fetch(url, { cache: 'no-store' }).then(r => r.json());

  const esc = (s) =>
    String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

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
            const sku = (p.sku || p.code || p.model || p.id || '').toString();
            const url = p.url || p.link || p.href || s.page; // fallback về trang category
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
        const re = new RegExp('(' + qRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
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
      .sort((a, b) => b.sc - a.sc)
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


  // 

  // ==== HỖ TRỢ /search.html HIỂN THỊ KẾT QUẢ (nếu trang đó đã include file này) ====
  // Trang /search.html chỉ cần có #mf-grid, #mf-count, và đọc ?q=
  async function bootstrapSearchPageIfNeeded() {
    const grid = document.querySelector('#mf-grid');
    const count = document.querySelector('#mf-count');
    const loadingEl = document.querySelector('#mf-loading');
    const emptyEl = document.querySelector('#mf-empty');

    function showLoading() {
      if (loadingEl) loadingEl.hidden = false;
      if (emptyEl) emptyEl.hidden = true;  // ⬅️ ép ẩn empty khi bắt đầu
      if (grid) grid.innerHTML = '';
      if (count) count.textContent = '';
    }
    function hideLoading() {
      if (loadingEl) loadingEl.hidden = true;
    }

    if (!grid || !count) return; // không phải trang search.html

    const params = new URLSearchParams(location.search);
    const qRaw = params.get('q') || '';
    if (INPUT) INPUT.value = qRaw;

    const q = deaccent(qRaw.trim()).toLowerCase();
    showLoading();
    const data = await loadIndex();

    const ranked = data
      .map(it => ({ it, sc: scoreItem(q, it._norm) }))
      .filter(x => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .map(x => x.it);

    if (!ranked.length) {
      hideLoading();
      if (count) count.textContent = '0 Product';
      if (emptyEl) emptyEl.hidden = false;   // ⬅️ chỉ bây giờ mới hiện empty
      return;
    }

    count.textContent = `${ranked.length} Search results for “${qRaw}”`;

    grid.innerHTML = ranked.map(p => `
      <div class="mf-card" id="${encodeURIComponent(p.name)}" data-sku="${esc(p.sku || '')}"
       data-name="${esc(p.name || '')}" style="border:1px solid #e5e7eb;border-radius:12px;padding:12px">
        <img loading="lazy" src="${esc(p.image || '/img/placeholder.webp')}" alt=""
             style="width:100%;height:180px;object-fit:cover;border-radius:8px;background:#fafafa;border:1px solid #eee">
        <h3 style="font-size:1rem;margin:.55rem 0 .25rem">${esc(p.name)}</h3>
        <div class="meta" style="font-size:.85rem;color:#6b7280">${esc(p.cat)}${p.sku ? (' • ' + esc(p.sku)) : ''}</div>
        ${p.price != null ? `<div class="price" style="font-weight:700;margin-top:.35rem">${p.price} ${p.currency || ''}</div>` : ''}
        <a class="mf-btn" href="${esc(p.url || p.page)}" style="display:inline-block;margin-top:.5rem">Add to Cart</a>
      </div>
    `).join('');
    hideLoading(); // ⬅️ tắt loading
    window._mf_markProductsRendered && window._mf_markProductsRendered();

  }

  /* ========= First-time JSON 404 guard (reload once after first render) ========= */
  (function () {
    const FLAG = 'mf_search_reload_after_render_v1';
    let hasJson404 = false;

    // Bọc fetch để phát hiện 404 cho các JSON trong /js/data/
    const _fetch = window.fetch;
    window.fetch = async function (...args) {
      try {
        const res = await _fetch.apply(this, args);
        const reqUrl = (args && args[0] && (args[0].url || args[0])) || '';
        if (typeof reqUrl === 'string' &&
          /\/js\/.+\.json(\?|$)/i.test(reqUrl) &&
          res && res.status === 404) {
          hasJson404 = true;
        }
        return res;
      } catch (err) {
        const reqUrl = (args && args[0] && (args[0].url || args[0])) || '';
        if (typeof reqUrl === 'string' && /\/js\/.+\.json(\?|$)/i.test(reqUrl)) {
          hasJson404 = true;
        }
        throw err;
      }
    };

    // Hàm bạn sẽ gọi SAU KHI đã render xong các thẻ sản phẩm
    window._mf_markProductsRendered = function () {
      if (!hasJson404) return;                    // không có 404 → thôi
      if (localStorage.getItem(FLAG)) return;     // đã reload 1 lần trước đó → thôi

      localStorage.setItem(FLAG, '1');

      // Đảm bảo có page=1 để tránh lỗi lần đầu thiếu tham số
      const url = new URL(location.href);
      if (!url.searchParams.get('page')) url.searchParams.set('page', '1');

      // Reload nhanh, replace để không thêm history
      location.replace(url.toString());
    };
  })();


  // Tự kích hoạt nếu đang ở /search.html
  bootstrapSearchPageIfNeeded();
})();
