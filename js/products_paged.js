function renderPager(totalItems) {
  const slot = document.querySelector(PAGER_SLOT);
  if (!slot) return;

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);

  // tạo dải số kiểu 1 ... (c-2 c-1 c c+1 c+2) ... last
  const windowSize = 5; // tối đa 5 số trung tâm (c-2..c+2)
  const pages = [];
  const push = (p) => pages.push(p);

  const addRange = (a, b) => { for (let i = a; i <= b; i++) push(i); };

  // luôn có trang 1
  push(1);

  let start = Math.max(2, currentPage - 2);
  let end   = Math.min(totalPages - 1, currentPage + 2);

  // đảm bảo đủ windowSize khi gần đầu/cuối
  const needed = windowSize - (end - start + 1);
  if (needed > 0) {
    start = Math.max(2, start - needed);
  }
  if (needed > 0) {
    end = Math.min(totalPages - 1, end + needed);
  }

  // chèn ellipsis sau 1 nếu cần
  if (start > 2) pages.push('...');
  // chèn dải giữa
  if (end >= start) addRange(start, end);
  // chèn ellipsis trước last nếu cần
  if (end < totalPages - 1) pages.push('...');
  // luôn có trang cuối nếu >1
  if (totalPages > 1) push(totalPages);

  // HTML
  slot.innerHTML = `
    <div class="mf-pager-wrap">
      <nav class="mf-pager" aria-label="Pagination">
        <a href="#" class="mf-pg-btn ${currentPage === 1 ? 'is-disabled' : ''}" data-page="${currentPage - 1}" aria-label="Previous">‹</a>
        ${pages.map(p => {
          if (p === '...') return `<span class="mf-pg-ellipsis" aria-hidden="true">…</span>`;
          const active = (p === currentPage) ? 'is-active' : '';
          return `<a href="#" class="mf-pg-btn ${active}" data-page="${p}" aria-label="Page ${p}">${p}</a>`;
        }).join('')}
        <a href="#" class="mf-pg-btn ${currentPage === totalPages ? 'is-disabled' : ''}" data-page="${currentPage + 1}" aria-label="Next">›</a>
      </nav>
    </div>
  `;

  // gắn sự kiện click
  slot.querySelectorAll('.mf-pg-btn').forEach(btn => {
    const page = parseInt(btn.getAttribute('data-page'), 10);
    if (isNaN(page)) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (page < 1 || page > totalPages || page === currentPage) return;
      currentPage = page;
      renderProducts();
    });
  });

  updateURL(); // đồng bộ ?page
}
