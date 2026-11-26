/* Animasi muncul halus saat scroll (peningkatan; situs tetap jalan tanpa ini) */
(function () {
  if (!("IntersectionObserver" in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: .08 });
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".data-panel,.feature-tile,.stat-card,.product-card,.panduan-card,.content-section,.vm-content .card").forEach(function (el) {
      el.classList.add("reveal"); io.observe(el);
    });
  });
})();
