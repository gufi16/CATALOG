(function () {
  if (window.__catalogRuntimeSimpleLoaded) return;
  window.__catalogRuntimeSimpleLoaded = true;

  var STORAGE_KEY = "catalogState";
  var BACKUP_KEY = "catalogProductsBackupV1";
  var currentImages = [];
  var editId = null;

  function $(id) {
    return document.getElementById(id);
  }

  function safeParse(text, fallback) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return fallback;
    }
  }

  function getState() {
    return safeParse(localStorage.getItem(STORAGE_KEY), {}) || {};
  }

  function setState(st) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  }

  function getProducts() {
    var st = getState();
    return Array.isArray(st.products) ? st.products : [];
  }

  function saveProducts(list) {
    var st = getState();
    st.products = list;
    setState(st);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(list));
    window.products = list;
  }

  function restoreProductsFromBackup() {
    var st = getState();
    var current = Array.isArray(st.products) ? st.products : [];
    if (current.length) return current;
    var backup = safeParse(localStorage.getItem(BACKUP_KEY), []);
    if (!Array.isArray(backup) || !backup.length) return current;
    st.products = backup;
    setState(st);
    window.products = backup;
    return backup;
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function tva() {
    var n = Number(window.TVA);
    return isFinite(n) ? n : 21;
  }

  function formatPrice(v, currency) {
    return Number(v || 0).toFixed(2) + " " + (currency || "EUR");
  }

  function ensurePreviewControls() {
    var r = refs();
    if (!r.pdfContainer || !r.pdfContainer.parentNode) return;
    if ($("previewSearchWrap")) return;

    if (typeof window.__previewQuery === "undefined") window.__previewQuery = "";
    if (typeof window.__previewCategory === "undefined") window.__previewCategory = "";

    var wrap = document.createElement("div");
    wrap.id = "previewSearchWrap";
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "8px";
    wrap.style.marginBottom = "8px";

    var catBar = document.createElement("div");
    catBar.id = "previewCategoryBar";
    catBar.style.display = "flex";
    catBar.style.flexWrap = "wrap";
    catBar.style.gap = "6px";

    var categories = [
      { key: "pos-win", label: "POS All in One Windows" },
      { key: "pos-android", label: "POS All in One Android" },
      { key: "imp-termice", label: "Imprimante termice" },
      { key: "imp-etichete", label: "Imprimante etichete" },
      { key: "imp-mobile", label: "Imprimante mobile" },
      { key: "terminal-mobil", label: "Terminal mobil" },
      { key: "consumabile", label: "Consumabile" },
      { key: "scanner", label: "Cititoare coduri de bare" },
      { key: "accesorii", label: "Accesorii" },
      { key: "cantar-verif", label: "Cantar verificare" },
      { key: "cantar-etichete", label: "Cantar etichete" },
      { key: "monitoare-touch", label: "Monitoare touch" },
      { key: "kiosk", label: "Kiosk" }
    ];

    categories.forEach(function (cat) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = cat.label;
      btn.setAttribute("data-cat-key", cat.key);
      btn.style.padding = "4px 10px";
      btn.style.borderRadius = "999px";
      btn.style.border = "1px solid rgba(148,163,184,0.6)";
      btn.style.background = "rgba(15,23,42,0.8)";
      btn.style.color = "#e5e7eb";
      btn.style.fontSize = "11px";
      btn.style.cursor = "pointer";
      btn.onclick = function () {
        window.__previewCategory = window.__previewCategory === cat.key ? "" : cat.key;
        Array.prototype.forEach.call(catBar.querySelectorAll("button[data-cat-key]"), function (b) {
          var active = b.getAttribute("data-cat-key") === window.__previewCategory;
          b.style.background = active ? "#16a34a" : "rgba(15,23,42,0.8)";
          b.style.color = "#ffffff";
          b.style.borderColor = active ? "#16a34a" : "rgba(148,163,184,0.6)";
        });
        window.__previewPage = 1;
        renderPreview();
      };
      catBar.appendChild(btn);
    });

    var input = document.createElement("input");
    input.type = "search";
    input.id = "previewSearchInput";
    input.placeholder = "Caută produs...";
    input.autocomplete = "off";
    input.style.padding = "6px 10px";
    input.style.minWidth = "260px";
    input.style.border = "1px solid #ccc";
    input.style.borderRadius = "6px";
    input.oninput = function () {
      window.__previewQuery = String(input.value || "").trim().toLowerCase();
      window.__previewPage = 1;
      renderPreview();
    };

    wrap.appendChild(catBar);
    wrap.appendChild(input);
    r.pdfContainer.parentNode.insertBefore(wrap, r.pdfContainer);
  }

  function refs() {
    return {
      productName: $("productName"),
      currency: $("currency"),
      productCategory: $("productCategory"),
      priceOne: $("priceOne"),
      priceFew: $("priceFew"),
      priceProj: $("priceProj"),
      productImages: $("productImages"),
      specsTbody: document.querySelector("#specsTable tbody"),
      beneficiar: $("beneficiar"),
      beneficiarEmail: $("beneficiarEmail"),
      addBtn: $("addProductBtn"),
      saveBtn: $("saveEditBtn"),
      cancelBtn: $("cancelEditBtn"),
      resetBtn: $("resetFormBtn"),
      clearBtn: $("clearAllBtn"),
      productList: $("productList"),
      pdfContainer: $("pdfContainer"),
      addModal: $("addFormModal") || $("addProductModal"),
      addHost: $("addFormHost") || $("addProductBody"),
      editModal: $("editProductModalV9") || $("addFormModal") || $("addProductModal"),
      editHost: $("editProductFormContainer") || $("addFormHost") || $("addProductBody")
    };
  }

  function moveForm(host, r) {
    if (!host || !r.productName || !r.clearBtn) return;
    var start = r.productName.previousElementSibling;
    var end = r.clearBtn.closest("div");
    if (!start || !end) return;
    if (host.contains(start) && host.contains(end)) return;

    var frag = document.createDocumentFragment();
    var node = start;
    while (node) {
      var next = node.nextElementSibling;
      frag.appendChild(node);
      if (node === end) break;
      node = next;
    }
    host.appendChild(frag);
  }

  function closeEditors() {
    var ids = ["addFormModal", "addProductModal", "editProductModalV9"];
    ids.forEach(function (id) {
      var modal = $(id);
      if (!modal) return;
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    });
  }

  function setMode(isEdit) {
    var r = refs();
    if (r.addBtn) r.addBtn.style.display = isEdit ? "none" : "inline-block";
    if (r.saveBtn) r.saveBtn.style.display = isEdit ? "inline-block" : "none";
    if (r.cancelBtn) r.cancelBtn.style.display = isEdit ? "inline-block" : "none";
  }

  function focusName(r) {
    if (!r.productName) return;
    var content = r.productName.closest(".modal-content");
    if (content) content.scrollTop = 0;
    r.productName.scrollIntoView({ block: "start", behavior: "auto" });
    setTimeout(function () {
      r.productName.focus();
    }, 20);
  }

  function openAddEditor() {
    var r = refs();
    if (!r.addHost || !r.addModal) return;
    moveForm(r.addHost, r);
    closeEditors();
    setMode(false);
    r.addModal.style.display = "flex";
    r.addModal.setAttribute("aria-hidden", "false");
    focusName(r);
  }

  function openEditEditor(id) {
    var r = refs();
    var product = null;
    getProducts().forEach(function (p) {
      if (String(p.id) === String(id)) product = p;
    });
    if (!product) return;

    editId = product.id;
    currentImages = Array.isArray(product.images) ? product.images.slice() : [];

    if (r.productName) r.productName.value = product.name || "";
    if (r.currency) r.currency.value = product.currency || "EUR";
    if (r.productCategory) r.productCategory.value = product.category || "";
    if (r.priceOne) r.priceOne.value = product.prices && product.prices.one ? (product.prices.one.net || "") : "";
    if (r.priceFew) r.priceFew.value = product.prices && product.prices.few ? (product.prices.few.net || "") : "";
    if (r.priceProj) r.priceProj.value = product.prices && product.prices.proj ? (product.prices.proj.net || "") : "";
    if (r.beneficiar) r.beneficiar.value = product.beneficiar || "";
    if (r.beneficiarEmail) r.beneficiarEmail.value = product.beneficiarEmail || "";

    if (r.specsTbody) {
      r.specsTbody.innerHTML = "";
      var specs = Array.isArray(product.specs) && product.specs.length ? product.specs : [{ car: "", spec: "" }];
      specs.forEach(function (s) {
        var tr = document.createElement("tr");
        tr.innerHTML = '<td><input value="' + (s.car || "") + '" placeholder="Ex: Procesor"/></td><td><input value="' + (s.spec || "") + '" placeholder="Ex: Intel i7"/></td><td><button type="button" class="small js-simple-del-row">Șterge</button></td>';
        r.specsTbody.appendChild(tr);
      });
    }

    if (!r.editHost || !r.editModal) return;
    moveForm(r.editHost, r);
    closeEditors();
    setMode(true);
    r.editModal.style.display = "flex";
    r.editModal.setAttribute("aria-hidden", "false");
    focusName(r);
  }

  function resetForm() {
    var r = refs();
    editId = null;
    currentImages = [];
    if (r.productName) r.productName.value = "";
    if (r.currency) r.currency.value = "EUR";
    if (r.productCategory) r.productCategory.value = "";
    if (r.priceOne) r.priceOne.value = "";
    if (r.priceFew) r.priceFew.value = "";
    if (r.priceProj) r.priceProj.value = "";
    if (r.beneficiar) r.beneficiar.value = "";
    if (r.beneficiarEmail) r.beneficiarEmail.value = "";
    if (r.specsTbody) {
      r.specsTbody.innerHTML = '<tr><td><input placeholder="Ex: Procesor"/></td><td><input placeholder="Ex: Intel i7"/></td><td><button type="button" class="small js-simple-del-row">Șterge</button></td></tr>';
    }
    setMode(false);
  }

  function readForm() {
    var r = refs();
    if (!r.productName) return null;
    var name = r.productName.value.trim();
    if (!name) {
      alert("Completează numele produsului.");
      r.productName.focus();
      return null;
    }

    var p1 = parseFloat(r.priceOne ? r.priceOne.value : "") || 0;
    var p2 = parseFloat(r.priceFew ? r.priceFew.value : "") || 0;
    var p3 = parseFloat(r.priceProj ? r.priceProj.value : "") || 0;
    var specs = [];

    if (r.specsTbody) {
      Array.from(r.specsTbody.querySelectorAll("tr")).forEach(function (tr) {
        var inputs = tr.querySelectorAll("input");
        var car = inputs[0] ? inputs[0].value.trim() : "";
        var spec = inputs[1] ? inputs[1].value.trim() : "";
        if (car && spec) specs.push({ car: car, spec: spec });
      });
    }

    return {
      id: editId || uid(),
      name: name,
      currency: r.currency ? r.currency.value : "EUR",
      category: r.productCategory ? r.productCategory.value : "",
      prices: {
        one: { net: p1, gross: Number((p1 * (1 + tva() / 100)).toFixed(2)) },
        few: { net: p2, gross: Number((p2 * (1 + tva() / 100)).toFixed(2)) },
        proj: { net: p3, gross: Number((p3 * (1 + tva() / 100)).toFixed(2)) }
      },
      images: currentImages.slice(),
      specs: specs,
      beneficiar: r.beneficiar ? r.beneficiar.value.trim() : "",
      beneficiarEmail: r.beneficiarEmail ? r.beneficiarEmail.value.trim() : "",
      vat: tva(),
      date: new Date().toLocaleDateString("ro-RO")
    };
  }

  function renderList() {
    var r = refs();
    if (!r.productList) return;
    r.productList.innerHTML = "";
    getProducts().slice().reverse().forEach(function (p) {
      var row = document.createElement("div");
      row.className = "product-item";
      row.innerHTML = '<span>' + p.name + " - " + formatPrice(p.prices && p.prices.one ? p.prices.one.net : 0, p.currency) + (p.category ? " - " + p.category : "") + '</span><div style="display:flex;gap:6px"><button type="button" class="small js-simple-edit" data-id="' + p.id + '">Editează</button><button type="button" class="small js-simple-delete" data-id="' + p.id + '" style="background:#e74c3c;color:#fff">Șterge</button></div>';
      r.productList.appendChild(row);
    });
  }

  function renderPreview() {
    var r = refs();
    if (!r.pdfContainer) return;
    ensurePreviewControls();
    r.pdfContainer.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "offer-grid";
    var all = getProducts().slice().reverse();
    var q = String(window.__previewQuery || "").toLowerCase();
    var cat = String(window.__previewCategory || "");
    if (q) {
      all = all.filter(function (p) {
        var name = String((p && p.name) || "").toLowerCase();
        var code = String((p && p.id) || "").toLowerCase();
        var price = String((p && p.prices && p.prices.one ? p.prices.one.net : "") || "");
        return name.indexOf(q) !== -1 || code.indexOf(q) !== -1 || price.indexOf(q) !== -1;
      });
    }
    if (cat) {
      all = all.filter(function (p) {
        return String((p && p.category) || "") === cat;
      });
    }

    var perPage = 16;
    window.__previewPage = window.__previewPage || 1;
    var totalPages = Math.max(1, Math.ceil(all.length / perPage));
    if (window.__previewPage > totalPages) window.__previewPage = totalPages;
    var start = (window.__previewPage - 1) * perPage;
    var shown = all.slice(start, start + perPage);

    shown.forEach(function (p) {
      var card = document.createElement("div");
      card.className = "offer-card";
      card.dataset.id = p.id;
      var img = Array.isArray(p.images) && p.images[0] ? '<img src="' + p.images[0] + '"/>' : '<div style="height:90px"></div>';
      card.innerHTML =
        '<button type="button" class="quick-edit-btn js-simple-edit" data-id="' + p.id + '">Editează</button>' +
        img +
        '<h4 style="margin:6px 0;text-align:center">' + p.name + '</h4>' +
        '<div style="font-size:13px;text-align:center">' + formatPrice(p.prices && p.prices.one ? p.prices.one.net : 0, p.currency) + '</div>' +
        (p.category ? '<div style="font-size:11px;color:#64748b;margin-top:4px;text-align:center">' + p.category + '</div>' : "");
      grid.appendChild(card);
    });

    r.pdfContainer.appendChild(grid);

    var pag = document.createElement("div");
    pag.className = "offer-pagination";
    pag.style.display = "flex";
    pag.style.gap = "6px";
    pag.style.justifyContent = "center";
    pag.style.alignItems = "center";
    pag.style.marginTop = "12px";

    function mkBtn(txt, page, disabled, active) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = txt;
      if (active) b.classList.add("active");
      b.disabled = !!disabled;
      b.addEventListener("click", function () {
        window.__previewPage = page;
        renderPreview();
      });
      return b;
    }

    pag.appendChild(mkBtn("«", 1, window.__previewPage === 1, false));
    pag.appendChild(mkBtn("‹", Math.max(1, window.__previewPage - 1), window.__previewPage === 1, false));
    for (var i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - window.__previewPage) <= 2) {
        pag.appendChild(mkBtn(String(i), i, false, i === window.__previewPage));
      } else if (i === window.__previewPage - 3 || i === window.__previewPage + 3) {
        var dots = document.createElement("span");
        dots.textContent = "...";
        pag.appendChild(dots);
      }
    }
    pag.appendChild(mkBtn("›", Math.min(totalPages, window.__previewPage + 1), window.__previewPage === totalPages, false));
    pag.appendChild(mkBtn("»", totalPages, window.__previewPage === totalPages, false));

    var info = document.createElement("span");
    info.textContent = "Pagina " + window.__previewPage + "/" + totalPages + " — " + shown.length + " din " + all.length + " produse";
    info.style.marginLeft = "8px";
    pag.appendChild(info);
    r.pdfContainer.appendChild(pag);
  }

  function renderPreviewDetailed() {
    renderPreview();
  }

  function refresh() {
    renderList();
    renderPreview();
  }

  function saveNewProduct() {
    var product = readForm();
    if (!product) return false;
    var list = getProducts();
    list.push(product);
    saveProducts(list);
    refresh();
    resetForm();
    closeEditors();
    return false;
  }

  function saveEditedProduct() {
    var product = readForm();
    if (!product) return false;
    var list = getProducts().map(function (p) {
      return String(p.id) === String(product.id) ? product : p;
    });
    saveProducts(list);
    refresh();
    resetForm();
    closeEditors();
    return false;
  }

  function bindButtons() {
    var r = refs();
    if (r.addBtn) {
      r.addBtn.onclick = function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        return saveNewProduct();
      };
    }
    if (r.saveBtn) {
      r.saveBtn.onclick = function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        return saveEditedProduct();
      };
    }
    if (r.cancelBtn) {
      r.cancelBtn.onclick = function (e) {
        if (e) e.preventDefault();
        resetForm();
        closeEditors();
        return false;
      };
    }
    if (r.resetBtn) {
      r.resetBtn.onclick = function (e) {
        if (e) e.preventDefault();
        resetForm();
        focusName(refs());
        return false;
      };
    }
  }

  function bindEvents() {
    window.catalogFixSaveNewProduct = saveNewProduct;
    window.catalogFixSaveEditedProduct = saveEditedProduct;
    window.openStableAddEditor = openAddEditor;
    window.openStableEditEditor = openEditEditor;
    window.startEdit = openEditEditor;
    window.renderPreview = renderPreview;
    window.renderPreviewDetailed = renderPreviewDetailed;

    window.addRow = function () {
      var r = refs();
      if (!r.specsTbody) return;
      var tr = document.createElement("tr");
      tr.innerHTML = '<td><input placeholder="Caracteristică"/></td><td><input placeholder="Specificație"/></td><td><button type="button" class="small js-simple-del-row">Șterge</button></td>';
      r.specsTbody.appendChild(tr);
    };

    window.deleteRow = function (btn) {
      var tr = btn && btn.closest ? btn.closest("tr") : null;
      if (tr) tr.remove();
    };

    document.addEventListener("click", function (e) {
      var addTrigger = e.target && e.target.closest ? e.target.closest('[data-target="btnAdaugaProdus"], #btnAdaugaProdus, #openAddFormBtn, #openAddProduct, .open-add-product') : null;
      if (addTrigger) {
        e.preventDefault();
        e.stopPropagation();
        resetForm();
        openAddEditor();
        return;
      }

      var editBtn = e.target && e.target.closest ? e.target.closest(".js-simple-edit") : null;
      if (editBtn) {
        var id = editBtn.getAttribute("data-id");
        if (!id) return;
        e.preventDefault();
        e.stopPropagation();
        openEditEditor(id);
        return;
      }

      var deleteBtn = e.target && e.target.closest ? e.target.closest(".js-simple-delete") : null;
      if (deleteBtn) {
        var delId = deleteBtn.getAttribute("data-id");
        if (!delId) return;
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Ștergi produsul?")) {
          saveProducts(getProducts().filter(function (p) { return String(p.id) !== String(delId); }));
          refresh();
        }
        return;
      }

      var rowDel = e.target && e.target.closest ? e.target.closest(".js-simple-del-row") : null;
      if (rowDel) {
        e.preventDefault();
        var row = rowDel.closest("tr");
        if (row) row.remove();
      }
    }, true);

    var r = refs();
    if (r.productImages) {
      r.productImages.addEventListener("change", function (e) {
        var files = Array.prototype.slice.call((e.target && e.target.files) || []);
        Promise.all(files.map(function (file) {
          return new Promise(function (resolve) {
            var reader = new FileReader();
            reader.onload = function (ev) { resolve(ev.target.result); };
            reader.readAsDataURL(file);
          });
        })).then(function (images) {
          currentImages = images;
        });
      });
    }
  }

  function init() {
    if (!refs().productName || !refs().addBtn) return;
    bindButtons();
    bindEvents();
    ensurePreviewControls();
    restoreProductsFromBackup();
    resetForm();
    saveProducts(restoreProductsFromBackup());
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
