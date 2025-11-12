
(async () => {
    const params = new URLSearchParams(location.search);
    const qRaw = params.get('q') || '';
    const $ = (s, r = document) => r.querySelector(s);

    // ====== Config phân trang ======
    const PAGE_SIZE = 30;            // đổi nếu muốn
    let currentPage = Math.max(1, parseInt(params.get('page') || '1', 10));

    // điền lại ô search (nếu có)
    const input = $('#mf-search-input');
    if (input) input.value = qRaw;

    // ===== Utilities =====
    const deaccent = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const attrSafe = (s = '') => String(s).replace(/"/g, '&quot;');
    const fmtPrice = (price, currency) => {
        if (price == null || price === '' || isNaN(Number(price))) return '';
        const formatted = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            .format(Number(price));
        return `${formatted} ${currency ? currency : 'Kč bez DPH'}`;
    };
    const hasPrice = (p) => {
        const n = Number(p?.price);
        return Number.isFinite(n) && n > 0;
    };
    const buildInquiryMessage = (p) => {
        const lines = [
            'Hello, I want to ask about the product :',
            `• Product name: ${p.name || ''}`,
        ];
        if (p.sku) lines.push(`• SKU : ${p.sku}`);
        if (p.cat) lines.push(`• Category : ${p.cat}`);
        if (p.dimensions) lines.push(`• Size : ${p.dimensions}`);
        if (p.weight) lines.push(`• Weight: ${p.weight} kg`);
        lines.push(`• Source : ${location.origin + (p.page || p.url || location.pathname)}`);
        return lines.join('\n');
    };
    const updateURL = () => {
        const url = new URL(location.href);
        url.searchParams.set('q', qRaw);
        url.searchParams.set('page', String(currentPage));
        history.replaceState(null, '', url);
    };
    const scrollToTop = () => {
        const header = document.querySelector('.fixed-top');
        const offset = header ? header.offsetHeight + 12 : 0;
        const y = document.querySelector('.mf-results')?.getBoundingClientRect().top ?? 0;
        window.scrollTo({ top: window.pageYOffset + y - offset, behavior: 'smooth' });
    };

    // ===== Lấy index từ mf_search.js (localStorage) =====
    async function pullIndex() {
        try {
            const cache = JSON.parse(localStorage.getItem('mf_search_index_v1') || 'null');
            if (cache && cache.items) return cache.items;
        } catch { }

        // nếu mf_search.js đã được load thì gọi thẳng hàm build index của nó
        if (window.mfSearch?.loadIndex) {
            return await window.mfSearch.loadIndex();
        }

        // fallback (chỉ nếu bạn THỰC SỰ không include sẵn mf_search.js):
        await new Promise(res => {
            const s = document.createElement('script');
            s.src = '/js/mf_search.js'; s.defer = true; s.onload = res;
            document.head.appendChild(s);
        });
        return (await window.mfSearch.loadIndex()) || [];
    }


    // ===== Mini Cart =====
    const CART_KEY = 'mina_cart';
    function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return [] } }
    function writeCart(list) { localStorage.setItem(CART_KEY, JSON.stringify(list)); }
    function addToCart(item) {
        const cart = readCart();
        const idx = cart.findIndex(x => String(x.id) === String(item.id));
        if (idx >= 0) { cart[idx].qty = (cart[idx].qty || 0) + (item.qty || 1); }
        else cart.push({ ...item, qty: item.qty || 1 });
        writeCart(cart);
        updateCartBadge();
        try { document.dispatchEvent(new CustomEvent('cart:add', { detail: item })); } catch { }
    }
    function cartCount() { return readCart().reduce((s, it) => s + (Number(it.qty) || 0), 0); }
    function updateCartBadge() {
        const badge = document.querySelector('a[href="cart.html"] span.position-absolute');
        if (badge) badge.textContent = String(cartCount());
    }
    updateCartBadge();

    // ===== Rank & render (thêm phân trang) =====
    const q = deaccent(qRaw.trim());
    const data = await pullIndex();

    const ranked = data
        .map(it => ({
            it,
            sc: (it._norm?.includes?.(q) ? 10 : 0)
                + (it._norm?.startsWith?.(q) ? 5 : 0)
                + q.split(/\s+/).filter(Boolean).reduce((a, t) => a + (it._norm?.includes?.(t) ? 2 : 0), 0)
        }))
        .filter(x => x.sc > 0)
        .sort((a, b) => b.sc - a.sc)
        .map(x => x.it);

    const grid = $('#mf-grid');
    const count = $('#mf-count');
    const empty = $('#mf-empty');
    const pagerSlot = $('#mf-pager');

    if (!ranked.length) {
        if (empty) empty.hidden = false;
        if (count) count.textContent = '0 kết quả';
        if (pagerSlot) pagerSlot.innerHTML = '';
        return;
    }

    // ---- Phân trang: tính tổng trang + clamp currentPage
    const totalItems = ranked.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    // ---- Hàm vẽ pager (‹ 1 … c-2 c-1 c c+1 c+2 … last ›)
    function renderPager() {
        if (!pagerSlot) return;
        if (totalPages <= 1) { pagerSlot.innerHTML = ''; updateURL(); return; }

        const pages = [];
        const first = 1, last = totalPages, span = 2;
        const push = n => pages.push(n);
        push(first);

        let start = Math.max(first + 1, currentPage - span);
        let end = Math.min(last - 1, currentPage + span);

        // nới biên để đủ dải trung tâm
        const need = span * 2 + 1;
        const got = end >= start ? end - start + 1 : 0;
        let miss = need - got;
        while (miss > 0 && start > first + 1) { start--; miss--; }
        while (miss > 0 && end < last - 1) { end++; miss--; }

        if (start > first + 1) pages.push('...');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < last - 1) pages.push('...');
        if (last > first) push(last);

        pagerSlot.innerHTML = `
        <nav class="mf-pager" aria-label="Pagination">
          <a href="#" class="mf-pg-btn ${currentPage === 1 ? 'is-disabled' : ''}" data-page="${currentPage - 1}" aria-label="Previous">‹</a>
          ${pages.map(p => p === '...'
            ? '<span class="mf-pg-ellipsis" aria-hidden="true">…</span>'
            : `<a href="#" class="mf-pg-btn ${p === currentPage ? 'is-active' : ''}" data-page="${p}" aria-label="Page ${p}">${p}</a>`
        ).join('')}
          <a href="#" class="mf-pg-btn ${currentPage === totalPages ? 'is-disabled' : ''}" data-page="${currentPage + 1}" aria-label="Next">›</a>
        </nav>
      `;

        pagerSlot.querySelectorAll('.mf-pg-btn').forEach(btn => {
            const page = parseInt(btn.getAttribute('data-page'), 10);
            if (isNaN(page)) return;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (page < 1 || page > totalPages || page === currentPage) return;
                currentPage = page;
                renderPage();   // vẽ lại trang
                updateURL();    // sync ?page
                scrollToTop();  // cuộn về đầu list
            });
        });

        updateURL();
    }

    // ---- Vẽ 1 trang
    function renderPage() {
        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageItems = ranked.slice(start, end);

        if (count) count.textContent = `${totalItems} kết quả cho “${qRaw}”`;
        empty && (empty.hidden = pageItems.length > 0);

        grid.innerHTML = pageItems.map(p => {
            const id = p.name || p.sku || p.url || p.page || '';
            const img = p.image || '/img/placeholder.webp';
            if (hasPrice(p)) {
                return `
            <div
  class="mf-card"
  id="${encodeURIComponent(id)}"
  data-id="${attrSafe(id)}"
  data-line1="${attrSafe(p.line1 || '')}"
  data-line2="${attrSafe(p.line2 || '')}"
  data-href="${attrSafe(p.href || '')}"
  data-cat="${attrSafe(p.cat || '')}"
>

              <img loading="lazy" src="${attrSafe(img)}" alt="">
              <h3>${attrSafe(p.name || '')}</h3>
              <div class="meta">${attrSafe(p.cat || '')}${p.sku ? (' • ' + attrSafe(p.sku)) : ''}</div>
              <div class="price">${fmtPrice(p.price, p.currency)}</div>
              <div style="display:flex;gap:8px;margin-top:.5rem;flex-wrap:wrap">
                <a href="#"
                   class="btn-add-to-cart"
                   data-id="${attrSafe(id)}"
                   data-name="${attrSafe(p.name || '')}"
                   data-price="${p.price ?? ''}"
                   data-currency="${attrSafe(p.currency || 'Kč')}"
                   data-image="${attrSafe(img)}"
                   style="border:1px solid #e5e7eb;border-radius:20px;padding:.35rem .8rem;font-weight:600;font-size:.9rem;">
                   <i class="fa fa-shopping-bag" style="margin-right:6px"></i><span>Add to Cart</span>
                </a>
              </div>
            </div>`;
            } else {
                const msg = encodeURIComponent(buildInquiryMessage(p));
                return `
            <div
  class="mf-card"
  id="${encodeURIComponent(id)}"
  data-id="${attrSafe(id)}"
  data-line1="${attrSafe(p.line1 || '')}"
  data-line2="${attrSafe(p.line2 || '')}"
  data-href="${attrSafe(p.href || '')}"
  data-cat="${attrSafe(p.cat || '')}"
>

              <img loading="lazy" src="${attrSafe(img)}" alt="">
              <h3>${attrSafe(p.name || '')}</h3>
              <div class="meta">${attrSafe(p.cat || '')}${p.sku ? (' • ' + attrSafe(p.sku)) : ''}</div>
              <div class="price" style="opacity:.8">Na poptávku</div>
              <div style="display:flex;gap:8px;margin-top:.5rem;flex-wrap:wrap">
                <a href="contact.html?msg=${msg}"
                   class="btn-inquiry"
                   style="border:1px solid #e5e7eb;border-radius:20px;padding:.35rem .8rem;font-weight:600;font-size:.9rem;">
                   <i class="fa fa-paper-plane" style="margin-right:6px"></i><span>Na poptávku</span>
                </a>
              </div>
            </div>`;
            }
        }).join('');

        renderPager();
    }

    // ===== Add to Cart (event delegation) =====
    const gridEl = $('#mf-grid');
    gridEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-add-to-cart');
        if (!btn) return;
        e.preventDefault();

        const priceNum = Number(btn.dataset.price || 0);
        const item = {
            id: btn.dataset.id,
            name: btn.dataset.name,
            price: isNaN(priceNum) ? 0 : priceNum,
            currency: btn.dataset.currency || 'Kč',
            image: btn.dataset.image || '/img/placeholder.webp',
            qty: 1
        };

        addToCart(item);

        btn.classList.add('disabled');
        const span = btn.querySelector('span');
        if (span) span.textContent = 'Added!';
        setTimeout(() => {
            btn.classList.remove('disabled');
            if (span) span.textContent = 'Add to Cart';
        }, 1200);
    });

    // ===== Render lần đầu
    renderPage();
})();

