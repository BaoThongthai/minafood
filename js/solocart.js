// js/solocart.js
(function () {
  const CART_KEY = 'mina_cart';
  const SHIPPING_FLAT = 0;      // phí ship cố định (sửa nếu cần)
  const CURRENCY = 'Kč';

  const $ = (sel) => document.querySelector(sel);

  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }
  function money(n) {
    return new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .format(n) + ' ' + CURRENCY;
  }
  function updateBadge(count) {
    const total = count ?? loadCart().reduce((s, p) => s + p.qty, 0);
    document.querySelectorAll('.fa-shopping-bag').forEach(icon => {
      const badge = icon.closest('a')?.querySelector('.position-absolute');
      if (badge) badge.textContent = total;
    });
  }

  function render() {
    const cart = loadCart();
    const tbody = $('#cart-body');
    tbody.innerHTML = '';

    if (cart.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5">Cart Empty</td></tr>`;
      $('#subtotal').textContent = money(0);
      $('#shipping').textContent = `Flat rate: ${money(SHIPPING_FLAT)}`;
      $('#total').textContent = money(SHIPPING_FLAT);
      updateBadge(0);
      return;
    }

    let subtotal = 0;
    cart.forEach(p => {
      const line = p.price * p.qty;
      subtotal += line;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <th scope="row">
          <div class="d-flex align-items-center">
            <img src="${p.image}" class="img-fluid me-5 rounded-circle" style="width:80px;height:80px;" alt="">
          </div>
        </th>
        <td><p class="mb-0 mt-4">${p.name}</p></td>
        <td><p class="mb-0 mt-4">${money(p.price)}</p></td>
        <td>
          <div class="input-group quantity mt-4" style="width:120px;">
            <button class="btn btn-sm btn-minus rounded-circle bg-light border" data-action="minus" data-id="${p.id}">
              <i class="fa fa-minus"></i>
            </button>
            <input type="text" class="form-control form-control-sm text-center border-0"
                   value="${p.qty}" data-action="input" data-id="${p.id}">
            <button class="btn btn-sm btn-plus rounded-circle bg-light border" data-action="plus" data-id="${p.id}">
              <i class="fa fa-plus"></i>
            </button>
          </div>
        </td>
        <td><p class="mb-0 mt-4">${money(line)}</p></td>
        <td>
          <button class="btn btn-md rounded-circle bg-light border mt-4" data-action="remove" data-id="${p.id}">
            <i class="fa fa-times text-danger"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    $('#subtotal').textContent = money(subtotal);
    $('#shipping').textContent = `Flat rate: ${money(SHIPPING_FLAT)}`;
    $('#total').textContent = money(subtotal + SHIPPING_FLAT);
    updateBadge();
  }

  // Ủy quyền sự kiện cho +/-/xóa/nhập số lượng
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const cart = loadCart();
    const idx = cart.findIndex(p => p.id === id);
    if (idx === -1) return;

    if (action === 'plus')       cart[idx].qty += 1;
    else if (action === 'minus') cart[idx].qty = Math.max(1, cart[idx].qty - 1);
    else if (action === 'remove') cart.splice(idx, 1);

    saveCart(cart);
    render();
  });

  document.addEventListener('change', (e) => {
    const input = e.target.closest('input[data-action="input"]');
    if (!input) return;
    const id = input.dataset.id;
    const qty = Math.max(1, parseInt(input.value || '1', 10));
    const cart = loadCart();
    const idx = cart.findIndex(p => p.id === id);
    if (idx === -1) return;
    cart[idx].qty = qty;
    saveCart(cart);
    render();
  });

  document.addEventListener('DOMContentLoaded', render);
})();

// Điều hướng sang checkout
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('proceedCheckout');
  if (btn) {
    btn.addEventListener('click', () => {
      // Cart đã được lưu mỗi khi thay đổi (saveCart); chỉ cần đi tiếp
      window.location.href = 'checkout.html'; // nhớ sửa link menu từ chackout.html -> checkout.html
    });
  }
});
