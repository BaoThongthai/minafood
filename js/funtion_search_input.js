document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#mf-search-form");
  const input = form.querySelector("#mf-search-input");
  const toggle = form.querySelector("#search-toggle");
  const submitBtn = form.querySelector("#search-submit");

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    form.classList.toggle("active");
    if (form.classList.contains("active")) {
      input.focus();
      toggle.hidden = true;
      submitBtn.hidden = false;
    } else {
      input.value = "";
    }
  });

  // Khi click ra ngoài thì đóng lại
  document.addEventListener("click", (e) => {
    if (!form.contains(e.target)) {
      form.classList.remove("active");
      input.value = "";
      submitBtn.hidden = true;
      toggle.hidden = false;
    }
  });

  
});
