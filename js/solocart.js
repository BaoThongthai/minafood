// js/solocart.js
(function () {
  const CART_KEY = 'mina_cart';
  const TBODY_SEL = '#cart-body';
  const SUBTOTAL_SEL = '#subtotal';
  const TOTAL_SEL = '#total';
  const SHIPPING_SEL = '#shipping';
  const CHECKOUT_BTN = '#proceedCheckout';

  const loadCart = () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  };
  const saveCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));

  const updateBadge = () => {
    const cart = loadCart();
    const count = cart.reduce((s, p) => s + (p.qty || 0), 0);
    document.querySelectorAll('.fa-shopping-bag').forEach((icon) => {
      const badge = icon.closest('a')?.querySelector('.position-absolute');
      if (badge) badge.textContent = String(count);
    });
  };

  const fmtCurrency = (value, currency = 'Kč') => {
    if (!isFinite(value)) return '';
    return new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .format(value) + ' ' + currency;
  };

  const renderCart = () => {
    const tbody = document.querySelector(TBODY_SEL);
    if (!tbody) return;

    const cart = loadCart();
    if (cart.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6" class="text-center py-4 text-muted">Your cart is empty.</td></tr>`;
      document.querySelector(SUBTOTAL_SEL).textContent = '0 Kč';
      document.querySelector(TOTAL_SEL).textContent = '0 Kč';
      return;
    }

    tbody.innerHTML = cart.map(item => {
      const id = item.id;
      const name = item.name || 'Product';
      const img = item.image || 'img/placeholder.webp';
      const currency = item.currency || 'Kč';
      const qty = Math.max(1, Number(item.qty) || 1);
      const price = Number(item.price);
      const hasPrice = isFinite(price) && price > 0;
      const rowTotal = hasPrice ? price * qty : 0;

      const priceDisplay = hasPrice
        ? fmtCurrency(price, currency)
        : `<span class="text-secondary" style="font-size:14px; color : red">Na poptávku</span>`;

      return `
        <tr data-id="${id}">
          <th scope="row">
            <img src="${img}" alt="${name}" style="width:80px;height:80px;object-fit:cover;">
          </th>
          <td class="align-middle">${name}</td>
          <td class="align-middle">${priceDisplay}</td>
          <td class="align-middle">
            <div class="input-group quantity" style="width: 130px;">
              <button class="btn btn-sm btn-outline-secondary js-qty-dec">−</button>
              <input type="text" class="form-control form-control-sm text-center js-qty-input" value="${qty}">
              <button class="btn btn-sm btn-outline-secondary js-qty-inc">+</button>
            </div>
          </td>
          <td class="align-middle">${hasPrice ? fmtCurrency(rowTotal, currency) : ''}</td>
          <td class="align-middle">
            <button class="btn btn-sm btn-outline-danger js-remove"><i class="fa fa-times"></i></button>
          </td>
        </tr>`;
    }).join('');

    const subtotal = cart.reduce((sum, it) => {
      const p = Number(it.price);
      const q = Math.max(1, Number(it.qty) || 1);
      if (isFinite(p) && p > 0) return sum + p * q;
      return sum;
    }, 0);

    const currency = cart.find(c => c.currency)?.currency || 'Kč';
    const shippingFee = 0;

    document.querySelector(SUBTOTAL_SEL).textContent = fmtCurrency(subtotal, currency);
    document.querySelector(SHIPPING_SEL).textContent = `Flat rate: ${fmtCurrency(shippingFee, currency)}`;
    document.querySelector(TOTAL_SEL).textContent = fmtCurrency(subtotal + shippingFee, currency);

    updateBadge();
  };

  // ================== CART ACTIONS ==================
  document.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    const id = tr?.getAttribute('data-id');
    if (!id) return;

    const cart = loadCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (e.target.closest('.js-qty-inc')) {
      item.qty = Math.max(1, (Number(item.qty) || 1) + 1);
      saveCart(cart);
      renderCart();
    }

    if (e.target.closest('.js-qty-dec')) {
      item.qty = Math.max(1, (Number(item.qty) || 1) - 1);
      saveCart(cart);
      renderCart();
    }

    if (e.target.closest('.js-remove')) {
      const newCart = cart.filter(i => i.id !== id);
      saveCart(newCart);
      renderCart();
    }
  });

  document.addEventListener('change', (e) => {
    const input = e.target.closest('.js-qty-input');
    if (!input) return;
    const tr = input.closest('tr[data-id]');
    const id = tr?.getAttribute('data-id');
    if (!id) return;
    const val = Math.max(1, Number(input.value) || 1);
    const cart = loadCart();
    const it = cart.find(i => i.id === id);
    if (it) it.qty = val;
    saveCart(cart);
    renderCart();
  });

  // ================== CHECKOUT BUTTON ==================
  document.addEventListener('DOMContentLoaded', () => {
    renderCart();

    const checkoutBtn = document.querySelector(CHECKOUT_BTN);
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        const cart = loadCart();
        const hasItems = cart.length > 0 && cart.some(i => (i.qty || 0) > 0);

        if (!hasItems) {
          alert('Your cart is empty!');
          return;
        }

        
        window.location.href = 'checkout.html';
      });
    }
  });
})();
