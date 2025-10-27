(() => {
  // ===== helpers copy thẳng vào console =====
  const toNumberPrice = (str) => {
    if (!str) return null;
    const clean = str.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const v = Number(clean);
    return Number.isFinite(v) ? (Math.round(v) === v ? Math.round(v) : v) : null;
  };
  const availabilityFrom = (status) =>
    /Na\s+sklade/i.test(status) ? "In stock" :
    /Na\s+objednávku/i.test(status) ? "On order" : "";
  const getText = (el, sel) => (el.querySelector(sel)?.textContent || "").trim();

  // ===== get all product cards =====
  const cards = document.querySelectorAll('.product-list .product');

  const items = [...cards].map(card => {
    const a = card.querySelector('a[href]');
    const href = a ? a.getAttribute('href') : "";
    const url = href ? new URL(href, location.origin) : null;
    const id = url ? url.pathname.replace(/^\/+|\/+$/g, '') : "";

    const name = getText(card, 'h3.name');
    const status = getText(card, '.status span') || "";
    const availability = availabilityFrom(status);
    const img = card.querySelector('.image img')?.src || "";

    const priceText = (card.querySelector('.price span')?.textContent || "")
      .replace(/\s+/g, ' ')
      .match(/([\d\.,]+)\s*€/)?.[1] || "";
    const price = toNumberPrice(priceText);

    return {
      id,
      name,
      label: "",
      price: price ?? "",
      currency: "€",
      status,
      availability,
      dimensions: { w: "", d: "", h: "" },
      image: img
    };
  }).filter(x => x.name);

  const json = JSON.stringify(items, null, 2);
  console.log(json);

  // ===== robust export: try DevTools copy -> Clipboard API -> download file =====
  const downloadJSON = (txt, filename='sushi.json') => {
    const blob = new Blob([txt], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    console.log('⬇️ Downloaded', filename);
  };

  try {
    if (typeof copy === 'function') {
      copy(json);                           // DevTools helper (Chrome)
      console.log('✅ Copied via DevTools copy()');
    } else if (navigator.clipboard && document.hasFocus()) {
      navigator.clipboard.writeText(json)
        .then(() => console.log('✅ Copied to clipboard'))
        .catch(() => downloadJSON(json));
    } else {
      downloadJSON(json);
    }
  } catch (e) {
    downloadJSON(json);
  }
})();
