

// 2) EmailJS config: THAY service_id nếu bạn đặt tên khác
const EMAILJS_SERVICE_ID = "service_imx51ac";   // <-- đổi nếu khác
const EMAILJS_TEMPLATE_ID = "template_0pna7cl";  // <-- giữ nguyên theo ảnh bạn gửi

(function () {
  const CART_KEY = 'mina_cart';
  const VAT_RATE = 0.21;
  const $ = (s) => document.querySelector(s);

  const money = (n) =>
    new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' Kč';

  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }

  function renderSummary(cart) {
    const box = $('#orderSummary');
    if (!box) return;
    box.innerHTML = '';

    if (!cart.length) {
      box.innerHTML = '<p class="text-center text-muted">Cart Empty</p>';
      return;
    }

    cart.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'd-flex mb-3 border-bottom pb-3';
      item.innerHTML = `
        <div class="me-3">
          <img src="${p.image}" class="rounded" style="width:70px;height:70px;object-fit:cover">
        </div>
        <div class="flex-grow-1">
          <p class="mb-1 fw-semibold">${i + 1}. ${p.name}</p>
          <small class="text-muted">SL: ${p.qty} × ${money(p.price)}</small><br>
          <strong>${money(p.qty * p.price)}</strong>
        </div>
      `;
      box.appendChild(item);
    });
  }

  function recalc(cart) {
    const subtotal = cart.reduce((s, p) => s + p.price * p.qty, 0);
    const ship = Number(document.querySelector('input[name="shipping"]:checked')?.value || 0);
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat + ship;

    $('#sumSubtotal').textContent = money(subtotal);
    $('#sumShipping').textContent = ship === 0 ? 'Doprava zdarma' : money(ship);
    $('#sumVat').textContent = money(vat);
    $('#sumTotal').textContent = money(total);
  }

  // helper: tạo ID Minafood-XXXXXX (6 chữ số, zero-pad)
  function makeOrderId() {
    const n = Math.floor(Math.random() * 1_000_000); // 0..999999
    const six = n.toString().padStart(6, '0');
    return `${six}`;
  }

  // build HTML items bảng cho email
  function buildItemsTable(cart) {
    const rows = cart.map((p, i) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ddd;">${i + 1}. ${p.name} × ${p.qty}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">
          ${new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2 }).format(p.qty * p.price)} Kč
        </td>
      </tr>
    `).join('');

    return `
      <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px">
        <thead>
          <tr>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;background:#f8f9fa">Produkt</th>
            <th style="padding:6px 8px;border:1px solid #ddd;text-align:right;background:#f8f9fa">Celkem</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const cart = loadCart();
    if (!cart.length) {
      window.location.href = 'cart.html';
      return;
    }

    renderSummary(cart);
    recalc(cart);

    document.querySelectorAll('input[name="shipping"]').forEach(r =>
      r.addEventListener('change', () => recalc(loadCart()))
    );

    // toggle note
    const noteToggle = $('#noteToggle');
    if (noteToggle) {
      noteToggle.addEventListener('change', (e) => {
        $('#orderNote').classList.toggle('d-none', !e.target.checked);
      });
    }

    // place order
    const btn = $('#btnPlaceOrder');
    if (btn) {
      btn.addEventListener('click', async () => {
        const formEl = document.getElementById('checkoutForm');
    if (!formEl) return;

    // Hiện lỗi + CHẶN xử lý nếu form chưa hợp lệ
    if (!formEl.reportValidity()) {
      // để form-submit handler của bạn tự preventDefault; 
      // ở đây chỉ dừng luồng gửi email/redirect
      return;
    }
        const cartNow = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        if (!cartNow.length) { window.location.href = 'cart.html'; return; }

        // Lấy form
        const email = $('#email')?.value?.trim() || '';
        const firstName = $('#firstName')?.value?.trim() || '';
        const lastName = $('#lastName')?.value?.trim() || '';
        const phone = $('#phone')?.value?.trim() || '';
        const address = $('#address')?.value?.trim() || '';
        const apartment = $('#apartment')?.value?.trim() || '';
        const city = $('#city')?.value?.trim() || '';
        const zip = $('#zip')?.value?.trim() || '';
        const note = $('#orderNote')?.classList.contains('d-none') ? '' : ($('#orderNote')?.value?.trim() || '');

        const shipInput = document.querySelector('input[name="shipping"]:checked');
        const shipCost = Number(shipInput?.value || 0);
        const shipMethod = shipInput?.id === 'shipFlat'
          ? 'Standardní doručení'
          : shipInput?.id === 'shipLocal'
            ? 'Místní doručení'
            : 'Doprava zdarma';

        const paymentMethod = document.querySelector('input[name="payment"]:checked')?.id === 'bank'
          ? 'Bankovním převodem' : 'Neurčeno';

        // Tính tiền
        const subtotal = cartNow.reduce((s, p) => s + p.price * p.qty, 0);
        const vat = subtotal * VAT_RATE;
        const total = subtotal + vat + shipCost;

        // Mã đơn hàng
        const orderId = makeOrderId();

        // Lưu đơn để trang success dùng
        const lastOrder = {
          orderNumber: 'MinaFood-'+ orderId,
          createdAt: Date.now(),
          items: cartNow,
          subtotal, vat, shipping: shipCost, total,
          paymentMethod,
          bankInfo: {
            company: 'Mina Food s.r.o.',
            bankName: 'Česká spořitelna, a.s.',
            bankCode: '0800',
            bankAcc: '6029825329/0800',
            iban: 'CZ14 0800 0000 0060 2982 5329',
            bic: 'GIBACZPX'
          }
        };
        localStorage.setItem('mina_last_order', JSON.stringify(lastOrder));

        // Chuẩn bị dữ liệu gửi EmailJS
        // Địa chỉ HTML đẹp
        const shippingAddressHtml = [
          `${firstName} ${lastName}`.trim(),
          [address, apartment && `Apt ${apartment}`].filter(Boolean).join(', '),
          [city, zip].filter(Boolean).join(' '),
          'Česká republika'
        ].filter(Boolean).join('<br>');

        // ---- templateParams ----
        const templateParams = {

          order_number: orderId,                       // đã có prefix Minafood- trong CODE
          customer_name: `${firstName} ${lastName}`.trim(),
          customer_email: email,
          customer_phone: phone || '(neuvedeno)',
          shipping_address: shippingAddressHtml,       // <== HTML
          shipping_method: shipMethod,
          payment_method: paymentMethod,
          items_html: buildItemsTable(cartNow),        // nhớ dùng {{{items_html}}} trong template
          subtotal: money(subtotal),
          vat: money(vat),
          shipping: shipCost === 0 ? 'Doprava zdarma' : money(shipCost),
          total: money(total),
          note: note || '(bez poznámky)'
        };


        // Gửi email & chuyển trang
        btn.disabled = true; const oldText = btn.textContent; btn.textContent = 'Zpracovávám…';
        try {
          await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
          // dọn giỏ và đi tiếp
          localStorage.removeItem(CART_KEY);
          window.location.href = 'order-success.html';
        } catch (err) {
          console.error(err);
          alert('Gửi email xác nhận không thành công. Vui lòng thử lại.');
          btn.disabled = false; btn.textContent = oldText;
        }
      });
    }
  });
})();
