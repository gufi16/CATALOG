(function () {
  if (window.__catalogEmergencySaveLoaded) return;
  window.__catalogEmergencySaveLoaded = true;

  var STORAGE_KEY = "catalogState";
  var BACKUP_KEY = "catalogProductsBackupV1";
  var lastBoundAdd = null;
  var lastBoundSave = null;
  var currentImages = [];

  function $(id) {
    return document.getElementById(id);
  }

  function safeParse(text, fallback) {
    try { return JSON.parse(text); } catch (e) { return fallback; }
  }

  function getState() {
    return safeParse(localStorage.getItem(STORAGE_KEY), {}) || {};
  }

  function setState(st) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  }

  function getProducts() {
    var st = getState();
    if (Array.isArray(st.products)) return st.products;
    var backup = safeParse(localStorage.getItem(BACKUP_KEY), []);
    return Array.isArray(backup) ? backup : [];
  }

  function saveProducts(list) {
    var st = getState();
    st.products = list;
    setState(st);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(list));
    localStorage.setItem("products", JSON.stringify(list));
    window.products = list;
    try {
      window.eval("products = JSON.parse(localStorage.getItem('catalogState') || '{}').products || [];");
    } catch (e) {}
    try {
      if (typeof window.syncProductCaches === "function") {
        window.syncProductCaches();
      }
    } catch (e) {}
    try {
      if (typeof window.saveState === "function") {
        window.saveState();
      }
    } catch (e) {}
    try {
      if (typeof window.saveToServer === "function") {
        window.saveToServer();
      }
    } catch (e) {}
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9);
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
      productList: $("productList"),
      pdfContainer: $("pdfContainer")
    };
  }

  function readForm(editId) {
    var r = refs();
    var name = r.productName ? r.productName.value.trim() : "";
    if (!name) {
      alert("Completează numele produsului.");
      if (r.productName) r.productName.focus();
      return null;
    }
    var p1 = parseFloat(r.priceOne ? r.priceOne.value : "") || 0;
    var p2 = parseFloat(r.priceFew ? r.priceFew.value : "") || 0;
    var p3 = parseFloat(r.priceProj ? r.priceProj.value : "") || 0;
    var vat = Number(window.TVA) || 21;
    var specs = [];
    if (r.specsTbody) {
      Array.prototype.forEach.call(r.specsTbody.querySelectorAll("tr"), function (tr) {
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
        one: { net: p1, gross: Number((p1 * (1 + vat / 100)).toFixed(2)) },
        few: { net: p2, gross: Number((p2 * (1 + vat / 100)).toFixed(2)) },
        proj: { net: p3, gross: Number((p3 * (1 + vat / 100)).toFixed(2)) }
      },
      images: currentImages.length ? currentImages.slice() : ((window.currentImages && Array.isArray(window.currentImages)) ? window.currentImages.slice() : []),
      specs: specs,
      beneficiar: r.beneficiar ? r.beneficiar.value.trim() : "",
      beneficiarEmail: r.beneficiarEmail ? r.beneficiarEmail.value.trim() : "",
      vat: vat,
      date: new Date().toLocaleDateString("ro-RO")
    };
  }

  function closeEditors() {
    ["addFormModal", "addProductModal", "editProductModalV9"].forEach(function (id) {
      var modal = $(id);
      if (modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      }
    });
  }

  function refreshUI() {
    try { if (typeof window.renderList === "function") window.renderList(); } catch (e) {}
    try { if (typeof window.renderPreview === "function") window.renderPreview(); } catch (e) {}
    try { if (typeof window.renderPreviewDetailed === "function") window.renderPreviewDetailed(); } catch (e) {}
  }

  function saveNew() {
    var product = readForm(null);
    if (!product) return false;
    var list = getProducts();
    list.push(product);
    saveProducts(list);
    refreshUI();
    closeEditors();
    return false;
  }

  function saveEdited() {
    var editId = window.editId || null;
    var product = readForm(editId);
    if (!product) return false;
    var list = getProducts().map(function (p) {
      return String(p.id) === String(product.id) ? product : p;
    });
    saveProducts(list);
    refreshUI();
    closeEditors();
    return false;
  }

  function bindButtons() {
    var r = refs();
    if (r.addBtn && r.addBtn !== lastBoundAdd) {
      r.addBtn.onclick = function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        }
        return saveNew();
      };
      lastBoundAdd = r.addBtn;
    }
    if (r.saveBtn && r.saveBtn !== lastBoundSave) {
      r.saveBtn.onclick = function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        }
        return saveEdited();
      };
      lastBoundSave = r.saveBtn;
    }
    if (r.productImages && !r.productImages.__emergencyBound) {
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
      r.productImages.__emergencyBound = true;
    }
  }

  function restoreBackup() {
    var st = getState();
    var current = Array.isArray(st.products) ? st.products : [];
    if (current.length) return;
    var backup = safeParse(localStorage.getItem(BACKUP_KEY), []);
    if (Array.isArray(backup) && backup.length) {
      st.products = backup;
      setState(st);
      localStorage.setItem("products", JSON.stringify(backup));
      window.products = backup;
      try {
        window.eval("products = JSON.parse(localStorage.getItem('catalogState') || '{}').products || [];");
      } catch (e) {}
    }
  }

  window.catalogEmergencySaveNew = saveNew;
  window.catalogEmergencySaveEdited = saveEdited;

  restoreBackup();
  bindButtons();
  setInterval(function () {
    restoreBackup();
    bindButtons();
  }, 500);
})();
