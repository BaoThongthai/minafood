(() => {
    // ===== helpers =====
    const txt = (el) => (el ? el.textContent.trim().replace(/\s+/g, ' ') : '');
    const pick = (root, sel) => root.querySelector(sel);
    const pickAll = (root, sel) => Array.from(root.querySelectorAll(sel));
    const czToNumber = (s) => {
        // "380 520,00 Kč" -> 380520.00
        if (!s) return null;
        const n = s.replace(/\s/g, '').replace(/[^\d,.-]/g, '').replace(',', '.');
        const f = parseFloat(n);
        return Number.isFinite(f) ? f : null;
    };

    // ===== chọn tất cả card sản phẩm UNOX theo layout bạn gửi =====
    const cards = Array.from(document.querySelectorAll('a[href][class*="rounded-2xl"]'))
        .filter(a => a.querySelector('picture img') && a.querySelector('.headingXSmall'));

    const products = cards.map((card) => {
        // URL & image
        const url = new URL(card.getAttribute('href'), location.origin).href;
        const img = pick(card, 'picture img');
        const image = img?.currentSrc || img?.src || null;

        // badge (Nové, apod.)
        const badge = txt(pick(card, 'span.uppercase'));

        // model & type (dòng nhỏ trên cùng)
        const model = txt(pick(card, '.paragraphXSmall.text-contentQuaternary')) || null;
        const productType = txt(pick(card, '.paragraphXSmall.text-contentTertiary')) || null;

        // series / line (CHEFTOP-X, Digital.ID, COUNTERTOP)
        const series = pickAll(card, '.labelXSmall, .large\\:labelMedium')
            .map(s => txt(s))
            .filter(Boolean);

        // main title (ví dụ: "10 GN 1/1 vsuvů")
        const name = txt(pick(card, '.headingXSmall'));

        // power type ("Elektrický")
        const power = txt(pick(card, '.power-type h3'));

        // features (các dòng có icon bên trái)
        const features = pickAll(card, '.grid span.paragraphXSmall')
            .map(s => txt(s))
            .filter(Boolean);

        // eco block: Consumption / Emise
        const ecoBlock = pick(card, '[class*="bg-greenEco"]');
        const consumptionText = txt(ecoBlock?.querySelector('span:nth-of-type(1)'));
        const emissionText = txt(ecoBlock?.querySelector('span:nth-of-type(2)'));

        // parse consumption số nếu có (kWh/den)
        let consumption_kwh_per_day = null;
        const mC = consumptionText.match(/([\d\s.,]+)\s*kWh/);
        if (mC) consumption_kwh_per_day = czToNumber(mC[1]);

        // parse emission số nếu có (kg CO2/den)
        let emissions_co2_kg_per_day = null;
        const mE = emissionText.match(/([\d\s.,]+)\s*kg\s*CO2/);
        if (mE) emissions_co2_kg_per_day = czToNumber(mE[1]);

        // price & VAT note
        const priceSpan = pick(card, '.flex.items-center.justify-between span.labelSmall, .flex.items-center.justify-between span.large\\:headingXSmall');
        const price_text = txt(priceSpan);
        const price_czk = czToNumber(price_text);
        const vat_note = txt(pick(card, '.flex.items-center.justify-between .paragraphXSmall, .flex.items-center.justify-between .paragraphMedium'));

        return {
            url,
            image,
            badge,
            model,
            productType,
            series,                 // mảng
            name,
            power,
            features,               // mảng
            consumption_text: consumptionText || null,
            emissions_text: emissionText || null,
            consumption_kwh_per_day,
            emissions_co2_kg_per_day,
            price_text: price_text || null,
            price_czk,
            vat_note: vat_note || null
        };
    });

    console.clear();
    console.table(products.map(p => ({
        name: p.name,
        price_czk: p.price_czk,
        power: p.power,
        url: p.url
    })));
    console.log(products);

    // Tự tải file JSON
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'products.json';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
})();
