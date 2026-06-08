/* ═══════════════════════════════════════════════════════
   K_K FASHION — app.js
   Dynamic categories + LIVE SEARCH + PRODUCT DETAIL PAGE
═══════════════════════════════════════════════════════ */

const WHATSAPP_NUMBER = "9950701758";
const ADMIN_PIN       = "9672";

const load = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const save = (k, v)  => localStorage.setItem(k, JSON.stringify(v));
const $    = id      => document.getElementById(id);

let mainCategories       = [];
let products             = [];
let cart                 = load("knk_cart", []);
let activeMainCatId      = null;
let activeSubCat         = "All";
let editingProductId     = null;
let searchQuery          = "";
let currentDetailProduct = null;

const genId      = () => "cat_" + Date.now() + Math.floor(Math.random() * 1000);
const finalPrice = p  => Math.round(p.price - (p.price * (p.discount || 0)) / 100 + (p.extra || 0));
const getCat     = id => mainCategories.find(c => c.id === id);

/* ════════════════════════════════════
   FIREBASE CALLBACKS
════════════════════════════════════ */
window.updateCategoriesFromFirebase = function(cats) {
  mainCategories = cats || [];
  if (!activeMainCatId && mainCategories.length > 0) activeMainCatId = mainCategories[0].id;
  renderMainCats(); renderSubCats(); renderProducts();
  if (!$("adminPanel").classList.contains("hidden")) renderAdmin();
};

window.updateProductsFromFirebase = function(fbProducts) {
  products = fbProducts;
  renderProducts();
  if (!$("adminPanel").classList.contains("hidden")) renderAdmin();
};

/* ════════════════════════════════════
   SPLASH
════════════════════════════════════ */
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const splash = $("splash");
    splash.style.transition = "opacity 0.5s ease";
    splash.style.opacity = "0";
    setTimeout(() => {
      splash.classList.add("hidden");
      $("app").classList.remove("hidden");
    }, 500);
  }, 2500);
});

/* ════════════════════════════════════
   MAIN CATEGORY BAR
════════════════════════════════════ */
function renderMainCats() {
  const wrap = $("mainCats");
  wrap.innerHTML = "";
  mainCategories.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.className = "main-cat-btn" + (cat.id === activeMainCatId && !searchQuery ? " active" : "");
    btn.style.animationDelay = (i * 0.07) + "s";
    btn.style.animation = "fadeUp 0.4s ease both";
    btn.innerHTML = `<span class="mc-label">${cat.name}</span>`;
    btn.onclick = () => selectMainCat(cat.id);
    wrap.appendChild(btn);
  });
}

window.selectMainCat = function(id) {
  if (searchQuery) {
    searchQuery = "";
    $("searchInput").value = "";
    $("searchClear").classList.add("hidden");
  }
  activeMainCatId = id;
  activeSubCat    = "All";
  renderMainCats(); renderSubCats(); renderProducts();
};

/* ════════════════════════════════════
   SUB-CATEGORY BAR
════════════════════════════════════ */
function renderSubCats() {
  const wrap    = $("subCats");
  const subWrap = $("subCatsWrap");
  wrap.innerHTML = "";
  if (searchQuery) { subWrap.classList.add("hidden-bar"); return; }

  const cat = getCat(activeMainCatId);
  if (!cat || !cat.subCategories || cat.subCategories.length === 0) {
    subWrap.classList.add("hidden-bar"); return;
  }
  subWrap.classList.remove("hidden-bar");
  ["All", ...cat.subCategories].forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "cat" + (s === activeSubCat ? " active" : "");
    b.textContent = s;
    b.style.animationDelay = (i * 0.05) + "s";
    b.style.animation = "fadeUp 0.4s ease both";
    b.onclick = () => { activeSubCat = s; renderSubCats(); renderProducts(); };
    wrap.appendChild(b);
  });
}

/* ════════════════════════════════════
   SEARCH
════════════════════════════════════ */
function searchMatches(p, q) {
  if (!q) return false;
  const cat = getCat(p.mainCategoryId);
  const haystack = [p.name || "", p.subCategory || "", cat ? cat.name : ""].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => haystack.includes(w));
}

let searchDebounce = null;
$("searchInput").addEventListener("input", function() {
  const v = this.value.trim();
  $("searchClear").classList.toggle("hidden", !v);
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    searchQuery = v;
    renderMainCats(); renderSubCats(); renderProducts();
  }, 120);
});
$("searchClear").addEventListener("click", () => {
  $("searchInput").value = "";
  $("searchClear").classList.add("hidden");
  searchQuery = "";
  renderMainCats(); renderSubCats(); renderProducts();
  $("searchInput").focus();
});
$("searchInput").addEventListener("keydown", e => {
  if (e.key === "Escape") {
    $("searchInput").value = "";
    $("searchClear").classList.add("hidden");
    searchQuery = "";
    renderMainCats(); renderSubCats(); renderProducts();
    $("searchInput").blur();
  }
});

/* ════════════════════════════════════
   PRODUCT GRID
════════════════════════════════════ */
function renderProducts() {
  const title = $("activeTitle");
  let list;

  if (searchQuery) {
    list = products.filter(p => searchMatches(p, searchQuery));
    title.innerHTML = `Search: "<span style="color:var(--primary)">${searchQuery}</span>"
                       <span class="search-count">${list.length} result${list.length === 1 ? "" : "s"}</span>`;
  } else {
    const cat = getCat(activeMainCatId);
    title.textContent = activeSubCat === "All" ? (cat ? cat.name : "") : activeSubCat;
    list = products.filter(p => p.mainCategoryId === activeMainCatId);
    if (activeSubCat !== "All") list = list.filter(p => p.subCategory === activeSubCat);
  }

  const grid = $("products");
  if (list.length === 0) {
    grid.innerHTML = searchQuery
      ? `<p class="empty">Koi product nahi mila "<strong>${searchQuery}</strong>" ke liye.<br/>Doosra word try karein.</p>`
      : `<p class="empty">Loading products from server...</p>`;
    return;
  }
  grid.innerHTML = "";

  list.forEach((p, i) => {
    const price   = finalPrice(p);
    const inStock = p.inStock !== false;
    const cat     = getCat(p.mainCategoryId);
    const tag     = searchQuery
      ? `<div class="prod-cat-tag">${cat ? cat.name : ""}${p.subCategory ? " · " + p.subCategory : ""}</div>`
      : "";

    const el = document.createElement("div");
    el.className = "product";
    el.style.animationDelay = (i * 0.05) + "s";
    el.innerHTML = `
      <div class="${!inStock ? 'out-of-stock-overlay' : ''}">
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
      </div>
      <div class="info">
        <div class="name">${p.name}</div>
        ${tag}
        <div class="price-row">
          <span class="price">₹${price}</span>
          ${p.discount > 0 ? `<span class="strike">₹${p.price}</span><span class="off">${p.discount}% off</span>` : ""}
        </div>
        <span class="stock-badge ${inStock ? 'in' : 'out'}">${inStock ? '● In Stock' : '● Out of Stock'}</span>
        <div class="btn-row">
          <button class="btn-outline btn-cart-grid" ${!inStock ? 'disabled' : ''}>🛒 Cart</button>
          <button class="btn-primary btn-buy-grid"  ${!inStock ? 'disabled' : ''}>💬 Buy</button>
        </div>
      </div>`;

    /* Image / naam click → detail page open */
    el.querySelector("img").onclick   = () => openProductDetail(p);
    el.querySelector(".name").onclick = () => openProductDetail(p);

    if (inStock) {
      el.querySelector(".btn-cart-grid").onclick = (e) => { e.stopPropagation(); addToCart(p); };
      el.querySelector(".btn-buy-grid").onclick  = (e) => {
        e.stopPropagation();
        const text = encodeURIComponent(`Hello! I want to buy:\n${p.name}\nPrice: ₹${price}`);
        window.open(`https://wa.me/91${WHATSAPP_NUMBER}?text=${text}`, "_blank");
      };
    }
    grid.appendChild(el);
  });
}

/* ════════════════════════════════════
   PRODUCT DETAIL PAGE
════════════════════════════════════ */
function openProductDetail(p) {
  currentDetailProduct = p;
  const price   = finalPrice(p);
  const inStock = p.inStock !== false;
  const cat     = getCat(p.mainCategoryId);

  $("pdImage").src = p.image;
  $("pdImage").alt = p.name;

  const badge = $("pdStockBadge");
  badge.textContent = inStock ? "● In Stock" : "● Out of Stock";
  badge.className   = "stock-badge pd-img-stock " + (inStock ? "in" : "out");

  let bc = cat ? cat.name : "";
  if (p.subCategory) bc += " › " + p.subCategory;
  $("pdBreadcrumb").textContent = bc;

  $("pdName").textContent  = p.name;
  $("pdPrice").textContent = "₹" + price;

  if (p.discount > 0) {
    $("pdStrike").textContent = "₹" + p.price;
    $("pdStrike").classList.remove("hidden");
    $("pdOff").textContent = p.discount + "% off";
    $("pdOff").classList.remove("hidden");
  } else {
    $("pdStrike").classList.add("hidden");
    $("pdOff").classList.add("hidden");
  }

  const addBtn = $("pdAddCart");
  const buyBtn = $("pdBuyNow");
  addBtn.textContent = "🛒 Add to Cart";
  buyBtn.textContent = "💬 Buy Now";

  if (inStock) {
    addBtn.disabled = false;
    buyBtn.disabled = false;
    addBtn.onclick  = () => {
      addToCart(p);
      addBtn.textContent = "✅ Added!";
      setTimeout(() => { addBtn.textContent = "🛒 Add to Cart"; }, 1200);
    };
    buyBtn.onclick = () => {
      const text = encodeURIComponent(`Hello! I want to buy:\n${p.name}\nPrice: ₹${price}`);
      window.open(`https://wa.me/91${WHATSAPP_NUMBER}?text=${text}`, "_blank");
    };
  } else {
    addBtn.disabled = true;
    buyBtn.disabled = true;
    addBtn.textContent = "Out of Stock";
    buyBtn.textContent = "Out of Stock";
  }

  renderHorizSections(p);
  $("pdScroll").scrollTop = 0;
  $("prodDetail").classList.remove("hidden", "closing");
  syncDetailCartBadge();
}

function closeProductDetail() {
  const detail = $("prodDetail");
  detail.classList.add("closing");
  detail.addEventListener("animationend", () => {
    detail.classList.add("hidden");
    detail.classList.remove("closing");
    currentDetailProduct   = null;
    $("pdAddCart").textContent = "🛒 Add to Cart";
    $("pdBuyNow").textContent  = "💬 Buy Now";
    $("pdAddCart").disabled    = false;
    $("pdBuyNow").disabled     = false;
  }, { once: true });
}

$("pdBackBtn").onclick = closeProductDetail;
$("pdCartBtn").onclick = () => { renderCart(); $("cartOverlay").classList.remove("hidden"); };

/* ────────────────────────────────────
   HORIZONTAL SECTIONS (detail page)
──────────────────────────────────── */
function renderHorizSections(currentProduct) {
  const container = $("pdHorizSections");
  container.innerHTML = "";

  /* 1. Same subcategory */
  if (currentProduct.subCategory) {
    const subList = products.filter(p =>
      p.id !== currentProduct.id && p.subCategory === currentProduct.subCategory
    );
    if (subList.length > 0)
      container.appendChild(buildHorizSection("More from " + currentProduct.subCategory, subList));
  }

  /* 2. Same main category (other subcategories) */
  const sameMainList = products.filter(p =>
    p.id !== currentProduct.id &&
    p.mainCategoryId === currentProduct.mainCategoryId &&
    (currentProduct.subCategory ? p.subCategory !== currentProduct.subCategory : true)
  );
  if (sameMainList.length > 0) {
    const cat = getCat(currentProduct.mainCategoryId);
    container.appendChild(buildHorizSection("More from " + (cat ? cat.name : "This Category"), sameMainList));
  }

  /* 3. Every other main category, split by subcategory */
  mainCategories.forEach(cat => {
    if (cat.id === currentProduct.mainCategoryId) return;
    const catProds = products.filter(p => p.mainCategoryId === cat.id);
    if (catProds.length === 0) return;

    const subs = cat.subCategories || [];
    if (subs.length > 0) {
      subs.forEach(sub => {
        const sp = catProds.filter(p => p.subCategory === sub);
        if (sp.length > 0) container.appendChild(buildHorizSection(cat.name + " · " + sub, sp));
      });
      const noSub = catProds.filter(p => !p.subCategory || !subs.includes(p.subCategory));
      if (noSub.length > 0) container.appendChild(buildHorizSection(cat.name, noSub));
    } else {
      container.appendChild(buildHorizSection(cat.name, catProds));
    }
  });
}

function buildHorizSection(title, list) {
  const section = document.createElement("div");
  section.className = "horiz-section";

  const head = document.createElement("div");
  head.className = "horiz-section-head";
  head.innerHTML = `
    <span class="horiz-section-title">${title}</span>
    <span class="horiz-section-count">${list.length} items</span>`;
  section.appendChild(head);

  const row = document.createElement("div");
  row.className = "horiz-row";

  list.forEach((p, i) => {
    const price   = finalPrice(p);
    const inStock = p.inStock !== false;

    const card = document.createElement("div");
    card.className = "horiz-card";
    card.style.animationDelay = (i * 0.04) + "s";
    card.innerHTML = `
      <div class="horiz-card-img-wrap">
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
        ${!inStock ? '<div class="horiz-card-oos">OUT OF STOCK</div>' : ''}
      </div>
      <div class="horiz-card-info">
        <div class="horiz-card-name">${p.name}</div>
        <div class="horiz-card-price">₹${price}</div>
        <button class="horiz-card-add" ${!inStock ? 'disabled' : ''}>+ Cart</button>
      </div>`;

    card.querySelector(".horiz-card-img-wrap").onclick = () => openProductDetail(p);
    card.querySelector(".horiz-card-name").onclick     = () => openProductDetail(p);
    card.querySelector(".horiz-card-price").onclick    = () => openProductDetail(p);

    if (inStock) {
      card.querySelector(".horiz-card-add").onclick = (e) => {
        e.stopPropagation();
        addToCart(p);
        const btn = e.currentTarget;
        btn.textContent = "✓";
        setTimeout(() => { btn.textContent = "+ Cart"; }, 1000);
      };
    }
    row.appendChild(card);
  });

  section.appendChild(row);
  return section;
}

function syncDetailCartBadge() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  $("pdCartCount").textContent = count;
  $("pdCartCount").classList.toggle("hidden", count === 0);
}

/* ════════════════════════════════════
   CART
════════════════════════════════════ */
function addToCart(p) {
  const found = cart.find(i => i.product.id === p.id);
  if (found) found.qty += 1; else cart.push({ product: p, qty: 1 });
  save("knk_cart", cart);
  renderCartCount();
  syncDetailCartBadge();
  renderCart();
  $("cartBtn").style.color = "#C9A84C";
  setTimeout(() => { $("cartBtn").style.color = ""; }, 600);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.product.id !== id);
  save("knk_cart", cart);
  renderCartCount();
  syncDetailCartBadge();
  renderCart();
}

function clearCart() {
  cart = [];
  save("knk_cart", cart);
  renderCartCount();
  syncDetailCartBadge();
  renderCart();
}

function renderCartCount() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  $("cartCount").textContent = count;
  $("cartCount").classList.toggle("hidden", count === 0);
}

function renderCart() {
  const body = $("cartItems"), foot = $("cartFooter");
  if (!cart.length) {
    body.innerHTML = '<p class="empty">Cart is empty</p>';
    foot.classList.add("hidden");
    return;
  }
  body.innerHTML = "";
  cart.forEach(i => {
    const el = document.createElement("div");
    el.className = "cart-item";
    el.innerHTML = `
      <img src="${i.product.image}" alt="${i.product.name}" />
      <div class="ci-info">
        <div class="ci-name">${i.product.name}</div>
        <div class="ci-sub">₹${finalPrice(i.product)} × ${i.qty}</div>
      </div>
      <button class="trash">🗑️</button>`;
    el.querySelector(".trash").onclick = () => removeFromCart(i.product.id);
    body.appendChild(el);
  });
  $("cartTotal").textContent = "₹" + cart.reduce((s, i) => s + finalPrice(i.product) * i.qty, 0);
  foot.classList.remove("hidden");
}

$("cartBtn").onclick      = () => { renderCart(); $("cartOverlay").classList.remove("hidden"); };
$("cartClose").onclick    = () => $("cartOverlay").classList.add("hidden");
$("cartOverlay").onclick  = e => { if (e.target === $("cartOverlay")) $("cartOverlay").classList.add("hidden"); };
$("clearCartBtn").onclick = clearCart;
$("checkoutBtn").onclick  = () => {
  if (!cart.length) return;
  const total = cart.reduce((s, i) => s + finalPrice(i.product) * i.qty, 0);
  const lines = cart.map(i => `${i.product.name} x${i.qty} = ₹${finalPrice(i.product) * i.qty}`).join("%0A");
  window.open(`https://wa.me/91${WHATSAPP_NUMBER}?text=Hello! My order:%0A${lines}%0A%0ATotal: ₹${total}`, "_blank");
};

/* ════════════════════════════════════
   ADMIN PIN
════════════════════════════════════ */
let tapCount = 0, tapTimer = null;
$("logoBtn").onclick = () => {
  tapCount++;
  if (tapTimer) clearTimeout(tapTimer);
  if (tapCount >= 7) { tapCount = 0; openPin(); return; }
  tapTimer = setTimeout(() => { tapCount = 0; }, 1200);
};

function openPin() {
  $("pinInput").value = "";
  $("pinError").classList.add("hidden");
  $("adminPin").classList.remove("hidden");
  setTimeout(() => $("pinInput").focus(), 100);
}

$("pinClose").onclick   = () => $("adminPin").classList.add("hidden");
$("pinUnlock").onclick  = tryUnlock;
$("pinInput").onkeydown = e => { if (e.key === "Enter") tryUnlock(); };

function tryUnlock() {
  if ($("pinInput").value === ADMIN_PIN) {
    $("adminPin").classList.add("hidden"); openAdmin();
  } else {
    $("pinError").classList.remove("hidden");
    $("pinInput").style.borderColor = "#e05555";
    setTimeout(() => { $("pinInput").style.borderColor = ""; }, 800);
  }
}

/* ════════════════════════════════════
   ADMIN PANEL
════════════════════════════════════ */
function openAdmin() { renderAdmin(); $("adminPanel").classList.remove("hidden"); }
$("adminClose").onclick = () => $("adminPanel").classList.add("hidden");

function saveCategories() {
  if (window.saveCategoriesToFirebase) window.saveCategoriesToFirebase(mainCategories);
}

function renderCatMgmt() {
  const list = $("catMgmtList");
  list.innerHTML = "";
  mainCategories.forEach(cat => {
    const card = document.createElement("div");
    card.className = "cat-mgmt-card";
    card.innerHTML = `
      <div class="cat-mgmt-head">
        <span class="cat-mgmt-name">${cat.name}</span>
        <div class="cat-mgmt-actions">
          <button class="cat-action-btn edit-cat-btn">✏️ Edit</button>
          <button class="cat-action-btn del del-cat-btn">🗑️ Delete</button>
        </div>
      </div>
      <div class="cat-sub-section">
        <div class="cat-sub-label">SUB-CATEGORIES</div>
        <div class="chips" id="subChips_${cat.id}"></div>
        <div class="inline-row">
          <input class="field sub-inp" id="subInp_${cat.id}" placeholder="Sub-category naam" />
          <button class="btn-primary sm-btn add-sub-btn" data-id="${cat.id}">+ Add</button>
        </div>
      </div>`;

    const chipsEl = card.querySelector(`#subChips_${cat.id}`);
    (cat.subCategories || []).forEach(sub => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.innerHTML = `${sub}
        <button class="chip-btn edt">✏️</button>
        <button class="chip-btn del">✕</button>`;
      chip.querySelector(".edt").onclick = () => {
        const n = prompt(`"${sub}" ka naya naam:`, sub);
        if (!n || !n.trim()) return;
        const idx = cat.subCategories.indexOf(sub);
        if (idx > -1) cat.subCategories[idx] = n.trim().toUpperCase();
        saveCategories(); renderAdmin();
        if (activeMainCatId === cat.id) { activeSubCat = "All"; renderSubCats(); renderProducts(); }
      };
      chip.querySelector(".del").onclick = () => {
        if (!confirm(`"${sub}" delete karein?`)) return;
        cat.subCategories = cat.subCategories.filter(x => x !== sub);
        saveCategories(); renderAdmin();
        if (activeMainCatId === cat.id) { activeSubCat = "All"; renderSubCats(); renderProducts(); }
      };
      chipsEl.appendChild(chip);
    });

    card.querySelector(".add-sub-btn").onclick = () => {
      const inp = card.querySelector(`#subInp_${cat.id}`);
      const v = inp.value.trim().toUpperCase();
      if (!v) return;
      if ((cat.subCategories || []).some(x => x.toUpperCase() === v)) { alert("Pehle se exist karti hai!"); return; }
      cat.subCategories = [...(cat.subCategories || []), v];
      saveCategories(); inp.value = "";
      renderAdmin();
      if (activeMainCatId === cat.id) renderSubCats();
    };

    card.querySelector(".edit-cat-btn").onclick = () => {
      const n = prompt(`"${cat.name}" ka naya naam:`, cat.name);
      if (!n || !n.trim()) return;
      cat.name = n.trim().toUpperCase();
      saveCategories(); renderAdmin(); renderMainCats();
    };

    card.querySelector(".del-cat-btn").onclick = () => {
      if (!confirm(`"${cat.name}" category delete karein?`)) return;
      mainCategories = mainCategories.filter(c => c.id !== cat.id);
      if (activeMainCatId === cat.id) {
        activeMainCatId = mainCategories.length > 0 ? mainCategories[0].id : null;
        activeSubCat = "All";
      }
      saveCategories(); renderAdmin(); renderMainCats(); renderSubCats(); renderProducts();
    };

    list.appendChild(card);
  });
}

$("addCatBtn").onclick = () => {
  const inp = $("newCatName");
  const v = inp.value.trim().toUpperCase();
  if (!v) return;
  if (mainCategories.some(c => c.name.toUpperCase() === v)) { alert("Pehle se exist karti hai!"); return; }
  mainCategories.push({ id: genId(), name: v, subCategories: [] });
  saveCategories(); inp.value = "";
  renderAdmin(); renderMainCats();
};

function syncAddProductDropdowns() {
  const pMainCat = $("pMainCat");
  pMainCat.innerHTML = "";
  mainCategories.forEach(cat => {
    const o = document.createElement("option");
    o.value = cat.id; o.textContent = cat.name;
    pMainCat.appendChild(o);
  });
  onMainCatChange();
}

window.onMainCatChange = function() {
  const cat   = getCat($("pMainCat").value);
  const group = $("subCatGroup");
  const pSub  = $("pSubCat");
  if (!cat || !cat.subCategories || cat.subCategories.length === 0) { group.style.display = "none"; return; }
  group.style.display = "";
  pSub.innerHTML = "";
  cat.subCategories.forEach(s => {
    const o = document.createElement("option"); o.value = s; o.textContent = s; pSub.appendChild(o);
  });
};

$("pInStock").addEventListener("change", function() {
  const lbl = $("pStockLabel");
  lbl.textContent = this.checked ? "In Stock" : "Out of Stock";
  lbl.className   = "stock-label " + (this.checked ? "in" : "out");
});

function syncFilterDropdown() {
  const sel = $("adminFilterCat");
  sel.innerHTML = '<option value="ALL">All Categories</option>';
  mainCategories.forEach(cat => {
    const o = document.createElement("option"); o.value = cat.id; o.textContent = cat.name; sel.appendChild(o);
  });
}

function renderAdminProducts() {
  $("adminProdTitle").textContent = `Products (${products.length})`;
  const filterCat = $("adminFilterCat").value || "ALL";
  const list = $("adminProducts");
  list.innerHTML = "";
  const filtered = filterCat === "ALL" ? products : products.filter(p => p.mainCategoryId === filterCat);
  filtered.forEach(p => {
    const price    = finalPrice(p);
    const inStock  = p.inStock !== false;
    const cat      = getCat(p.mainCategoryId);
    const catName  = cat ? cat.name : "—";
    const subLabel = p.subCategory ? ` · ${p.subCategory}` : "";
    const el = document.createElement("div");
    el.className = "admin-prod";
    el.innerHTML = `
      <img src="${p.image}" alt="${p.name}" />
      <div class="ap-info">
        <div class="ap-name">${p.name}</div>
        <div class="ap-sub">${catName}${subLabel}</div>
        <div class="ap-price">₹${price} ${p.discount > 0 ? `(${p.discount}% off)` : ''} · <span style="color:${inStock ? '#4cc968' : '#e05555'}">${inStock ? 'In Stock' : 'Out of Stock'}</span></div>
      </div>
      <div class="ap-actions">
        <button class="edit-btn">✏️</button>
        <button class="trash">🗑️</button>
      </div>`;
    el.querySelector(".edit-btn").onclick = () => openEditModal(p);
    el.querySelector(".trash").onclick    = () => {
      if (!confirm("Delete karein?")) return;
      products = products.filter(x => x.id !== p.id);
      renderProducts(); renderAdmin();
      if (window.deleteProductFromFirebase) window.deleteProductFromFirebase(p.id);
    };
    list.appendChild(el);
  });
}

window.renderAdmin = function() {
  renderCatMgmt();
  syncAddProductDropdowns();
  syncFilterDropdown();
  renderAdminProducts();
};

/* ════════════════════════════════════
   EDIT PRODUCT MODAL
════════════════════════════════════ */
function openEditModal(p) {
  editingProductId           = p.id;
  $("editPName").textContent = p.name;
  $("editPPrice").value      = p.price;
  $("editPDiscount").value   = p.discount || 0;
  $("editPExtra").value      = p.extra    || 0;
  const inStock              = p.inStock !== false;
  $("editInStock").checked   = inStock;
  const lbl = $("editStockLabel");
  lbl.textContent = inStock ? "In Stock" : "Out of Stock";
  lbl.className   = "stock-label " + (inStock ? "in" : "out");
  $("editModal").classList.remove("hidden");
}

$("editInStock").addEventListener("change", function() {
  const lbl = $("editStockLabel");
  lbl.textContent = this.checked ? "In Stock" : "Out of Stock";
  lbl.className   = "stock-label " + (this.checked ? "in" : "out");
});

$("editClose").onclick = () => { $("editModal").classList.add("hidden"); editingProductId = null; };

$("saveEditBtn").onclick = () => {
  if (!editingProductId) return;
  const newPrice    = Number($("editPPrice").value);
  const newDiscount = Number($("editPDiscount").value) || 0;
  const newExtra    = Number($("editPExtra").value)    || 0;
  const newInStock  = $("editInStock").checked;
  if (!newPrice || newPrice <= 0) { alert("Sahi price daalein!"); return; }
  const idx = products.findIndex(p => p.id === editingProductId);
  if (idx > -1) {
    products[idx] = { ...products[idx], price: newPrice, discount: newDiscount, extra: newExtra, inStock: newInStock };
    renderProducts(); renderAdmin();
  }
  if (window.updateProductInFirebase) {
    window.updateProductInFirebase(editingProductId, { price: newPrice, discount: newDiscount, extra: newExtra, inStock: newInStock });
  }
  $("editModal").classList.add("hidden");
  editingProductId = null;
};

/* ════════════════════════════════════
   INIT
════════════════════════════════════ */
renderCartCount();
