// js/checkout.js
emailjs.init("4I8lK5e6IgeKjbmUf");

(function () {
  const CART_KEY = 'mina_cart';
  const VAT_RATE = 0.21;
  const $ = (s) => document.querySelector(s);

  const money = (n) =>
    new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2 }).format(n) + ' Kč';

  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }

  function renderSummary(cart) {
    const box = $('#orderSummary');
    if (!box) return;
    box.innerHTML = '';

    if (!cart.length) {
      box.innerHTML = '<p class="text-center text-muted">Cart is empty</p>';
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
    $('#sumShipping').textContent = money(ship);
    $('#sumVat').textContent = money(vat);
    $('#sumTotal').textContent = money(total);
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
      r.addEventListener('change', () => recalc(cart))
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
      btn.addEventListener('click', () => {
        const cartNow = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        if (!cartNow.length) { window.location.href = 'cart.html'; return; }

        const shipCost = Number(document.querySelector('input[name="shipping"]:checked')?.value || 0);
        const paymentMethod = document.querySelector('input[name="payment"]:checked')?.id === 'bank'
          ? 'Bankovním převodem' : 'Neurčeno';

        const subtotal = cartNow.reduce((s, p) => s + p.price * p.qty, 0);
        const vat = subtotal * VAT_RATE;
        const total = subtotal + vat + shipCost;

        const lastOrder = {
          orderNumber: 'Minafood-' + (Math.floor(Math.random() * 900000) + 100),
          createdAt: Date.now(),
          items: cartNow,
          subtotal, vat, shipping: shipCost, total,
          paymentMethod,
          bankInfo: {
            company: 'MINA FOOD s.r.o.',
            bankName: 'Banka',
            bankCode: '888',
            accountNumber: '888888888',
            iban: '',
            bic: ''
          }
        };

        localStorage.setItem('mina_last_order', JSON.stringify(lastOrder));
        localStorage.removeItem(CART_KEY);
        window.location.href = 'order-success.html';
      });
    }
  });
})();
