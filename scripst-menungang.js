
document.addEventListener('DOMContentLoaded', function () {
    const wrap = document.querySelector('.mf-prislu-wrapper');
    if (!wrap) return;

    const trigger = wrap.querySelector('.parent-link');

    trigger.addEventListener('click', function (e) {
        const mobile = window.matchMedia('(max-width: 991px)').matches;
        if (!mobile) return;

        e.preventDefault();
        wrap.classList.toggle('is-open');
    });

    document.addEventListener('click', function (e) {
        const mobile = window.matchMedia('(max-width: 991px)').matches;
        if (!mobile) return;

        if (!wrap.contains(e.target)) wrap.classList.remove('is-open');
    });
});
