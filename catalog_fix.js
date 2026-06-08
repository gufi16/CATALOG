(function () {
  if (window.__catalogFixLoaded) return;
  window.__catalogFixLoaded = true;
  const STORAGE_KEY = "catalogState";
  let currentImages = [];
  let editId = null;

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

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function tva() {
    return Number(window.TVA) || 21;
  }

  function state() {
    return safeParse(localStorage.getItem(STORAGE_KEY), {}) || {};
  }

  function products() {
    const st = state();
    return Array.isArray(st.products) ? st.products : [];
  }

  function saveProducts(list) {
    const st = state();
    st.products = list;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    window.products = list;
  }

  function setMode(isEdit) {
    if ($("addProductBtn")) $("addProductBtn").style.display = isEdit ? "none" : "inline-block";
    if ($("saveEditBtn")) $("saveEditBtn").style.display = isEdit ? "inline-block" : "none";
    if ($("cancelEditBtn")) $("cancelEditBtn").style.display = isEdit ? "inline-block" : "none";
  }

  function editorHosts() {
    return {
      addHost: $("addFormHost") || $("addProductBody"),
      addModal: $("addFormModal") || $("addProductModal"),
      editHost: $("editProductFormContainer") || $("addFormHost") || $("addProductBody"),
      editModal: $("editProductModalV9") || $("addFormModal") || $("addProductModal"),
    };
  }

  function moveEditor(host) {
    const productName = $("productName");
    const clearAllBtn = $("clearAllBtn");
    if (!host || !productName || !clearAllBtn) return;

    const start = productName.previousElementSibling;
    const end = clearAllBtn.closest("div");
    if (!start || !end) return;
    if (host.contains(start) && host.contains(end)) return;

    const frag = document.createDocumentFragment();
    let node = start;
    while (node) {
      const next = node.nextElementSibling;
      frag.appendChild(node);
      if (node === end) break;
      node = next;
    }
    host.appendChild(frag);
  }

  function closeEditors() {
    ["addFormModal", "addProductModal", "editProductModalV9"].forEach(function (id) {
      const modal = $(id);
      if (!modal) return;
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    });
  }

  function showEditor(kind) {
    const hosts = editorHosts();
    const host = kind === "edit" ? hosts.editHost : hosts.addHost;
    const modal = kind === "edit" ? hosts.editModal : hosts.addModal;
    if (!host || !modal) return;

    closeEditors();
    moveEditor(host);
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");

    const input = $("productName");
    if (input) {
      const content = input.closest(".modal-content");
      if (content) content.scrollTop = 0;
      input.scrollIntoView({ block: "start", behavior: "auto" });
      setTimeout(function () {
        input.focus();
      }, 20);
    }
  }

  function resetForm() {
    editId = null;
    currentImages = [];

    if ($("productName")) $("productName").value = "";
    if ($("priceOne")) $("priceOne").value = "";
    if ($("priceFew")) $("priceFew").value = "";
    if ($("priceProj")) $("priceProj").value = "";
    if ($("beneficiar")) $("beneficiar").value = "";
    if ($("beneficiarEmail")) $("beneficiarEmail").value = "";
    if ($("productCategory")) $("productCategory").value = "";
    if ($("currency")) $("currency").value = "EUR";

    const tbody = $("specsTable") ? $("specsTable").querySelector("tbody") : null;
    if (tbody) {
      tbody.innerHTML =
        '<tr><td><input placeholder="Ex: Procesor"/></td><td><input placeholder="Ex: Intel i7"/></td><td><button type="button" class="small js-del-row">Șterge</button></td></tr>';
    }

    setMode(false);
  }

  function readForm() {
    const name = $("productName") ? $("productName").value.trim() : "";
    if (!name) {
      alert("Completeaza numele produsului.");
      return null;
    }

    const p1 = parseFloat($("priceOne") ? $("priceOne").value : "") || 0;
    const p2 = parseFloat($("priceFew") ? $("priceFew").value : "") || 0;
    const p3 = parseFloat($("priceProj") ? $("priceProj").value : "") || 0;
    const vat = tva();

    const tbody = $("specsTable") ? $("specsTable").querySelector("tbody") : null;
    const specs = tbody
      ? Array.from(tbody.querySelectorAll("tr"))
          .map(function (tr) {
            const inputs = tr.querySelectorAll("input");
            const car = inputs[0] ? inputs[0].value.trim() : "";
            const spec = inputs[1] ? inputs[1].value.trim() : "";
            return car && spec ? { car: car, spec: spec } : null;
          })
          .filter(Boolean)
      : [];

    return {
      id: editId || uid(),
      name: name,
      currency: $("currency") ? $("currency").value : "EUR",
      category: $("productCategory") ? $("productCategory").value : "",
      prices: {
        one: { net: p1, gross: Number((p1 * (1 + vat / 100)).toFixed(2)) },
        few: { net: p2, gross: Number((p2 * (1 + vat / 100)).toFixed(2)) },
        proj: { net: p3, gross: Number((p3 * (1 + vat / 100)).toFixed(2)) },
      },
      images: currentImages.slice(),
      specs: specs,
      beneficiar: $("beneficiar") ? $("beneficiar").value.trim() : "",
      beneficiarEmail: $("beneficiarEmail") ? $("beneficiarEmail").value.trim() : "",
      vat: vat,
      date: new Date().toLocaleDateString("ro-RO"),
    };
  }

  function renderList() {
    const list = $("productList");
    if (!list) return;

    list.innerHTML = "";
    products().forEach(function (p) {
      const row = document.createElement("div");
      row.className = "product-item";
      row.innerHTML =
        '<span>' +
        p.name +
        " - " +
        Number((p.prices && p.prices.one ? p.prices.one.net : 0) || 0).toFixed(2) +
        " " +
        (p.currency || "EUR") +
        '</span><div style="display:flex;gap:6px"><button type="button" class="small js-edit-product" data-id="' +
        p.id +
        '">Editeaza</button><button type="button" class="small js-delete-product" data-id="' +
        p.id +
        '" style="background:#e74c3c;color:#fff">Sterge</button></div>';
      list.appendChild(row);
    });
  }

  function renderGrid() {
    const root = $("pdfContainer");
    if (!root) return;

    root.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "offer-grid";

    products().forEach(function (p) {
      const card = document.createElement("div");
      card.className = "offer-card";
      card.dataset.id = p.id;

      const img = Array.isArray(p.images) && p.images[0] ? '<img src="' + p.images[0] + '"/>' : '<div style="height:90px"></div>';
      card.innerHTML =
        '<button type="button" class="quick-edit-btn" data-id="' +
        p.id +
        '">Editeaza</button>' +
        img +
        '<h4 style="margin:6px 0;text-align:center">' +
        p.name +
        '</h4><div style="font-size:13px;text-align:center">Pret 1 buc: ' +
        Number((p.prices && p.prices.one ? p.prices.one.net : 0) || 0).toFixed(2) +
        " " +
        (p.currency || "EUR") +
        "</div>";

      grid.appendChild(card);
    });

    root.appendChild(grid);
  }

  function refresh() {
    renderList();
    renderGrid();
  }

  function saveNewProduct() {
    const data = readForm();
    if (!data) return;
    const list = products();
    list.push(data);
    saveProducts(list);
    resetForm();
    refresh();
    closeEditors();
  }

  function saveEditedProduct() {
    const data = readForm();
    if (!data) return;
    const list = products().map(function (p) {
      return String(p.id) === String(data.id) ? data : p;
    });
    saveProducts(list);
    resetForm();
    refresh();
    closeEditors();
  }

  function startEdit(id) {
    const p = products().find(function (x) {
      return String(x.id) === String(id);
    });
    if (!p) return;

    editId = p.id;
    currentImages = Array.isArray(p.images) ? p.images.slice() : [];

    if ($("productName")) $("productName").value = p.name || "";
    if ($("currency")) $("currency").value = p.currency || "EUR";
    if ($("productCategory")) $("productCategory").value = p.category || "";
    if ($("priceOne")) $("priceOne").value = p.prices && p.prices.one ? p.prices.one.net || "" : "";
    if ($("priceFew")) $("priceFew").value = p.prices && p.prices.few ? p.prices.few.net || "" : "";
    if ($("priceProj")) $("priceProj").value = p.prices && p.prices.proj ? p.prices.proj.net || "" : "";
    if ($("beneficiar")) $("beneficiar").value = p.beneficiar || "";
    if ($("beneficiarEmail")) $("beneficiarEmail").value = p.beneficiarEmail || "";

    const tbody = $("specsTable") ? $("specsTable").querySelector("tbody") : null;
    if (tbody) {
      tbody.innerHTML = "";
      const specs = Array.isArray(p.specs) && p.specs.length ? p.specs : [{ car: "", spec: "" }];
      specs.forEach(function (s) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          '<td><input value="' +
          (s.car || "") +
          '" placeholder="Ex: Procesor"/></td><td><input value="' +
          (s.spec || "") +
          '" placeholder="Ex: Intel i7"/></td><td><button type="button" class="small js-del-row">Șterge</button></td>';
        tbody.appendChild(tr);
      });
    }

    setMode(true);
    showEditor("edit");
  }

  function bind() {
    window.startEdit = startEdit;
    window.catalogFixSaveNewProduct = saveNewProduct;
    window.catalogFixSaveEditedProduct = saveEditedProduct;
    window.openStableAddEditor = function () {
      resetForm();
      showEditor("add");
    };
    window.openStableEditEditor = startEdit;
    window.deleteRow = function (btn) {
      const tr = btn && btn.closest ? btn.closest("tr") : null;
      if (tr) tr.remove();
    };
    window.addRow = function () {
      const tbody = $("specsTable") ? $("specsTable").querySelector("tbody") : null;
      if (!tbody) return;
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td><input placeholder="Caracteristica"/></td><td><input placeholder="Specificatie"/></td><td><button type="button" class="small js-del-row">Șterge</button></td>';
      tbody.appendChild(tr);
    };

    document.addEventListener(
      "click",
      function (e) {
        const addTrigger = e.target && e.target.closest ? e.target.closest('[data-target="btnAdaugaProdus"], #btnAdaugaProdus, #openAddFormBtn, #openAddProduct, .open-add-product') : null;
        if (addTrigger) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
          resetForm();
          showEditor("add");
          return;
        }

        const quickEdit = e.target && e.target.closest ? e.target.closest(".quick-edit-btn, .js-edit-product") : null;
        if (quickEdit) {
          const id = quickEdit.dataset ? quickEdit.dataset.id : null;
          if (!id) return;
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
          startEdit(id);
          return;
        }

        const del = e.target && e.target.closest ? e.target.closest(".js-delete-product") : null;
        if (del) {
          const id = del.dataset ? del.dataset.id : null;
          if (!id) return;
          e.preventDefault();
          e.stopPropagation();
          if (confirm("Stergi produsul?")) {
            const list = products().filter(function (p) {
              return String(p.id) !== String(id);
            });
            saveProducts(list);
            refresh();
          }
          return;
        }

        const rowDel = e.target && e.target.closest ? e.target.closest(".js-del-row") : null;
        if (rowDel) {
          e.preventDefault();
          const tr = rowDel.closest("tr");
          if (tr) tr.remove();
        }
      },
      true
    );

    const addBtnOld = $("addProductBtn");
    if (addBtnOld) {
      const addBtn = addBtnOld.cloneNode(true);
      addBtnOld.parentNode.replaceChild(addBtn, addBtnOld);
      addBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        saveNewProduct();
        return false;
      };
      addBtn.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
          saveNewProduct();
        },
        true
      );
    }

    const saveBtnOld = $("saveEditBtn");
    if (saveBtnOld) {
      const saveBtn = saveBtnOld.cloneNode(true);
      saveBtnOld.parentNode.replaceChild(saveBtn, saveBtnOld);
      saveBtn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        saveEditedProduct();
        return false;
      };
      saveBtn.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
          saveEditedProduct();
        },
        true
      );
    }

    if ($("cancelEditBtn")) {
      $("cancelEditBtn").addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          resetForm();
          closeEditors();
        },
        true
      );
    }

    if ($("resetFormBtn")) {
      $("resetFormBtn").addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          resetForm();
          focusProductName();
        },
        true
      );
    }

    if ($("productImages")) {
      $("productImages").addEventListener("change", function (e) {
        const files = Array.from((e.target && e.target.files) || []);
        Promise.all(
          files.map(function (file) {
            return new Promise(function (resolve) {
              const reader = new FileReader();
              reader.onload = function (ev) {
                resolve(ev.target.result);
              };
              reader.readAsDataURL(file);
            });
          })
        ).then(function (images) {
          currentImages = images;
        });
      });
    }
  }

  bind();
  resetForm();
  saveProducts(products());
  refresh();
})();
