(async () => {
  // ========= Helpers =========
  const txt = (el) => (el ? el.textContent.trim().replace(/\s+/g, ' ') : '');
  const pick = (root, sel) => root.querySelector(sel);
  const pickAll = (root, sel) => Array.from(root.querySelectorAll(sel));

  const czToNumber = (s) => {
    if (!s) return null;
    const n = s
      .replace(/\s/g, '')
      .replace(/[^\d,.,-]/g, '')
      .replace(',', '.');
    const f = parseFloat(n);
    return Number.isFinite(f) ? f : null;
  };

  const parser = new DOMParser();

  // ========= Lấy danh sách category bên trái =========
  const catLinksEls = Array.from(
    document.querySelectorAll('.mb-16px .px-16px .flex a.link-Medium')
  );

  if (!catLinksEls.length) {
    console.warn('Không tìm thấy list category (.mb-16px .px-16px .flex a.link-Medium)');
    return;
  }

  const categories = catLinksEls.map((el) => {
    const fullText = txt(el); // "Steaming and Sous Vide (8)"
    const m = fullText.match(/^(.*)\((\d+)\)\s*$/);
    const name = m ? m[1].trim() : fullText;
    const count = m ? parseInt(m[2], 10) : null;
    const url = el.href || location.href; // mục đang active không có href
    const slug = new URL(url).pathname
      .split('/')
      .filter(Boolean)
      .slice(-1)[0];

    return { name, count, url, slug };
  });

  console.log('Categories:', categories);

  // ========= Hàm scrape 1 trang category từ Document =========
  function scrapeCategoryDoc(doc, category) {
    const cards = Array.from(
      doc.querySelectorAll('a[href][class*="rounded-2xl"]')
    ).filter(
      (a) => a.querySelector('picture img') && a.querySelector('.headingXSmall')
    );

    const products = cards.map((card) => {
      const url = new URL(card.getAttribute('href'), location.origin).href;

      const img = pick(card, 'picture img');
      const image = img?.currentSrc || img?.src || null;

      const badge = txt(pick(card, 'span.uppercase'));

      const model =
        txt(
          pick(
            card,
            '.paragraphXSmall.text-contentQuaternary'
          )
        ) || null;

      const productType =
        txt(
          pick(
            card,
            '.paragraphXSmall.text-contentTertiary'
          )
        ) || null;

      const series = pickAll(
        card,
        '.labelXSmall, .large\\:labelMedium'
      )
        .map((s) => txt(s))
        .filter(Boolean);

      const name = txt(pick(card, '.headingXSmall'));

      const power = txt(pick(card, '.power-type h3'));

      const features = pickAll(card, '.grid span.paragraphXSmall')
        .map((s) => txt(s))
        .filter(Boolean);

      const ecoBlock = pick(card, '[class*="bg-greenEco"]');
      const consumptionText = txt(
        ecoBlock?.querySelector('span:nth-of-type(1)')
      );
      const emissionText = txt(
        ecoBlock?.querySelector('span:nth-of-type(2)')
      );

      let consumption_kwh_per_day = null;
      const mC = consumptionText.match(/([\d\s.,]+)\s*kWh/);
      if (mC) consumption_kwh_per_day = czToNumber(mC[1]);

      let emissions_co2_kg_per_day = null;
      const mE = emissionText.match(/([\d\s.,]+)\s*kg\s*CO2/);
      if (mE) emissions_co2_kg_per_day = czToNumber(mE[1]);

      const priceSpan = pick(
        card,
        '.flex.items-center.justify-between span.labelSmall, .flex.items-center.justify-between span.large\\:headingXSmall'
      );
      const price_text = txt(priceSpan);
      const price_czk = czToNumber(price_text);

      const vat_note = txt(
        pick(
          card,
          '.flex.items-center.justify-between .paragraphXSmall, .flex.items-center.justify-between .paragraphMedium'
        )
      );

      return {
        // ===== thêm info category để filter =====
        category: category.name,
        category_slug: category.slug,
        category_url: category.url,
        category_count: category.count,

        // ===== data sản phẩm như code cũ của bạn =====
        url,
        image,
        badge,
        model,
        productType,
        series,
        name,
        power,
        features,
        consumption_text: consumptionText || null,
        emissions_text: emissionText || null,
        consumption_kwh_per_day,
        emissions_co2_kg_per_day,
        price_text: price_text || null,
        price_czk,
        vat_note: vat_note || null
      };
    });

    return products;
  }

  // ========= Fetch & gom dữ liệu từ TẤT CẢ category =========
  const allProductsRaw = [];

  for (const cat of categories) {
    try {
      console.log(`Đang fetch category: ${cat.name} → ${cat.url}`);
      const res = await fetch(cat.url, { credentials: 'include' });
      if (!res.ok) {
        console.warn('❌ Lỗi fetch', cat.name, res.status);
        continue;
      }
      const html = await res.text();
      const doc = parser.parseFromString(html, 'text/html');

      const products = scrapeCategoryDoc(doc, cat);
      console.log(`✅ ${cat.name}: ${products.length} sản phẩm`);
      allProductsRaw.push(...products);
    } catch (e) {
      console.error('Lỗi với category', cat.name, e);
    }
  }

  // ========= Deduplicate theo URL (phòng trường hợp trùng giữa các category) =========
  const byUrl = {};
  for (const p of allProductsRaw) {
    if (!byUrl[p.url]) byUrl[p.url] = p;
    else {
      // có thể merge thêm category nếu muốn:
      // byUrl[p.url].category_multi = [...new Set([... (byUrl[p.url].category_multi || [byUrl[p.url].category]), p.category])]
    }
  }
  const finalProducts = Object.values(byUrl);

  console.log(
    'Tổng sản phẩm (đã dedupe theo url):',
    finalProducts.length,
    '| raw:',
    allProductsRaw.length
  );
  console.log(finalProducts);

  // ========= Xuất 1 file JSON duy nhất =========
  const blob = new Blob([JSON.stringify(finalProducts, null, 2)], {
    type: 'application/json'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'unox_trays_all_categories.json';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
})();
