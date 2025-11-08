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