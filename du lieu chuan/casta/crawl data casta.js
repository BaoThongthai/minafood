(async () => {
    // ============ CÀI ĐẶT CƠ BẢN ============
    const startUrl = location.href; // đang ở trang list nào thì lấy từ đó
    const allProducts = [];

    // Chuẩn hóa key từ "Width (mm)" -> "width"
    function normalizeKey(text) {
        let key = text.trim();
        // bỏ đơn vị trong ngoặc
        key = key.replace(/\s*\(.*?\)\s*/g, "");
        // thay khoảng trắng bằng _
        key = key.replace(/\s+/g, "_");
        // viết thường
        key = key.toLowerCase();
        return key;
    }

    // Cố gắng convert sang number nếu chỉ gồm số + , .
    function parseValue(raw) {
        const val = raw.trim().replace(/\u00A0/g, " "); // bỏ NBSP
        const numericOnly = val.replace(/\s+/g, "");
        if (/^[0-9.,]+$/.test(numericOnly)) {
            const normalized = numericOnly.replace(/\./g, "").replace(",", ".");
            const num = parseFloat(normalized);
            return isNaN(num) ? val : num;
        }
        return val;
    }

    // ============ HÀM LẤY THÔNG SỐ TRONG TRANG CHI TIẾT ============
    async function scrapeDetail(url, baseInfo) {
        const res = await fetch(url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const specTable = doc.querySelector(".product_spec .table");
        const specs = {};

        if (specTable) {
            specTable.querySelectorAll("tr").forEach(tr => {
                const tds = tr.querySelectorAll("td");
                if (tds.length < 2) return;

                const keyText = tds[0].textContent;
                const valueText = tds[1].textContent;

                const key = normalizeKey(keyText);
                const value = parseValue(valueText);

                specs[key] = value;
            });
        }

        return {
            code: baseInfo.code,
            name: baseInfo.name,
            url,
            image: baseInfo.image || null,
            image_large: baseInfo.image_large || null,
            specs
        };
    }

    // ============ HÀM QUÉT 1 TRANG LIST ============
    async function scrapeListPage(url) {
        console.log("Đang quét list:", url);
        const res = await fetch(url);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const productItems = [...doc.querySelectorAll(".products-list_item")];

        for (const item of productItems) {
            const titleEl = item.querySelector(".product_title");
            const subtitleEl = item.querySelector(".product_subtitle");
            const linkEl = item.querySelector("a.product_image, a.product_info");
            const imgEl = item.querySelector("img.product_thumbnail");

            if (!linkEl) continue;

            const productUrl = new URL(linkEl.getAttribute("href"), location.origin).href;
            const code = titleEl ? titleEl.textContent.trim() : "";
            const name = subtitleEl ? subtitleEl.textContent.trim() : "";

            // Lấy link ảnh
            let image = null;
            let image_large = null;
            if (imgEl) {
                const src = imgEl.getAttribute("src");
                const lens = imgEl.getAttribute("data-lens");
                image = src ? new URL(src, location.origin).href : null;
                image_large = lens ? new URL(lens, location.origin).href : null;
            }

            console.log("  → Lấy chi tiết:", code, "|", productUrl);

            try {
                const productData = await scrapeDetail(productUrl, {
                    code,
                    name,
                    image,
                    image_large
                });
                allProducts.push(productData);
            } catch (err) {
                console.error("Lỗi khi lấy sản phẩm", code, productUrl, err);
            }
        }

        // Tìm link "Next" trong pagination
        const nextLink = doc.querySelector(".pagination .next a");
        if (nextLink && nextLink.getAttribute("href")) {
            const nextUrl = new URL(nextLink.getAttribute("href"), location.origin).href;
            await scrapeListPage(nextUrl); // đệ quy sang trang tiếp theo
        }
    }

    // ============ CHẠY ============
    await scrapeListPage(startUrl);

    console.log("Hoàn thành. Tổng sản phẩm:", allProducts.length);
    console.log(allProducts);

    // Chrome/Edge: copy JSON ra clipboard
    if (typeof copy === "function") {
        copy(JSON.stringify(allProducts, null, 2));
        console.log("Đã copy JSON vào clipboard. Dán vào VS Code / Notepad để lưu.");
    } else {
        console.log("Trình duyệt không hỗ trợ copy() — hãy tự copy từ console.");
    }
})();
