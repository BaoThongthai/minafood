// js/cart.js
(function () {
    const CART_KEY = 'mina_cart';

    function loadCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }

    function addToCart(item) {
        const cart = loadCart();
        const idx = cart.findIndex((p) => p.id === item.id);
        if (idx > -1) {
            cart[idx].qty += item.qty || 1;
        } else {
            cart.push({ ...item, qty: item.qty || 1 });
        }
        saveCart(cart);
        updateBadge();
    }

    function updateBadge() {
        const cart = loadCart();
        const count = cart.reduce((s, p) => s + p.qty, 0);
        document.querySelectorAll('.fa-shopping-bag').forEach((icon) => {
            const badge = icon.closest('a')?.querySelector('.position-absolute');
            if (badge) badge.textContent = count;
        });
    }
    // xử lý với đối tượng không có giá
    (function () {
        // Lấy nội dung từ querystring (?msg=...)
        const params = new URLSearchParams(location.search);
        const msg = params.get('msg');

        // Tìm đúng textarea (ưu tiên theo id, fallback theo data attr)
        const ta =
            document.getElementById('contact-message') ||
            document.querySelector('textarea[data-i18n-placeholder="form.message"]') ||
            document.querySelector('form textarea');

        if (ta && msg) {
            ta.value = decodeURIComponent(msg);
            // optional: focus và scroll tới chỗ ô nhập
            ta.focus({ preventScroll: false });
        }
    })();

    (function () {
        // Tạo container toast
        const toast = document.createElement('div');
        toast.className = 'toast-cart';
        document.body.appendChild(toast);

        // Lắng nghe sự kiện click Add to Cart
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.add-to-cart');
            if (!btn) return;

            const name = btn.dataset.name || 'Product';
            showToast(`🛒 ${name} has been added to cart!!`);
        });

        function showToast(msg) {
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2200);
        }
    })();

    // Lắng nghe click Add to cart
    document.addEventListener(
        'click',
        function (e) {
            const btn = e.target.closest('.add-to-cart');
            if (!btn) return;

            const item = {
                id: btn.dataset.id,
                name: btn.dataset.name,
                price: parseFloat(btn.dataset.price),
                currency: btn.dataset.currency || 'Kč',
                image: btn.dataset.image,
            };

            addToCart(item);

            // Chuyển sang trang cart nếu có href
            const href = btn.getAttribute('href') || '#';
            if (href === '#') e.preventDefault();
        },
        false
    );

    // Cập nhật badge khi load trang
    document.addEventListener('DOMContentLoaded', updateBadge);
})();
