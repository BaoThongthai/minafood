// js/i18n.js
(function () {
  // Từ điển (đúng chuẩn: cs = Czech, en = English)
  const i18n = {
    cs: {
      "nav.home": "Home",
      "nav.shop": "E-shop",
      "nav.categories": "Kategorie",
      "nav.about": "O nás",
      "nav.contact": "Kontakt",

      // thêm nếu cần
      "buttons.showMore": "Zobrazit produkty",
      "buttons.showLess": "Skrýt",

      // ví dụ topbar (nếu sau này bạn gắn data-i18n)
      "topbar.address": "Libušská 3/163, Praha - 142 00",
      "topbar.email": "info@minafood.cz",
      "topbar.phone": "+420 608 188 896",

      "features.servicesTitle": "Komplexní služby",
      "features.servicesText": "Otevřete brány gastronomického úspěchu. Naše komplexní.",
      "features.experienceTitle": "Více než 10 let",
      "features.experienceText": "Otevřete brány gastronomického úspěchu. Naše komplexní.",
      "features.qualityTitle": "Záruka kvality",
      "features.qualityText": "Otevřete brány gastronomického úspěchu. Naše komplexní.",
      "features.customTitle": "Výroba na míru",
      "features.customText": "Otevřete brány gastronomického úspěchu. Naše komplexní.",

      "hero.subtitle": "Řešení pro kuchyně a mrazničky",
      "hero.title": "KOMPLEXNÍ ŘEŠENÍ PRO GASTRONOMII",
        "services.installVentilationTitle": "Montáž vzduchotechniky",
  "services.installVentilationText": "Profesionální montáž vzduchotechniky do vašich prostor. Spolehlivě a efektivně zajistíme ideální podmínky ve vašich interiérech.",

  "services.installGasStovesTitle": "Montáž plynových sporáků",
  "services.installGasStovesText": "Odborná montáž plynových sporáků pro bezpečné vaření a účinné využití energie. Zajistíme optimální funkčnost vašeho sporáku.",

  "services.restaurantBuyoutTitle": "Výkup restaurací",
  "services.restaurantBuyoutText": "Specializujeme se na férový a rychlý výkup restaurací. Zvažujete prodej? Kontaktujte nás pro konzultaci.",

  "services.equipmentSaleTitle": "Prodej gastro vybavení",
  "services.equipmentSaleText": "Profesionální vybavení pro vaši restauraci snadno a rychle. Široký výběr za atraktivní ceny. které podpoří váš gastronomický podnik.",

  "services.cta": "Mám zájem"
    },
    en: {
      "nav.home": "Home",
      "nav.shop": "E-Shop",
      "nav.categories": "Categories",
      "nav.about": "About us",
      "nav.contact": "Contact",

      "buttons.showMore": "Show more",
      "buttons.showLess": "Show less",

      "topbar.address": "Libušská 3/163, Prague - 142 00",
      "topbar.email": "info@minafood.cz",
      "topbar.phone": "+420 608 188 896",

      "features.servicesTitle": "Comprehensive services",
      "features.servicesText": "Open the gates to gastronomic success. Our comprehensive solutions.",
      "features.experienceTitle": "More than 10 years",
      "features.experienceText": "Open the gates to gastronomic success. Our comprehensive solutions.",
      "features.qualityTitle": "Quality guarantee",
      "features.qualityText": "Open the gates to gastronomic success. Our comprehensive solutions.",
      "features.customTitle": "Custom-made production",
      "features.customText": "Open the gates to gastronomic success. Our comprehensive solutions.",
      "hero.subtitle": "Solutions for kitchens and freezers",
      "hero.title": "COMPREHENSIVE SOLUTIONS FOR GASTRONOMY",
      "services.installVentilationTitle": "Ventilation system installation",
  "services.installVentilationText": "Professional installation of ventilation systems for your premises. We reliably and efficiently ensure ideal indoor conditions.",

  "services.installGasStovesTitle": "Gas stove installation",
  "services.installGasStovesText": "Expert installation of gas stoves for safe cooking and efficient energy use. We ensure optimal functionality of your stove.",

  "services.restaurantBuyoutTitle": "Restaurant buyout",
  "services.restaurantBuyoutText": "We specialize in fair and fast restaurant buyouts. Considering selling? Contact us for a consultation.",

  "services.equipmentSaleTitle": "Gastro equipment sales",
  "services.equipmentSaleText": "Professional equipment for your restaurant quickly and easily. A wide selection at attractive prices. which will support your gastronomic business.",

  "services.cta": "learn more"

    }
  };

  function applyTranslations(lang) {
    // Text nodes
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const val = i18n[lang] && i18n[lang][key];
      if (val !== undefined) el.textContent = val;
    });

    // Placeholder
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      const val = i18n[lang] && i18n[lang][key];
      if (val !== undefined) el.setAttribute("placeholder", val);
    });

    document.documentElement.setAttribute("lang", lang);

    // Ví dụ: nếu bạn có nút loadMore
    const loadBtn = document.getElementById("loadMore");
    if (loadBtn) {
      const isExpanded = loadBtn.getAttribute("data-expanded") === "true";
      const labelKey = isExpanded ? "buttons.showLess" : "buttons.showMore";
      const label = i18n[lang] && i18n[lang][labelKey];
      if (label) loadBtn.textContent = label;
    }
  }

  function init() {
    let currentLang = localStorage.getItem("lang") || "cs"; // mặc định: Czech
    const toggleBtn = document.getElementById("langToggle");

    applyTranslations(currentLang);

    if (toggleBtn) {
      // Nút hiển thị ngôn ngữ "sẽ chuyển sang"
      toggleBtn.textContent = currentLang === "cs" ? "EN" : "CZ";
      toggleBtn.addEventListener("click", () => {
        currentLang = currentLang === "cs" ? "en" : "cs";
        localStorage.setItem("lang", currentLang);
        applyTranslations(currentLang);
        toggleBtn.textContent = currentLang === "cs" ? "EN" : "CZ";
      });
    }
  }

  // Đợi DOM sẵn sàng rồi mới chạy (đảm bảo tìm thấy #langToggle + các data-i18n)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
