(async () => {
    // ============ CÀI ĐẶT CƠ BẢN ============
    const startUrl = location.href;
    const allProducts = [];

    // Chuẩn hóa key từ "Width (mm)" -> "width"
    function normalizeKey(text) {
        let key = text.trim();
        key = key.replace(/\s*\(.*?\)\s*/g, ""); // bỏ đơn vị trong ngoặc
        key = key.replace(/\s+/g, "_");          // khoảng trắng -> _
        key = key.toLowerCase();
        return key;
    }

    // Cố gắng convert sang number nếu chỉ gồm số + , .
    function parseValue(raw) {
        if (raw == null) return null;
        const val = String(raw).trim().replace(/\u00A0/g, " ");
        const numericOnly = val.replace(/\s+/g, "");
        if (/^[0-9.,]+$/.test(numericOnly)) {
            const normalized = numericOnly.replace(/\./g, "").replace(",", ".");
            const num = parseFloat(normalized);
            return isNaN(num) ? val : num;
        }
        return val;
    }

    // EUR -> CZK (x25, làm tròn)
    function euroToCzk(eur) {
        if (typeof eur !== "number" || isNaN(eur)) return null;
        return Math.round(eur * 25);
    }

    // ============ PARSE 1 CARD SẢN PHẨM (list + accessories slider) ============
    function parseProductCard(item, origin) {
        let linkEl = item.querySelector("a.product.photo.product-item-photo");
        if (!linkEl) {
            linkEl = item.querySelector(".product-info .product-item-link");
        }
        if (!linkEl) return null;

        const url = new URL(linkEl.getAttribute("href"), origin).href;
        const nameEl = item.querySelector(".product-info .product-item-link");
        const name = nameEl ? nameEl.textContent.trim() : "";

        const skuSpan = item.querySelector('[id="product-sku"] span:last-child');
        const code = skuSpan ? skuSpan.textContent.trim() : "";

        const imgEl = item.querySelector("img.product-image-photo");
        let image = null;
        let image_large = null;
        if (imgEl) {
            const src = imgEl.getAttribute("src");
            image = src ? new URL(src, origin).href : null;
            image_large = image;
        }

        // ------- GIÁ (chuyển sang CZK) -------
        let price = null;          // CZK (number)
        let price_currency = "CZK";
        let price_text = null;     // "123 456 Kč"

        const priceAmountEl = item.querySelector(
            '[data-price-type="finalPrice"][data-price-amount]'
        );

        if (priceAmountEl) {
            const amountAttr = priceAmountEl.getAttribute("data-price-amount");
            const priceEur = parseValue(amountAttr);          // số EUR
            const priceCzk = euroToCzk(priceEur);             // số CZK

            price = priceCzk;

            if (priceCzk != null) {
                price_text = priceCzk.toLocaleString("cs-CZ") + " Kč";
            } else {
                // fallback text nếu ko convert được
                const priceTextNode =
                    priceAmountEl.querySelector(".price") ||
                    priceAmountEl.querySelector(".price-wrapper .price");
                price_text = priceTextNode ? priceTextNode.textContent.trim() : null;
            }
        } else {
            // Không có data-price-amount -> cố gắng đọc từ text "€12,035.00"
            const priceTextNode = item.querySelector(".price");
            if (priceTextNode) {
                const rawText = priceTextNode.textContent || "";
                const numericPart = rawText.replace(/[^\d.,]/g, "");
                const eur = parseValue(numericPart);
                const priceCzk = euroToCzk(eur);
                price = priceCzk;
                price_text = priceCzk != null
                    ? priceCzk.toLocaleString("cs-CZ") + " Kč"
                    : rawText.trim();
            }
        }

        return {
            code,
            name,
            url,
            image,
            image_large,
            price,           // CZK
            price_currency,  // "CZK"
            price_text       // ví dụ "337 500 Kč"
        };
    }

    // ============ LẤY SPECIFICATIONS ============
    function extractSpecsFromAttributesBlock(doc) {
        const specs = {};
        const rows = doc.querySelectorAll(
            "#product-attributes .additional-attributes .flex.flex-row"
        );
        if (!rows.length) return specs;

        rows.forEach(row => {
            const labelEl = row.querySelector(".product-attribute-label");
            const valueEl = row.querySelector(".product-attribute-value");
            if (!labelEl || !valueEl) return;

            const key = normalizeKey(labelEl.textContent);
            const value = parseValue(valueEl.textContent);

            specs[key] = value;
        });

        return specs;
    }

    // fallback: table dạng cũ
    function extractSpecsFromTable(doc) {
        const specs = {};
        const specTable = doc.querySelector(
            ".product_spec .table, .product-spec .table, table.data.table, table.data-table"
        );
        if (!specTable) return specs;

        specTable.querySelectorAll("tr").forEach(tr => {
            const tds = tr.querySelectorAll("td, th");
            if (tds.length < 2) return;

            const keyText = tds[0].textContent;
            const valueText = tds[1].textContent;

            const key = normalizeKey(keyText);
            const value = parseValue(valueText);

            specs[key] = value;
        });

        return specs;
    }

    // ============ LẤY DOWNLOADS ============
    function extractDownloads(doc, origin) {
        const downloads = [];
        doc.querySelectorAll(".am-attachments-tab .am-fileline").forEach(line => {
            const a = line.querySelector("a.am-filelink");
            if (!a) return;
            const label = a.textContent.trim();
            const url = new URL(a.getAttribute("href"), origin).href;
            downloads.push({ label, url });
        });
        return downloads;
    }

    // ============ LẤY ACCESSORIES ============
    function extractAccessories(doc, origin) {
        const accessories = [];
        const items = doc.querySelectorAll(
            ".related-product-slider .item.product.product-item"
        );
        items.forEach(item => {
            const parsed = parseProductCard(item, origin);
            if (parsed) accessories.push(parsed);
        });
        return accessories;
    }

    // ============ HÀM LẤY THÔNG SỐ TRANG CHI TIẾT ============
    async function scrapeDetail(url, baseInfo) {
        const res = await fetch(url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const origin = location.origin;

        let specs = extractSpecsFromAttributesBlock(doc);
        if (!Object.keys(specs).length) {
            specs = extractSpecsFromTable(doc);
        }

        const downloads = extractDownloads(doc, origin);
        const accessories = extractAccessories(doc, origin);

        return {
            code: baseInfo.code,
            name: baseInfo.name,
            url,
            image: baseInfo.image || null,
            image_large: baseInfo.image_large || null,
            price: baseInfo.price,
            price_currency: baseInfo.price_currency,
            price_text: baseInfo.price_text,
            specs,
            downloads,
            accessories
        };
    }

    // ============ HÀM QUÉT 1 TRANG LIST ============
    async function scrapeListPage(url) {
        console.log("Đang quét list:", url);
        const res = await fetch(url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const origin = location.origin;

        const productItems = [...doc.querySelectorAll(".item.product.product-item")];

        for (const item of productItems) {
            const baseCard = parseProductCard(item, origin);
            if (!baseCard) continue;

            console.log("  → Lấy chi tiết:", baseCard.code, "|", baseCard.name, "|", baseCard.url);

            try {
                const productData = await scrapeDetail(baseCard.url, baseCard);
                allProducts.push(productData);
            } catch (err) {
                console.error("Lỗi khi lấy sản phẩm", baseCard.code, baseCard.url, err);
            }
        }

        const nextLink =
            doc.querySelector('a[aria-label="Next"]') ||
            doc.querySelector(".pages-item-next a") ||
            doc.querySelector(".pagination .next a");

        if (nextLink && nextLink.getAttribute("href")) {
            const nextUrl = new URL(nextLink.getAttribute("href"), origin).href;
            await scrapeListPage(nextUrl);
        }
    }

    // ============ CHẠY ============
    await scrapeListPage(startUrl);

    console.log("Hoàn thành. Tổng sản phẩm:", allProducts.length);
    console.log(allProducts);

    if (typeof copy === "function") {
        copy(JSON.stringify(allProducts, null, 2));
        console.log("Đã copy JSON vào clipboard. Dán vào VS Code / Notepad để lưu.");
    } else {
        console.log("Trình duyệt không hỗ trợ copy() — hãy tự copy từ console.");
    }
})();
