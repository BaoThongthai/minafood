(() => {
    const form = document.getElementById('checkoutForm');
    const noteToggle = document.getElementById('noteToggle');
    const orderNote = document.getElementById('orderNote');
    const shippingGroup = document.getElementById('shippingGroup');
    const paymentGroup = document.getElementById('paymentGroup');

    // Toggle note field visibility
    noteToggle.addEventListener('change', () => {
      const show = noteToggle.checked;
      orderNote.classList.toggle('d-none', !show);
      // optional: make note required only when visible
      orderNote.toggleAttribute('required', show);
      if (!show) {
        orderNote.value = '';
        orderNote.setCustomValidity('');
      }
    });

    // Real-time validation on inputs
    form.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('input', () => {
        el.setCustomValidity(''); // reset custom validity
        if (el.checkValidity()) {
          el.classList.remove('is-invalid');
          el.classList.add('is-valid');
        } else {
          el.classList.remove('is-valid');
        }
      });
      el.addEventListener('blur', () => {
        if (!el.checkValidity()) el.classList.add('is-invalid');
      });
    });

    // Helper: ensure a radio group has a selection (for custom blocks)
    function validateRadioGroup(container, name, invalidSelector) {
      const selected = form.querySelector(`input[name="${name}"]:checked`);
      const invalid = container.querySelector(invalidSelector);
      const ok = !!selected;
      if (invalid) invalid.style.display = ok ? 'none' : '';
      return ok;
    }

    // Submit handler
    form.addEventListener('submit', (e) => {
      // Bootstrap native validation
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Extra validation for radio groups (if you add more options later)
      const shipOk = validateRadioGroup(shippingGroup, 'shipping', '.invalid-feedback');
      const payOk  = validateRadioGroup(paymentGroup, 'payment',  '.invalid-feedback');

      form.classList.add('was-validated');

      if (!form.checkValidity() || !shipOk || !payOk) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // If everything is valid, you can proceed (e.g., send data via fetch/AJAX)
      // e.preventDefault(); // uncomment if handling submit via JS
    }, false);
  })();