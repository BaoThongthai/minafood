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
      "services.installVentilationTitle": " Montáž plynových sporáků",
      "services.installVentilationText": "Odborná montáž plynových sporáků pro bezpečné vaření a účinné využití energie. Zajistíme optimální funkčnost vašeho sporáku.",

      "services.installGasStovesTitle": "Montáž vzduchotechniky",
      "services.installGasStovesText": "Profesionální montáž vzduchotechniky do vašich prostor. Spolehlivě a efektivně zajistíme ideální podmínky ve vašich interiérech.",

      "services.restaurantBuyoutTitle": "Výkup restaurací",
      "services.restaurantBuyoutText": "Specializujeme se na profesionální výkup restaurací. Nabízíme férové zhodnocení a rychlý proces převzetí podniku. Zvažujete prodej? Kontaktujte nás pro konzultaci.",

      "services.equipmentSaleTitle": "Prodej gastro vybavení",
      "services.equipmentSaleText": "Profesionální vybavení pro vaši restauraci snadno a rychle. Široký výběr za atraktivní ceny. které podpoří váš gastronomický podnik.",

      "services.cta": "Mám zájem",
      "about.title": "Vše pro gastro na jednom místě",
      "about.text1": "Naše firma se specializuje na komplexní řešení pro gastronomické podniky.",
      "about.text2": "Provádíme precizní montáže vzduchotechniky a plynových sporáků, abyste mohli vařit s maximální efektivitou a bezpečností.",
      "about.text3": "Nabízíme také prodej špičkového profesionálního nádobí a vybavení pro restaurace a bistra, abyste měli k dispozici to nejlepší pro svůj podnik. Pokud uvažujete o prodeji své restaurace, jsme tu pro vás s naším službou výkupu podniků. Spolehlivě a s důrazem na vaše potřeby.",
      "about.text4": "Jsme vaše komplexní řešení pro gastronomii!",
      "about.cta": "Kontakt"
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
      "services.installVentilationTitle": "Gas stove installation",
      "services.installVentilationText": "Professional installation of gas stoves for safe cooking and efficient use of energy. We will reliably ensure the connection and optimal functionality of your stove.",

      "services.installGasStovesTitle": " Ventilation system setup",
      "services.installGasStovesText": "Professional installation of ventilation systems for your premises. We reliably and efficiently ensure ideal indoor conditions.",

      "services.restaurantBuyoutTitle": "Restaurant buyout",
      "services.restaurantBuyoutText": "We specialize in professional restaurant buyouts. We offer fair valuations and a fast takeover process. Are you considering selling? Contact us for a consultation.",

      "services.equipmentSaleTitle": "Gastro equipment sales",
      "services.equipmentSaleText": "Professional equipment for your restaurant quickly and easily. A wide selection at attractive prices. which will support your gastronomic business.",

      "services.cta": "learn more"
      ,
      "about.title": "Everything for gastronomy in one place",
      "about.text1": "Our company specializes in comprehensive solutions for gastronomic businesses.",
      "about.text2": "We provide precise installation of ventilation systems and gas stoves so you can cook with maximum efficiency and safety.",
      "about.text3": "We also offer the sale of top professional cookware and equipment for restaurants and bistros, so you have the best for your business. If you are considering selling your restaurant, we are here for you with our business buyout service. Reliable and tailored to your needs.",
      "about.text4": "We are your comprehensive solution for gastronomy!",
      "about.cta": "Contact"
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
