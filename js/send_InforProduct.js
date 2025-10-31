 // ====== INQUIRY MODAL LOGIC ======
        const inqModalEl = document.getElementById('inquiryModal');
        const inqModal = new bootstrap.Modal(inqModalEl);

        const inqImg = document.getElementById('inq-img');
        const inqName = document.getElementById('inq-name');
        const inqLine = document.getElementById('inq-line');
        const inqSku = document.getElementById('inq-sku');
        const inqPrice = document.getElementById('inq-price');

        const inqEmail = document.getElementById('inq-email');
        const inqPhone = document.getElementById('inq-phone');
        const inqMsg = document.getElementById('inq-message');
        const inqSubmit = document.getElementById('inq-submit');
        const inqForm = document.getElementById('inquiryForm');
        const inqStatus = document.getElementById('inq-status');

        let currentInquiryProduct = null;

        // gọi mỗi lần render để gắn click listener
        function attachInquiryHandlers(sourceRoot) {
            (sourceRoot || document).querySelectorAll('.js-inquiry-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const id = btn.getAttribute('data-id');
                    // Tùy file JS bạn đang dùng: lấy từ allProducts / filteredProducts...
                    const p = (typeof filteredProducts !== 'undefined' ? filteredProducts : allProducts)
                        .find(x => String(x.id) === String(id));
                    if (!p) return;

                    currentInquiryProduct = p;

                    // Fill modal
                    inqImg.src = p.image || 'img/placeholder.webp';
                    inqImg.alt = p.name || '';
                    inqName.textContent = p.name || '';
                    const line = [p.line1, p.line2].filter(Boolean).join(' • ');
                    inqLine.textContent = line || '';
                    inqSku.textContent = p.sku ? `SKU: ${p.sku}` : '';
                    const priceTxt = (p.price == null || p.price === '') ? '' : `${p.price} ${p.currency || ''}`.trim();
                    inqPrice.textContent = priceTxt;

                    // reset form
                    inqForm.classList.remove('was-validated');
                    inqEmail.value = '';
                    inqPhone.value = '';
                    inqMsg.value = '';
                    inqStatus.textContent = '';

                    inqModal.show();
                });
            });
        }

        // GỌI HÀM NÀY ngay sau mỗi lần bạn render danh sách:
        //  - nếu bạn có hàm renderProducts(), hãy gọi attachInquiryHandlers(grid) cuối hàm.
        // Ví dụ:
        if (typeof grid !== 'undefined') {
            attachInquiryHandlers(grid);
        }

        // Nếu bạn đã có attachCardHandlers(), hãy chèn thêm `attachInquiryHandlers(grid);` sau khi innerHTML xong.


        // ====== Gửi bằng EmailJS ======
        // TODO: thay bằng thông tin EmailJS của bạn:
        const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
        const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

        inqSubmit.addEventListener('click', async () => {
            // Validate
            inqForm.classList.add('was-validated');
            if (!inqEmail.checkValidity() || !inqPhone.checkValidity()) {
                inqStatus.textContent = 'Vui lòng điền đầy đủ Email và Số điện thoại.';
                return;
            }
            if (!currentInquiryProduct) {
                inqStatus.textContent = 'Không tìm thấy sản phẩm.';
                return;
            }

            // Disable UI khi gửi
            inqSubmit.disabled = true;
            inqStatus.textContent = 'Đang gửi...';

            // Template params: đặt key khớp với template trong EmailJS của bạn
            const params = {
                product_name: currentInquiryProduct.name || '',
                product_line1: currentInquiryProduct.line1 || '',
                product_line2: currentInquiryProduct.line2 || '',
                product_sku: currentInquiryProduct.sku || '',
                product_price: (currentInquiryProduct.price == null || currentInquiryProduct.price === '')
                    ? '' : `${currentInquiryProduct.price} ${currentInquiryProduct.currency || ''}`.trim(),
                product_image: currentInquiryProduct.image || '',
                product_link: currentInquiryProduct.href || '',
                page_url: window.location.href,

                user_email: inqEmail.value.trim(),
                user_phone: inqPhone.value.trim(),
                user_message: inqMsg.value.trim()
            };

            try {
                const res = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
                inqStatus.textContent = 'Gửi thành công! Chúng tôi sẽ liên hệ sớm.';
                // đóng modal sau 1.2s
                setTimeout(() => { inqModal.hide(); }, 1200);
            } catch (err) {
                console.error(err);
                inqStatus.textContent = 'Gửi thất bại. Vui lòng thử lại sau.';
            } finally {
                inqSubmit.disabled = false;
            }
        });