        document.addEventListener('DOMContentLoaded', function () {
            // Khởi tạo EmailJS
            emailjs.init({ publicKey: 'Sel3AbVN9UDkUGmeR' });

            // Lấy đúng form gốc (không sửa cấu trúc)
            const form = document.querySelector('.contact form');
            if (!form) return;

            // Bắt các field theo thuộc tính sẵn có (placeholder/type) để KHÔNG sửa HTML
            const fullNameEl = form.querySelector('input[placeholder="Jméno & Příjmení"]');
            const emailEl = form.querySelector('input[type="email"]');
            const phoneEl = form.querySelector('input[placeholder="Telefon"]');
            const messageEl = form.querySelector('textarea');
            const submitBtn = form.querySelector('button[type="submit"]');

            // Gắn name cho EmailJS + required (không sửa file HTML)
            if (fullNameEl) { fullNameEl.setAttribute('name', 'user_name'); fullNameEl.required = true; }
            if (emailEl) { emailEl.setAttribute('name', 'user_email'); emailEl.required = true; }
            if (phoneEl) { phoneEl.setAttribute('name', 'user_phone'); phoneEl.required = true; }
            if (messageEl) { messageEl.setAttribute('name', 'message'); } // có thể không bắt buộc

            // Thêm hidden subject
            let subjectEl = form.querySelector('input[name="subject"]');
            if (!subjectEl) {
                subjectEl = document.createElement('input');
                subjectEl.type = 'hidden';
                subjectEl.name = 'subject';
                form.appendChild(subjectEl);
            }

            // Thêm honeypot chống bot
            let hpEl = form.querySelector('input[name="hp_field"]');
            if (!hpEl) {
                hpEl = document.createElement('input');
                hpEl.type = 'text';
                hpEl.name = 'hp_field';
                hpEl.style.display = 'none';
                form.appendChild(hpEl);
            }

            // Thêm vùng thông báo (alert) cuối form (không đổi CSS, tận dụng bootstrap nếu có)
            let alertBox = document.getElementById('formAlert');
            if (!alertBox) {
                alertBox = document.createElement('div');
                alertBox.id = 'formAlert';
                alertBox.style.display = 'none';
                form.appendChild(alertBox);
            }

            // Helper
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
            function showAlert(type, text) {
                alertBox.style.display = 'block';
                alertBox.className = 'mt-3 alert alert-' + (type === 'success' ? 'success' : 'danger');
                alertBox.textContent = text;
            }
            function clearAlert() {
                alertBox.style.display = 'none';
                alertBox.className = 'mt-3';
                alertBox.textContent = '';
            }
            function invalid(el, msg) {
                if (!el) return;
                el.classList.add('is-invalid');
                // Nếu ngay sau có .invalid-feedback thì gán message
                const next = el.nextElementSibling;
                if (next && next.classList && next.classList.contains('invalid-feedback')) {
                    next.textContent = msg || next.textContent;
                }
            }
            function valid(el) {
                if (!el) return;
                el.classList.remove('is-invalid');
            }

            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                clearAlert();

                // Honeypot
                if (hpEl && (hpEl.value || '').trim() !== '') return;

                const name = (fullNameEl?.value || '').trim();
                const email = (emailEl?.value || '').trim();
                const phone = (phoneEl?.value || '').trim();
                const msg = (messageEl?.value || '').trim();

                // Reset trạng thái invalid
                [fullNameEl, emailEl, phoneEl].forEach(valid);

                // Validate: không trống + email đúng định dạng
                let hasError = false;
                if (!name) { invalid(fullNameEl, 'Vui lòng nhập họ tên.'); hasError = true; }
                if (!email) { invalid(emailEl, 'Vui lòng nhập email.'); hasError = true; }
                else if (!emailRegex.test(email)) { invalid(emailEl, 'Email chưa đúng định dạng.'); hasError = true; }
                if (!phone) { invalid(phoneEl, 'Vui lòng nhập số điện thoại.'); hasError = true; }

                if (hasError) return;

                // Subject: "Tư Vấn - {ngày giờ}" theo Asia/Ho_Chi_Minh
                const subject = 'Tư Vấn - ' + new Intl.DateTimeFormat('vi-VN', {
                    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh'
                }).format(new Date());
                subjectEl.value = subject;

                // Khoá nút submit
                const oldText = submitBtn ? submitBtn.textContent : '';
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang gửi...'; }

                try {
                    // Gửi qua EmailJS dùng object params (không đổi HTML)
                    await emailjs.send('service_rfdfzmh', 'template_udufowo', {
                        subject: subject,
                        user_name: name,
                        user_email: email,
                        user_phone: phone,
                        message: msg
                    });

                    showAlert('success', 'Đã gửi yêu cầu tư vấn. Chúng tôi sẽ liên hệ sớm nhất!');
                    form.reset();
                } catch (err) {
                    console.error(err);
                    showAlert('error', 'Gửi thất bại. Vui lòng thử lại sau.');
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldText || 'Submit'; }
                }
            });
        });