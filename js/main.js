/* Shubh Ashish Welfare Society: site behaviour.
   - English / Hindi switch (Hindi strings come from js/hi.js)
   - mobile menu
   - gallery filters and photo viewer
   - contact form that opens WhatsApp or the email app */
(function () {
  "use strict";

  var root = document.documentElement;
  var HI = window.I18N_HI || {};
  var lang = "en";

  /* ---------- Language ---------- */

  function storeLang(value) {
    try { localStorage.setItem("lang", value); } catch (e) { /* storage blocked */ }
  }

  function savedLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (fromUrl === "hi" || fromUrl === "en") return fromUrl;
    try { return localStorage.getItem("lang") || "en"; } catch (e) { return "en"; }
  }

  // Text for a key in the current language. English comes from the page itself.
  function tr(key, fallback) {
    return lang === "hi" && HI[key] ? HI[key] : fallback;
  }

  function applyLang(next) {
    lang = next === "hi" ? "hi" : "en";
    root.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      var hi = HI[el.dataset.i18n];
      el.innerHTML = lang === "hi" && hi ? hi : el.dataset.en;
    });

    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.dataset.i18nAttr.split(";").forEach(function (pair) {
        var parts = pair.split(":");
        var attr = parts[0], key = parts[1];
        var store = "en" + attr.replace(/[^a-z]/gi, "");
        if (el.dataset[store] === undefined) el.dataset[store] = el.getAttribute(attr) || "";
        var hi = HI[key];
        el.setAttribute(attr, lang === "hi" && hi ? hi : el.dataset[store]);
      });
    });

    root.classList.remove("i18n-pending");
  }

  document.querySelectorAll(".lang-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = lang === "hi" ? "en" : "hi";
      storeLang(next);
      applyLang(next);
      btn.lang = next === "hi" ? "en" : "hi";
      // Drop ?lang= from the address so the stored choice wins on the next page.
      if (location.search.indexOf("lang=") !== -1) {
        history.replaceState(null, "", location.pathname + location.hash);
      }
    });
  });

  applyLang(savedLang());
  document.querySelectorAll(".lang-toggle").forEach(function (btn) {
    btn.lang = lang === "hi" ? "en" : "hi";
  });

  /* ---------- Footer year ---------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Mobile menu ---------- */

  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- Gallery ---------- */

  var gallery = document.querySelector(".gallery");
  if (gallery) {
    var figures = Array.prototype.slice.call(gallery.querySelectorAll("figure"));
    var filterBtns = document.querySelectorAll(".filter-btn");

    function setFilter(cat) {
      var known = Array.prototype.some.call(filterBtns, function (b) { return b.dataset.filter === cat; });
      if (!known) cat = "all";
      filterBtns.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.dataset.filter === cat));
      });
      figures.forEach(function (fig) {
        fig.hidden = cat !== "all" && fig.dataset.cat !== cat;
      });
    }

    filterBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        setFilter(b.dataset.filter);
        history.replaceState(null, "", b.dataset.filter === "all" ? location.pathname : "#" + b.dataset.filter);
      });
    });
    setFilter(location.hash.slice(1) || "all");
    window.addEventListener("hashchange", function () { setFilter(location.hash.slice(1) || "all"); });

    // Photo viewer
    var box = document.querySelector(".lightbox");
    var boxImg = box.querySelector("img");
    var boxCap = box.querySelector(".lightbox-caption");
    var current = 0;

    function visible() {
      return figures.filter(function (f) { return !f.hidden; });
    }

    function show(index) {
      var list = visible();
      if (!list.length) return;
      current = (index + list.length) % list.length;
      var fig = list[current];
      var thumb = fig.querySelector("img");
      boxImg.src = fig.querySelector("button").dataset.full;
      boxImg.alt = thumb.alt;
      boxCap.textContent = fig.querySelector("figcaption").textContent +
        "  (" + (current + 1) + " / " + list.length + ")";
    }

    gallery.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-full]");
      if (!btn) return;
      show(visible().indexOf(btn.closest("figure")));
      if (typeof box.showModal === "function") {
        box.showModal();
      } else {
        window.open(btn.dataset.full, "_blank");
      }
    });

    box.querySelector(".lb-close").addEventListener("click", function () { box.close(); });
    box.querySelector(".lb-prev").addEventListener("click", function () { show(current - 1); });
    box.querySelector(".lb-next").addEventListener("click", function () { show(current + 1); });
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.classList.contains("lightbox-inner")) box.close();
    });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
    box.addEventListener("close", function () { boxImg.removeAttribute("src"); });

    // Swipe left / right on touch screens
    var startX = null;
    box.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Contact form ---------- */

  var form = document.getElementById("contact-form");
  if (form) {
    var errorEl = document.getElementById("form-error");

    // Links such as contact.html?purpose=volunteer choose the reason in advance.
    var wanted = new URLSearchParams(location.search).get("purpose");
    if (wanted && form.elements.purpose.querySelector('option[value="' + wanted.replace(/[^a-z]/g, "") + '"]')) {
      form.elements.purpose.value = wanted;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var message = form.elements.message.value.trim();
      if (!name || !message) {
        errorEl.hidden = false;
        (name ? form.elements.message : form.elements.name).focus();
        return;
      }
      errorEl.hidden = true;

      var purpose = form.elements.purpose;
      var phone = form.elements.phone.value.trim();
      var lines = [
        tr("msg.greeting", "Hello Shubh Ashish Welfare Society,"),
        "",
        purpose.options[purpose.selectedIndex].text,
        "",
        message,
        "",
        "- " + name + (phone ? " (" + phone + ")" : "")
      ];
      var text = lines.join("\n");

      var via = e.submitter ? e.submitter.dataset.send : "whatsapp";
      if (via === "email") {
        var subject = tr("msg.subject", "Message from the website") + ": " + name;
        location.href = "mailto:" + form.dataset.email +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(text);
      } else {
        window.open("https://wa.me/" + form.dataset.phone + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      }
    });
  }
})();
