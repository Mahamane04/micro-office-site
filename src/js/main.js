(function () {
  var toggle = document.getElementById("menu-toggle");
  var menu = document.getElementById("mobile-menu");
  var iconOpen = document.getElementById("menu-icon-open");
  var iconClose = document.getElementById("menu-icon-close");

  if (!toggle || !menu) return;

  toggle.addEventListener("click", function () {
    var expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    menu.classList.toggle("hidden");
    iconOpen.classList.toggle("hidden");
    iconClose.classList.toggle("hidden");
  });

  menu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      menu.classList.add("hidden");
      toggle.setAttribute("aria-expanded", "false");
      iconOpen.classList.remove("hidden");
      iconClose.classList.add("hidden");
    });
  });
})();

(function () {
  var grid = document.getElementById("portfolio-grid");
  if (!grid) return;

  var buttons = document.querySelectorAll(".filter-btn");
  var sortSelect = document.getElementById("portfolio-sort");
  var emptyMsg = document.getElementById("portfolio-empty");
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".portfolio-card"));
  var activeFilter = "all";

  function applyState() {
    var visible = 0;
    var sorted = cards.slice();
    var mode = sortSelect ? sortSelect.value : "default";
    sorted.sort(function (a, b) {
      if (mode === "az") return a.dataset.title.localeCompare(b.dataset.title, "fr");
      if (mode === "client") return a.dataset.client.localeCompare(b.dataset.client, "fr");
      return Number(a.dataset.index) - Number(b.dataset.index);
    });
    sorted.forEach(function (card) {
      grid.appendChild(card);
      var show = activeFilter === "all" || card.dataset.category === activeFilter;
      card.classList.toggle("hidden", !show);
      if (show) visible++;
    });
    if (emptyMsg) emptyMsg.classList.toggle("hidden", visible > 0);
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      activeFilter = btn.dataset.filter;
      buttons.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle("is-active", active);
        b.classList.toggle("border-ink", active);
        b.classList.toggle("border-ink/20", !active);
        b.classList.toggle("text-ink/70", !active);
      });
      applyState();
    });
  });

  if (sortSelect) sortSelect.addEventListener("change", applyState);
})();

/* Custom sort dropdown (styled replacement for native <select>) */
(function () {
  var dd = document.querySelector("[data-sort-dd]");
  if (!dd) return;

  var trigger = dd.querySelector("[data-sort-trigger]");
  var label = dd.querySelector("[data-sort-label]");
  var options = Array.prototype.slice.call(dd.querySelectorAll("[data-sort-option]"));
  var select = document.getElementById("portfolio-sort");

  function open() {
    dd.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  }
  function close() {
    dd.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  }

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    dd.classList.contains("is-open") ? close() : open();
  });

  options.forEach(function (opt) {
    opt.addEventListener("click", function () {
      options.forEach(function (o) { o.removeAttribute("data-current"); });
      opt.setAttribute("data-current", "");
      label.textContent = opt.getAttribute("data-sort-label") || opt.textContent.trim();
      if (select) {
        select.value = opt.getAttribute("data-value");
        select.dispatchEvent(new Event("change"));
      }
      close();
    });
  });

  document.addEventListener("click", function (e) {
    if (!dd.contains(e.target)) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();

(function () {
  var form = document.getElementById("project-form");
  var success = document.getElementById("project-form-success");
  var whatsappLink = document.getElementById("whatsapp-continue");
  if (!form || !success) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data = new FormData(form);

    fetch(form.action, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    })
      .then(function () {
        if (whatsappLink) {
          var besoin = data.get("Type de besoin") || "";
          var nom = data.get("Nom") || "";
          var message =
            "Bonjour Micro Office, je viens de vous transmettre une demande de projet" +
            (besoin ? " (" + besoin + ")" : "") +
            (nom ? " au nom de " + nom : "") +
            ".";
          var base = whatsappLink.href.split("?")[0];
          whatsappLink.href = base + "?text=" + encodeURIComponent(message);
        }
        form.classList.add("hidden");
        success.classList.remove("hidden");
        success.scrollIntoView({ behavior: "smooth", block: "start" });
      })
      .catch(function () {
        form.submit();
      });
  });
})();

/* ============ Boutique — devise automatique par pays ============ */
(function () {
  var shop = window.MO_SHOP;
  if (!shop || !shop.devises) return;

  var byCode = {};
  shop.devises.forEach(function (d) { byCode[d.code] = d; });
  var paysMap = {};
  (shop.paysVersDevise || []).forEach(function (m) { paysMap[m.pays] = m.devise; });

  var STORAGE = "mo_currency";

  function isValid(code) { return !!(code && byCode[code]); }

  function current() {
    var c = null;
    try { c = localStorage.getItem(STORAGE); } catch (e) {}
    return isValid(c) ? c : shop.deviseParDefaut;
  }

  function persist(code) {
    try { localStorage.setItem(STORAGE, code); } catch (e) {}
  }

  function format(xof, code) {
    var d = byCode[code] || byCode[shop.deviseParDefaut];
    if (!d) return String(xof);
    var dec = d.decimales || 0;
    var val = Number(xof) * d.taux;
    var num = dec === 0 ? Math.round(val) : Math.round(val * Math.pow(10, dec)) / Math.pow(10, dec);
    var str;
    try {
      str = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(num);
    } catch (e) { str = String(num); }
    return d.position === "before" ? (d.symbole + " " + str) : (str + " " + d.symbole);
  }

  function render() {
    var code = current();
    document.querySelectorAll("[data-price-xof]").forEach(function (el) {
      var xof = el.getAttribute("data-price-xof");
      if (xof === null || xof === "") return;
      el.textContent = format(xof, code);
    });
    document.querySelectorAll("[data-currency-label]").forEach(function (el) { el.textContent = code; });
    document.querySelectorAll("[data-currency-option]").forEach(function (opt) {
      if (opt.getAttribute("data-currency-option") === code) opt.setAttribute("data-current", "");
      else opt.removeAttribute("data-current");
    });
    document.dispatchEvent(new CustomEvent("mo:currency", { detail: { code: code } }));
  }

  function setCurrency(code, save) {
    if (!isValid(code)) return;
    if (save !== false) persist(code);
    render();
  }

  function detect() {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE); } catch (e) {}
    if (isValid(stored)) { render(); return; }
    render(); // show default immediately, then refine
    fetch("https://get.geojs.io/v1/ip/country.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var country = data && data.country ? String(data.country).toUpperCase() : null;
        var code = country && paysMap[country] ? paysMap[country]
                 : country ? shop.deviseInternationale : shop.deviseParDefaut;
        setCurrency(code, true);
      })
      .catch(function () {
        try {
          var region = (navigator.language || "").split("-")[1];
          if (region && paysMap[region.toUpperCase()]) setCurrency(paysMap[region.toUpperCase()], true);
        } catch (e) {}
      });
  }

  // Currency switcher dropdown(s)
  document.querySelectorAll("[data-currency-dd]").forEach(function (dd) {
    var trigger = dd.querySelector("[data-currency-trigger]");
    if (trigger) {
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        dd.classList.toggle("is-open");
      });
    }
    dd.querySelectorAll("[data-currency-option]").forEach(function (opt) {
      opt.addEventListener("click", function () {
        setCurrency(opt.getAttribute("data-currency-option"), true);
        dd.classList.remove("is-open");
      });
    });
    document.addEventListener("click", function (e) { if (!dd.contains(e.target)) dd.classList.remove("is-open"); });
  });

  window.MOCurrency = { current: current, set: setCurrency, format: format, render: render };
  detect();
})();

/* ============ Boutique — filtres & tri du catalogue ============ */
(function () {
  var grid = document.getElementById("boutique-grid");
  if (!grid) return;

  var filterBtns = document.querySelectorAll("[data-shop-filter]");
  var emptyMsg = document.getElementById("boutique-empty");
  var cards = Array.prototype.slice.call(grid.querySelectorAll(".product-card"));
  var activeFilter = "all";
  var sortMode = "featured";
  var query = "";

  function apply() {
    var visible = 0;
    var sorted = cards.slice();
    sorted.sort(function (a, b) {
      if (sortMode === "price-asc") return Number(a.dataset.price) - Number(b.dataset.price);
      if (sortMode === "price-desc") return Number(b.dataset.price) - Number(a.dataset.price);
      if (sortMode === "az") return a.dataset.name.localeCompare(b.dataset.name, "fr");
      // featured: mis en avant d'abord, puis ordre d'origine
      var fa = Number(b.dataset.featured) - Number(a.dataset.featured);
      if (fa !== 0) return fa;
      return Number(a.dataset.index) - Number(b.dataset.index);
    });
    sorted.forEach(function (card) {
      grid.appendChild(card);
      var matchCat = activeFilter === "all" || card.dataset.category === activeFilter;
      var matchSearch = !query || (card.dataset.search || "").indexOf(query) !== -1;
      var show = matchCat && matchSearch;
      card.classList.toggle("hidden", !show);
      if (show) visible++;
    });
    if (emptyMsg) emptyMsg.classList.toggle("hidden", visible > 0);
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      activeFilter = btn.dataset.shopFilter;
      filterBtns.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle("is-active", active);
        b.classList.toggle("border-ink", active);
        b.classList.toggle("border-ink/20", !active);
        b.classList.toggle("text-ink/70", !active);
      });
      apply();
    });
  });

  var sortDd = document.querySelector("[data-shop-sort-dd]");
  if (sortDd) {
    var trigger = sortDd.querySelector("[data-shop-sort-trigger]");
    var label = sortDd.querySelector("[data-shop-sort-label]");
    var opts = Array.prototype.slice.call(sortDd.querySelectorAll("[data-shop-sort-option]"));
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      sortDd.classList.toggle("is-open");
    });
    opts.forEach(function (opt) {
      opt.addEventListener("click", function () {
        sortMode = opt.getAttribute("data-shop-sort-option");
        opts.forEach(function (o) { o.removeAttribute("data-current"); });
        opt.setAttribute("data-current", "");
        if (label) label.textContent = opt.getAttribute("data-shop-sort-label-text");
        sortDd.classList.remove("is-open");
        apply();
      });
    });
    document.addEventListener("click", function (e) { if (!sortDd.contains(e.target)) sortDd.classList.remove("is-open"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") sortDd.classList.remove("is-open"); });
  }

  var searchInput = document.querySelector("[data-shop-search]");
  if (searchInput) searchInput.addEventListener("input", function () { query = searchInput.value.trim().toLowerCase(); apply(); });

  apply();
})();

/* ============ Boutique — panier, favoris & fiche produit ============ */
(function () {
  var CART_KEY = "mo_cart";
  var WISH_KEY = "mo_wishlist";

  function read(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
  function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function fmt(xof) {
    if (window.MOCurrency) return window.MOCurrency.format(xof, window.MOCurrency.current());
    return new Intl.NumberFormat("fr-FR").format(Math.round(xof)) + " FCFA";
  }

  var cart = read(CART_KEY);
  function keyOf(it) { return it.slug + "|" + (it.taille || "") + "|" + (it.couleur || ""); }
  function saveCart() { write(CART_KEY, cart); renderCount(); renderDrawer(); }

  function addToCart(item) {
    var k = keyOf(item), found = null;
    cart.forEach(function (it) { if (keyOf(it) === k) found = it; });
    if (found) found.qty += item.qty; else cart.push(item);
    saveCart();
    openDrawer();
  }
  function count() { return cart.reduce(function (n, it) { return n + it.qty; }, 0); }
  function subtotal() { return cart.reduce(function (s, it) { return s + it.prixXof * it.qty; }, 0); }

  function renderCount() {
    var n = count();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = n;
      el.classList.toggle("hidden", n === 0);
      el.classList.toggle("inline-flex", n > 0);
    });
  }

  var drawer = document.querySelector("[data-cart-drawer]");
  var itemsBox = drawer && drawer.querySelector("[data-cart-items]");
  var emptyBox = drawer && drawer.querySelector("[data-cart-empty]");
  var footer = drawer && drawer.querySelector("[data-cart-footer]");
  var subtotalEl = drawer && drawer.querySelector("[data-cart-subtotal]");

  function renderDrawer() {
    if (!drawer) return;
    if (!cart.length) {
      itemsBox.innerHTML = "";
      emptyBox.classList.remove("hidden");
      footer.classList.add("hidden");
      return;
    }
    emptyBox.classList.add("hidden");
    footer.classList.remove("hidden");
    itemsBox.innerHTML = cart.map(function (it, i) {
      var variant = [it.couleur, it.taille].filter(Boolean).join(" · ");
      return '<div class="flex gap-3 border-b border-ink/10 py-4">' +
        '<div class="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-2xl border border-ink/10 bg-white"><img src="' + it.image + '" alt="" class="h-full w-full object-contain p-1"></div>' +
        '<div class="min-w-0 flex-1">' +
          '<p class="truncate font-heading text-sm font-semibold">' + it.nom + '</p>' +
          (variant ? '<p class="mt-0.5 text-xs text-ink/50">' + variant + '</p>' : '') +
          '<p class="mt-1 font-heading text-sm font-bold">' + fmt(it.prixXof * it.qty) + '</p>' +
          '<div class="mt-2 flex items-center gap-3">' +
            '<div class="inline-flex items-center rounded-full border border-ink/20 text-sm">' +
              '<button type="button" class="flex h-7 w-7 items-center justify-center" data-cart-dec="' + i + '" aria-label="Diminuer">−</button>' +
              '<span class="w-6 text-center">' + it.qty + '</span>' +
              '<button type="button" class="flex h-7 w-7 items-center justify-center" data-cart-inc="' + i + '" aria-label="Augmenter">+</button>' +
            '</div>' +
            '<button type="button" class="text-xs text-ink/40 hover:text-red" data-cart-remove="' + i + '">Retirer</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join("");
    if (subtotalEl) { subtotalEl.setAttribute("data-price-xof", subtotal()); subtotalEl.textContent = fmt(subtotal()); }
  }

  function openDrawer() { if (drawer) { drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; } }
  function closeDrawer() { if (drawer) { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; } }

  if (drawer) {
    drawer.addEventListener("click", function (e) {
      var t = e.target.closest("[data-cart-inc],[data-cart-dec],[data-cart-remove],[data-cart-close],[data-cart-clear]");
      if (!t) return;
      if (t.hasAttribute("data-cart-close")) { closeDrawer(); return; }
      if (t.hasAttribute("data-cart-clear")) { cart = []; saveCart(); return; }
      var i;
      if (t.hasAttribute("data-cart-inc")) { i = +t.getAttribute("data-cart-inc"); cart[i].qty++; saveCart(); }
      else if (t.hasAttribute("data-cart-dec")) { i = +t.getAttribute("data-cart-dec"); cart[i].qty--; if (cart[i].qty < 1) cart.splice(i, 1); saveCart(); }
      else if (t.hasAttribute("data-cart-remove")) { i = +t.getAttribute("data-cart-remove"); cart.splice(i, 1); saveCart(); }
    });
  }

  document.querySelectorAll("[data-cart-toggle]").forEach(function (b) { b.addEventListener("click", openDrawer); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  // Card "add" buttons
  document.querySelectorAll("[data-add]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (btn.getAttribute("data-needs-variant") === "1") {
        window.location.href = "/boutique/" + btn.getAttribute("data-add") + "/";
        return;
      }
      addToCart({
        slug: btn.getAttribute("data-add"), nom: btn.getAttribute("data-nom"),
        prixXof: Number(btn.getAttribute("data-prix")), image: btn.getAttribute("data-image"),
        taille: "", couleur: "", qty: 1
      });
    });
  });

  // Wishlist (favoris)
  var wish = read(WISH_KEY);
  function renderWish() {
    document.querySelectorAll("[data-fav]").forEach(function (b) {
      var on = wish.indexOf(b.getAttribute("data-fav")) !== -1;
      if (on) b.setAttribute("data-active", ""); else b.removeAttribute("data-active");
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  document.querySelectorAll("[data-fav]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      var slug = b.getAttribute("data-fav"), idx = wish.indexOf(slug);
      if (idx === -1) wish.push(slug); else wish.splice(idx, 1);
      write(WISH_KEY, wish); renderWish();
    });
  });
  renderWish();

  // Product detail interactions
  var detail = document.querySelector("[data-product-detail]");
  if (detail) {
    var selSize = null, selColor = null;
    var sizeGroup = detail.querySelector("[data-size-group]");
    var colorGroup = detail.querySelector("[data-color-group]");
    var qtyEl = detail.querySelector("[data-qty]");
    var sizeError = detail.querySelector("[data-size-error]");

    if (colorGroup) {
      var markColor = function (active) {
        colorGroup.querySelectorAll("[data-color]").forEach(function (b) { b.classList.remove("border-ink"); b.classList.add("border-ink/15"); });
        active.classList.remove("border-ink/15"); active.classList.add("border-ink");
      };
      var firstColor = colorGroup.querySelector("[data-color]:not([disabled])");
      if (firstColor) { selColor = firstColor.getAttribute("data-color"); markColor(firstColor); }
      colorGroup.querySelectorAll("[data-color]").forEach(function (b) {
        b.addEventListener("click", function () { selColor = b.getAttribute("data-color"); markColor(b); });
      });
    }
    if (sizeGroup) {
      sizeGroup.querySelectorAll("[data-size]").forEach(function (b) {
        b.addEventListener("click", function () {
          selSize = b.getAttribute("data-size");
          sizeGroup.querySelectorAll("[data-size]").forEach(function (x) { x.removeAttribute("data-selected"); });
          b.setAttribute("data-selected", "");
          if (sizeError) sizeError.classList.add("hidden");
        });
      });
    }
    var getQty = function () { return Math.max(1, parseInt(qtyEl.textContent, 10) || 1); };
    detail.querySelector("[data-qty-plus]").addEventListener("click", function () { qtyEl.textContent = getQty() + 1; });
    detail.querySelector("[data-qty-minus]").addEventListener("click", function () { qtyEl.textContent = Math.max(1, getQty() - 1); });

    var collect = function () {
      if (sizeGroup && !selSize) { if (sizeError) sizeError.classList.remove("hidden"); return null; }
      return {
        slug: detail.getAttribute("data-slug"), nom: detail.getAttribute("data-nom"),
        prixXof: Number(detail.getAttribute("data-prix")), image: detail.getAttribute("data-image"),
        taille: selSize || "", couleur: selColor || "", qty: getQty()
      };
    };
    var addBtn = detail.querySelector("[data-add-detail]");
    if (addBtn) addBtn.addEventListener("click", function () { var it = collect(); if (it) addToCart(it); });
    var waBtn = detail.querySelector("[data-order-whatsapp]");
    if (waBtn) waBtn.addEventListener("click", function () {
      var it = collect(); if (!it) return;
      var variant = [it.couleur, it.taille].filter(Boolean).join(", ");
      var msg = "Bonjour Micro Office, je souhaite commander :\n\n" +
        "• " + it.nom + (variant ? " (" + variant + ")" : "") + " × " + it.qty + "\n" +
        "Prix : " + fmt(it.prixXof) + " l'unité\n\nMerci de me confirmer la disponibilité et la livraison.";
      window.open("https://wa.me/" + (window.MO_WHATSAPP || "") + "?text=" + encodeURIComponent(msg), "_blank");
    });
  }

  renderCount();
  renderDrawer();
  document.addEventListener("mo:currency", renderDrawer);
  window.MOCart = { items: function () { return cart; }, subtotal: subtotal, clear: function () { cart = []; saveCart(); }, open: openDrawer };
})();

/* ============ Boutique — tunnel de commande (checkout) ============ */
(function () {
  var root = document.querySelector("[data-checkout]");
  if (!root) return;

  function fmt(xof) {
    if (window.MOCurrency) return window.MOCurrency.format(xof, window.MOCurrency.current());
    return new Intl.NumberFormat("fr-FR").format(Math.round(xof)) + " FCFA";
  }
  function cartItems() { return window.MOCart ? window.MOCart.items() : []; }
  function subtotal() { return window.MOCart ? window.MOCart.subtotal() : 0; }

  var items = cartItems();
  if (!items.length) {
    root.classList.add("hidden");
    var empty = document.querySelector("[data-checkout-empty]");
    if (empty) empty.classList.remove("hidden");
    return;
  }

  var ref = "MO-" + Date.now().toString(36).toUpperCase();
  var refField = root.querySelector("[data-order-ref-field]");
  if (refField) refField.value = ref;

  var itemsBox = root.querySelector("[data-checkout-items]");
  var subEl = root.querySelector("[data-checkout-subtotal]");
  var delEl = root.querySelector("[data-checkout-delivery]");
  var totalEl = root.querySelector("[data-checkout-total]");
  var deliveryRadios = root.querySelectorAll("[data-delivery]");

  function currentDelivery() {
    var checked = root.querySelector("[data-delivery]:checked");
    if (!checked) return { nom: "", frais: null };
    var f = checked.getAttribute("data-frais");
    return { nom: checked.value, frais: f === "" ? null : Number(f) };
  }

  function render() {
    itemsBox.innerHTML = items.map(function (it) {
      var variant = [it.couleur, it.taille].filter(Boolean).join(" · ");
      return '<div class="flex items-start justify-between gap-3 text-sm">' +
        '<span class="min-w-0"><span class="font-semibold">' + it.qty + '× ' + it.nom + '</span>' +
        (variant ? '<span class="block text-ink/50">' + variant + '</span>' : '') + '</span>' +
        '<span class="whitespace-nowrap font-semibold">' + fmt(it.prixXof * it.qty) + '</span></div>';
    }).join("");
    var sub = subtotal();
    var del = currentDelivery();
    subEl.textContent = fmt(sub);
    delEl.textContent = del.frais === null ? "Sur devis" : fmt(del.frais);
    totalEl.textContent = del.frais === null ? (fmt(sub) + " + livraison") : fmt(sub + del.frais);
  }

  deliveryRadios.forEach(function (r) { r.addEventListener("change", render); });
  document.addEventListener("mo:currency", render);
  render();

  function orderLines() {
    return items.map(function (it) {
      var variant = [it.couleur, it.taille].filter(Boolean).join(", ");
      return "• " + it.nom + (variant ? " (" + variant + ")" : "") + " × " + it.qty + " — " + fmt(it.prixXof * it.qty);
    }).join("\n");
  }

  function summaryText() {
    var del = currentDelivery();
    var sub = subtotal();
    var lines = "Commande " + ref + "\n\n" + orderLines() + "\n\n";
    lines += "Sous-total : " + fmt(sub) + "\n";
    lines += "Livraison (" + del.nom + ") : " + (del.frais === null ? "sur devis" : fmt(del.frais)) + "\n";
    lines += "Total : " + (del.frais === null ? fmt(sub) + " + livraison" : fmt(sub + del.frais)) + "\n";
    return lines;
  }

  var form = document.getElementById("order-form");
  function val(name) { var el = form.querySelector('[name="' + name + '"]'); return el ? el.value.trim() : ""; }
  function requireFields() {
    var ok = true;
    ["Nom", "Téléphone", "Adresse"].forEach(function (n) {
      var el = form.querySelector('[name="' + n + '"]');
      if (el && !el.value.trim()) { el.reportValidity(); ok = false; }
    });
    return ok;
  }
  function paymentChoice() { var el = form.querySelector('[name="Paiement"]:checked'); return el ? el.value : ""; }

  function clientBlock() {
    return "Client : " + val("Nom") + "\n" +
      "Téléphone : " + val("Téléphone") + (val("WhatsApp") ? "\nWhatsApp : " + val("WhatsApp") : "") +
      (val("E-mail") ? "\nE-mail : " + val("E-mail") : "") +
      "\nAdresse : " + val("Adresse") + (val("Note") ? "\nNote : " + val("Note") : "") +
      "\nPaiement : " + paymentChoice();
  }

  // Enregistrement de la commande dans la base (via fonction serverless)
  function orderPayload(canal) {
    var del = currentDelivery();
    var sub = subtotal();
    return {
      reference: ref,
      canal: canal,
      devise: window.MOCurrency ? window.MOCurrency.current() : "XOF",
      client: { nom: val("Nom"), tel: val("Téléphone"), whatsapp: val("WhatsApp"), email: val("E-mail"), adresse: val("Adresse"), note: val("Note") },
      livraison: { zone: del.nom, frais: del.frais },
      paiement: paymentChoice(),
      articles: items.map(function (it) { return { slug: it.slug, nom: it.nom, taille: it.taille, couleur: it.couleur, qty: it.qty, prixXof: it.prixXof }; }),
      sousTotalXof: sub,
      totalXof: del.frais === null ? sub : sub + del.frais
    };
  }
  function saveOrder(canal) {
    try {
      return fetch("/.netlify/functions/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload(canal))
      }).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  }
  function finish() {
    if (window.MOCart) window.MOCart.clear();
    sessionStorage.setItem("mo_last_ref", ref);
    sessionStorage.setItem("mo_last_tel", val("Téléphone"));
    window.location.href = "/commande-confirmee/";
  }

  // WhatsApp order
  var waBtn = root.querySelector("[data-order-whatsapp-checkout]");
  if (waBtn) waBtn.addEventListener("click", function () {
    if (!requireFields()) return;
    var msg = "Bonjour Micro Office, voici ma commande :\n\n" + summaryText() + "\n" + clientBlock();
    saveOrder("whatsapp");
    window.open("https://wa.me/" + (window.MO_WHATSAPP || "") + "?text=" + encodeURIComponent(msg), "_blank");
    finish();
  });

  // Formspree (e-mail) order
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!requireFields()) return;
    var summaryField = form.querySelector("[data-order-summary-field]");
    if (summaryField) summaryField.value = summaryText() + "\n" + clientBlock();
    var data = new FormData(form);
    saveOrder("formulaire");
    fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function () { finish(); })
      .catch(function () { form.submit(); });
  });
})();

/* ============ Confirmation — afficher la référence ============ */
(function () {
  var box = document.querySelector("[data-order-ref-display]");
  if (!box) return;
  var ref = null;
  try { ref = sessionStorage.getItem("mo_last_ref"); } catch (e) {}
  if (ref) {
    box.querySelector("span").textContent = ref;
    box.classList.remove("hidden");
  }
})();

/* ============ Boutique — suivi de commande ============ */
(function () {
  var form = document.getElementById("track-form");
  if (!form) return;

  var ORDER = ["reçue", "confirmée", "préparation", "expédiée", "livrée"];
  var refInput = form.querySelector('[name="reference"]');
  var telInput = form.querySelector('[name="tel"]');
  var errorBox = document.querySelector("[data-track-error]");
  var result = document.querySelector("[data-track-result]");
  var refOut = document.querySelector("[data-track-ref]");
  var metaOut = document.querySelector("[data-track-meta]");
  var cancelled = document.querySelector("[data-track-cancelled]");
  var steps = Array.prototype.slice.call(document.querySelectorAll("[data-track-steps] [data-step]"));

  function fmt(xof) {
    if (window.MOCurrency) return window.MOCurrency.format(xof, window.MOCurrency.current());
    return new Intl.NumberFormat("fr-FR").format(Math.round(xof)) + " FCFA";
  }

  function paint(statut, data) {
    errorBox.classList.add("hidden");
    result.classList.remove("hidden");
    refOut.textContent = data.reference || refInput.value.toUpperCase();
    var meta = [];
    if (data.created_at) meta.push(new Date(data.created_at).toLocaleDateString("fr-FR"));
    if (data.livraison_zone) meta.push(data.livraison_zone);
    if (data.total_xof) meta.push(fmt(data.total_xof));
    metaOut.textContent = meta.join(" · ");

    var isCancelled = statut === "annulée";
    cancelled.classList.toggle("hidden", !isCancelled);
    var currentIdx = ORDER.indexOf(statut);

    steps.forEach(function (li, i) {
      var dot = li.querySelector(".track-dot");
      var label = li.querySelector("span:last-child");
      var done = !isCancelled && currentIdx >= 0 && i <= currentIdx;
      dot.classList.toggle("border-red", done);
      dot.classList.toggle("bg-red", done);
      dot.classList.toggle("text-white", done);
      dot.classList.toggle("border-ink/15", !done);
      dot.classList.toggle("text-ink/30", !done);
      label.classList.toggle("text-ink", done);
      label.classList.toggle("text-ink/50", !done);
    });
  }

  function track(reference, tel) {
    errorBox.classList.add("hidden");
    fetch("/.netlify/functions/track-order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: reference, tel: tel })
    })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
      .then(function (res) {
        if (res.d && res.d.ok) { paint(res.d.statut, res.d); }
        else {
          result.classList.add("hidden");
          errorBox.textContent = (res.d && res.d.error) || "Commande introuvable. Vérifiez la référence et le téléphone.";
          errorBox.classList.remove("hidden");
        }
      })
      .catch(function () {
        result.classList.add("hidden");
        errorBox.textContent = "Service de suivi momentanément indisponible. Réessayez plus tard.";
        errorBox.classList.remove("hidden");
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    track(refInput.value.trim(), telInput.value.trim());
  });

  // Pré-remplissage depuis une commande récente
  try {
    var lastRef = sessionStorage.getItem("mo_last_ref");
    var lastTel = sessionStorage.getItem("mo_last_tel");
    if (lastRef) refInput.value = lastRef;
    if (lastTel) telInput.value = lastTel;
    if (lastRef && lastTel) track(lastRef, lastTel);
  } catch (e) {}
})();

/* ============ Boutique — mini-admin des commandes ============ */
(function () {
  var root = document.querySelector("[data-admin]");
  if (!root) return;

  var STATUTS = ["reçue", "confirmée", "préparation", "expédiée", "livrée", "annulée"];
  var loginForm = root.querySelector("[data-admin-login]");
  var errorEl = root.querySelector("[data-admin-error]");
  var panel = root.querySelector("[data-admin-panel]");
  var listEl = root.querySelector("[data-admin-list]");
  var countEl = root.querySelector("[data-admin-count]");
  var pass = "";

  function fmt(xof) {
    return new Intl.NumberFormat("fr-FR").format(Math.round(xof || 0)) + " FCFA";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function statusOptions(current) {
    return STATUTS.map(function (s) {
      return '<option value="' + s + '"' + (s === current ? " selected" : "") + ">" + s + "</option>";
    }).join("");
  }

  function renderList(commandes) {
    countEl.textContent = commandes.length;
    listEl.innerHTML = commandes.map(function (c) {
      var arts = (c.articles || []).map(function (a) {
        var v = [a.couleur, a.taille].filter(Boolean).join(" · ");
        return a.qty + "× " + esc(a.nom) + (v ? " (" + esc(v) + ")" : "");
      }).join("<br>");
      var date = c.created_at ? new Date(c.created_at).toLocaleString("fr-FR") : "";
      return '<div class="rounded-2xl border border-ink/10 bg-white p-4">' +
        '<div class="flex flex-wrap items-start justify-between gap-3">' +
          '<div><p class="font-heading font-bold">' + esc(c.reference) + '</p>' +
          '<p class="tag-mono text-ink/40">' + esc(date) + ' · ' + esc(c.canal || "") + '</p></div>' +
          '<select class="rounded-full border border-ink/20 bg-white px-3 py-2 font-mono text-[11px] uppercase tracking-wider focus:border-red focus:outline-none" data-status-select data-ref="' + esc(c.reference) + '">' + statusOptions(c.statut) + '</select>' +
        '</div>' +
        '<div class="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">' +
          '<p><span class="text-ink/50">Client :</span> ' + esc(c.client_nom) + ' — ' + esc(c.client_tel) + '</p>' +
          '<p><span class="text-ink/50">Livraison :</span> ' + esc(c.livraison_zone || "—") + ' · ' + esc(c.paiement_mode || "—") + '</p>' +
          '<p class="sm:col-span-2"><span class="text-ink/50">Articles :</span><br>' + arts + '</p>' +
          '<p><span class="text-ink/50">Total :</span> <span class="font-semibold">' + fmt(c.total_xof) + '</span></p>' +
          (c.adresse ? '<p class="sm:col-span-2"><span class="text-ink/50">Adresse :</span> ' + esc(c.adresse) + '</p>' : '') +
        '</div>' +
      '</div>';
    }).join("");

    listEl.querySelectorAll("[data-status-select]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var prev = sel.getAttribute("data-prev") || "";
        fetch("/.netlify/functions/update-order", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: sel.getAttribute("data-ref"), statut: sel.value, password: pass })
        })
          .then(function (r) { return r.json(); })
          .then(function (d) { if (!d.ok) { alert(d.error || "Erreur"); if (prev) sel.value = prev; } })
          .catch(function () { alert("Mise à jour impossible."); });
      });
      sel.setAttribute("data-prev", sel.value);
    });
  }

  function load() {
    fetch("/.netlify/functions/list-orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass })
    })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
      .then(function (res) {
        if (res.d && res.d.ok) {
          loginForm.classList.add("hidden");
          panel.classList.remove("hidden");
          renderList(res.d.commandes || []);
        } else {
          errorEl.textContent = (res.d && res.d.error) || "Accès refusé.";
          errorEl.classList.remove("hidden");
        }
      })
      .catch(function () {
        errorEl.textContent = "Service indisponible.";
        errorEl.classList.remove("hidden");
      });
  }

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    pass = loginForm.querySelector("#a-pass").value;
    errorEl.classList.add("hidden");
    load();
  });
  root.querySelector("[data-admin-refresh]").addEventListener("click", load);
})();

/* ============ Boutique — stock temps réel ============ */
(function () {
  var cards = document.querySelectorAll(".product-card[data-slug]");
  var detail = document.querySelector("[data-product-detail][data-slug]");
  if (!cards.length && !detail) return;

  fetch("/.netlify/functions/get-stock")
    .then(function (r) { return r.json(); })
    .then(function (res) {
      var stock = (res && res.stock) || {};

      cards.forEach(function (card) {
        var qty = stock[card.getAttribute("data-slug")];
        if (qty === undefined) return;
        var out = card.querySelector("[data-stock-out]");
        var hint = card.querySelector("[data-stock-hint]");
        var addBtn = card.querySelector("[data-add]");
        if (qty <= 0) {
          if (out) out.classList.remove("hidden");
          if (addBtn) addBtn.setAttribute("disabled", "");
          if (hint) hint.classList.add("hidden");
        } else if (qty <= 5) {
          if (hint) { hint.textContent = "Plus que " + qty + " en stock"; hint.classList.remove("hidden"); }
        }
      });

      if (detail) {
        var qty = stock[detail.getAttribute("data-slug")];
        if (qty === undefined) return;
        var msg = detail.querySelector("[data-detail-stock]");
        var add = detail.querySelector("[data-add-detail]");
        var wa = detail.querySelector("[data-order-whatsapp]");
        if (qty <= 0) {
          if (add) add.setAttribute("disabled", "");
          if (wa) wa.setAttribute("disabled", "");
          if (msg) { msg.textContent = "Article en rupture de stock"; msg.classList.remove("hidden"); }
        } else if (qty <= 5) {
          if (msg) { msg.textContent = "Plus que " + qty + " en stock"; msg.classList.remove("hidden"); }
        }
      }
    })
    .catch(function () {});
})();
