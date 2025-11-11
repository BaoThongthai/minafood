(() => {
    // ==== LẤY PHẦN TỬ POPUP ====
    const popup = document.getElementById('product-popup');
    if (!popup) return; // nếu chưa có markup popup thì bỏ qua
    const popupClose = popup.querySelector('.product-popup-close');
    const popupImg = document.getElementById('popup-img');
    const popupName = document.getElementById('popup-name');
    const popupDim = document.getElementById('popup-dim');
    const popupWeight = document.getElementById('popup-weight');

    // Tạo 1 vùng "extra" để nhét thêm info chi tiết (nếu chưa có)
    let popupExtra = popup.querySelector('#popup-extra');
    if (!popupExtra) {
        popupExtra = document.createElement('div');
        popupExtra.id = 'popup-extra';
        popupExtra.style.marginTop = '8px';
        popup.querySelector('.product-popup-content')?.appendChild(popupExtra);
    }

    // ==== HÀM FORMAT GIÁ (đồng bộ với script phân trang) ====
    const fmtPrice = (price, currency) => {
        if (price == null || price === '' || isNaN(Number(price))) return '';
        const formatted = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            .format(Number(price));
        return `${formatted} ${currency ? currency : 'Kč bez DPH'}`;
    };

    // ==== MAP ID → PRODUCT (từ data đã render ở trang search) ====
    // Lưu ý: đoạn renderPage trước đó build id như sau:
    //   const id = p.name || p.sku || p.url || p.page || '';
    // Ta tạo snapshot từ DOM mỗi khi mở popup.
    function findProductFromCard(cardEl) {
        const id = cardEl?.dataset?.id || decodeURIComponent(cardEl?.id || '');
        if (!id) return null;

        const idxItem = getIndexItemById(id); // ← lấy item đầy đủ (có thể có href/url/page)

        const addBtn = cardEl.querySelector('.btn-add-to-cart');
        const p = {
            id,
            name: cardEl.querySelector('h3')?.textContent?.trim() || addBtn?.dataset?.name || idxItem?.name || '',
            cat: cardEl.dataset.cat || idxItem?.cat || (() => {
                const meta = cardEl.querySelector('.meta')?.textContent || '';
                return meta.split('•')[0]?.trim() || '';
            })(),
            sku: (() => {
                const meta = cardEl.querySelector('.meta')?.textContent || '';
                const m = meta.split('•')[1];
                return (m ? m.trim() : '') || idxItem?.sku || '';
            })(),
            image: addBtn?.dataset?.image || cardEl.querySelector('img')?.getAttribute('src') || idxItem?.image || '/img/placeholder.webp',
            price: (() => {
                const raw = addBtn?.dataset?.price ?? idxItem?.price;
                return raw == null ? null : Number(raw);
            })(),
            currency: addBtn?.dataset?.currency || idxItem?.currency || 'Kč',

            // đọc line1/line2 từ data-* (nếu bạn đã gắn), nếu không có thì fallback về index
            line1: cardEl.dataset.line1 || idxItem?.line1 || idxItem?.dimensions || '',
            line2: cardEl.dataset.line2 || idxItem?.line2 || (idxItem?.weight ? `${idxItem.weight} kg` : ''),
            dimensions: cardEl.getAttribute('data-dimensions') || idxItem?.dimensions || '',
            weight: cardEl.getAttribute('data-weight') || idxItem?.weight || '',
        };

        // tính link chi tiết mà không cần data-href
        p.href = deriveDetailLink(p, idxItem);
        return p;
    }


    function getIndexItemById(id) {
        try {
            const cache = JSON.parse(localStorage.getItem('mf_search_index_v1') || 'null');
            const items = cache?.items || [];
            // so khớp theo name/sku/url/page đã dùng làm id
            return items.find(it =>
                String(it.name) === id ||
                String(it.sku) === id ||
                String(it.url) === id ||
                String(it.page) === id
            ) || null;
        } catch { return null; }
    }

    // popup_search.js
    function deriveDetailLink(p, idx) {
        // 1) Nếu có link chi tiết "thật" thì dùng (ví dụ bạn lưu sẵn vào href hoặc url)
        if (idx?.href && idx.href.trim()) return idx.href;
        if (idx?.url && /(\?|#)id=|\/p\//i.test(idx.url)) return idx.url; // chỉ nhận url trông giống link chi tiết

        // 2) MẶC ĐỊNH → luôn về trang product.html chung (KHÔNG dùng idx.page nữa)
        const key = idx?.sku || idx?.id || p.sku || p.id || p.name || '';
        const base = (document.querySelector('base')?.href)
            || location.pathname.replace(/[^/]+$/, ''); // thư mục hiện tại
        return base + 'product.html?id=' + encodeURIComponent(key);
    }



    // ==== HÀM MỞ/CLOSE POPUP ====
    function openPopup(p) {
        if (!p) return;

        // Ảnh + tên
        if (popupImg) { popupImg.src = p.image || '/img/placeholder.webp'; popupImg.alt = p.name || ''; }
        if (popupName) popupName.textContent = p.name || '';

        // Gộp line1 + line2 + dimensions
        const lines = [p.line1, p.line2, p.dimensions].filter(Boolean);
        if (popupDim) popupDim.textContent = lines.join(' • ') || '';

        // Dòng phụ (SKU | Price hoặc Na poptávku)
        const subs = [];
        if (p.sku) subs.push(`SKU: ${p.sku}`);
        const priceTxt = (p.price && Number(p.price) > 0) ? fmtPrice(p.price, p.currency) : 'Na poptávku';
        subs.push(priceTxt);
        if (popupWeight) popupWeight.textContent = subs.join(' | ');

        // Bảng chi tiết + nút đi tới trang sản phẩm (nếu có href)
        const rows = [];
        if (p.cat) rows.push(['Category', p.cat]);
        if (p.weight) rows.push(['Weight', p.weight]);
        if (p.dimensions) rows.push(['Size', p.dimensions]);
        if (p.line1) rows.push(['Detail 1', p.line1]);
        if (p.line2) rows.push(['Detail 2', p.line2]);

        const esc = (v) => (v || '').toString().replace(/</g, '&lt;');

        popupExtra.innerHTML = `
    <div style="border-top:1px solid #eee; margin-top:8px; padding-top:8px;">
      <table style="width:100%; font-size:.95rem;">
        <tbody>
          ${rows.map(([k, v]) => `
            <tr>
              <td style="color:#6b7280; width:110px; vertical-align:top;">${k}</td>
              <td style="font-weight:600;">${esc(v)}</td>
            </tr>`).join('')}
        </tbody>
      </table>

${p.href ? `
  <div style="margin-top:12px; display:flex; justify-content:flex-end;">
    <a href="${esc(p.href)}" target="_blank" rel="noopener"
       class="btn btn-outline-primary btn-sm"
       style="border-radius:12px; padding:.45rem .9rem; font-weight:700;">
      View product
    </a>
  </div>` : ''}
    </div>
  `;

        popup.classList.remove('hidden');
        document.documentElement.style.overflow = 'hidden';
    }


    function closePopup() {
        popup.classList.add('hidden');
        document.documentElement.style.overflow = '';
    }

    // ==== BIND ĐÓNG POPUP ====
    popupClose?.addEventListener('click', closePopup);
    popup.addEventListener('click', (e) => {
        if (e.target === popup) closePopup(); // click nền tối
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !popup.classList.contains('hidden')) closePopup();
    });

    // ==== BIND MỞ POPUP: click lên card (trừ khi bấm nút/link) ====
    const grid = document.getElementById('mf-grid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            // bỏ qua nếu bấm vào nút Add to Cart, link inquiry, v.v.
            if (e.target.closest('a,button')) return;

            const card = e.target.closest('.mf-card');
            if (!card) return;

            const p = findProductFromCard(card);
            openPopup(p);
        });
    }
})();

