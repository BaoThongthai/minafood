// Danh sách tên file ảnh có trong thư mục
const imageList = [
  "galary-27.png",
  "galary-1.jpg",
  "galary-2.jpg",
  "galary-3.jpg",
  "galary-4.jpg",
  "galary-5.jpg",
  "galary-6.png",
  "galary-7.png",
  "galary-8.png",
  "galary-9.png",
  "galary-10.png",
  "galary-11.png",
  "galary-12.png",
  "galary-13.png",
  "galary-14.png",
  "galary-15.png",
  "galary-16.png",
  "galary-17.png",
  "galary-18.png",
  "galary-19.png",
  "galary-20.png",
  "galary-21.png",
  "galary-22.png",
  "galary-23.png",
  "galary-24.jpg",
  "galary-25.jpg",
  "galary-26.jpg",

  // === Phần mới thêm từ 28 đến 52 ===
  "galary-28.png",
  "galary-29.png",
  "galary-30.png",
  "galary-31.png",
  "galary-32.png",
  "galary-33.png",
  "galary-34.png",
  "galary-35.png",
  "galary-36.png",
  "galary-37.png",
  "galary-38.png",
  "galary-39.png",
  "galary-40.png",
  "galary-41.png",
  "galary-42.png",
  "galary-43.png",
  "galary-44.png",
  "galary-45.png",
  "galary-46.png",
  "galary-47.png",
  "galary-48.png",
  "galary-49.png",
  "galary-50.png",
  "galary-51.png",
  "galary-52.png",
];

const container = document.getElementById("product-grid");

imageList.forEach((img) => {
  const col = document.createElement("div");
  col.className = "col-md-3 col-sm-6";

  col.innerHTML = `
      <div class="card shadow-sm h-100">
        <div class="ratio ratio-1x1">
          <img src="img/customer_galary/${img}" 
               class="card-img-top img-fluid object-fit-cover" 
               alt="${img}">
        </div>
      </div>
    `;
  container.appendChild(col);
});