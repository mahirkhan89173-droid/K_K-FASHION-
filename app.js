/* ═══════════════════════════════════════════════════════
   K_K FASHION — app.js
═══════════════════════════════════════════════════════ */

const load = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const save = (k, v)  => localStorage.setItem(k, JSON.stringify(v));
const $    = id      => document.getElementById(id);

let ADMIN_PIN            = load("admin_pin", "9672");
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

// SCROLL LOCK UTILS (Prevents background from scrolling)
const lockScroll   = () => document.body.classList.add("no-scroll");
const unlockScroll = () => document.body.classList.remove("no-scroll");

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
   MAIN CATEGORY & SUB-CATEGORY BAR
════════════════════════════════════ */
function renderMainCats() {
  const wrap = $("mainCats"); wrap.innerHTML = "";
  mainCategories.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.className = "main-cat-btn" + (cat.id === activeMainCatId && !searchQuery ? " active" : "");
    btn.style.animationDelay = (i * 0.07) + "s"; btn.style.animation = "fadeUp 0.4s ease both";
    btn.innerHTML = `<span class="mc-label">${cat.name}</span>`;
    btn.onclick = () => selectMainCat(cat.id);
    wrap.appendChild(btn);
  });
}

window.selectMainCat = function(id) {
  if (searchQuery) { searchQuery = ""; $("searchInput").value = ""; $("searchClear").classList.add("hidden"); }
  activeMainCatId = id; activeSubCat = "All";
  renderMainCats(); renderSubCats(); renderProducts();
};

function renderSubCats() {
  const wrap = $("subCats"), subWrap = $("subCatsWrap"); wrap.innerHTML = "";
  if (searchQuery) { subWrap.classList.add("hidden-bar"); return; }
  const cat = getCat(activeMainCatId);
  if (!cat || !cat.subCategories || cat.subCategories.length === 0) { subWrap.classList.add("hidden-bar"); return; }
  subWrap.classList.remove("hidden-bar");
  ["All", ...cat.subCategories].forEach((s, i) => {
    const b = document.createElement("button");
    b.className = "cat" + (s === activeSubCat ? " active" : ""); b.textContent = s;
    b.style.animationDelay = (i * 0.05) + "s"; b.style.animation = "fadeUp 0.4s ease both";
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
  const v = this.value.trim(); $("searchClear").classList.toggle("hidden", !v);
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => { searchQuery = v; renderMainCats(); renderSubCats(); renderProducts(); }, 120);
});
$("searchClear").addEventListener("click", () => { $("searchInput").value = ""; $("searchClear").classList.add("hidden"); searchQuery = ""; renderMainCats(); renderSubCats(); renderProducts(); $("searchInput").focus(); });

/* ════════════════════════════════════
   PRODUCT GRID
════════════════════════════════════ */
function renderProducts() {
  const title = $("activeTitle"); let list;
  if (searchQuery) {
    list = products.filter(p => searchMatches(p, searchQuery));
    title.innerHTML = `Search: "<span style="color:var(--primary)">${searchQuery}</span>" <span class="search-count">${list.length} results</span>`;
  } else {
    const cat = getCat(activeMainCatId);
    title.textContent = activeSubCat === "All" ? (cat ? cat.name : "") : activeSubCat;
    list = products.filter(p => p.mainCategoryId === activeMainCatId);
    if (activeSubCat !== "All") list = list.filter(p => p.subCategory === activeSubCat);
  }

  const grid = $("products");
  if (list.length === 0) { grid.innerHTML = searchQuery ? `<p class="empty">Koi product nahi mila.</p>` : `<p class="empty">Loading products...</p>`; return; }
  grid.innerHTML = "";

  list.forEach((p, i) => {
    const price = finalPrice(p), inStock = p.inStock !== false, cat = getCat(p.mainCategoryId);
    const tag = searchQuery ? `<div class="prod-cat-tag">${cat ? cat.name : ""}${p.subCategory ? " · " + p.subCategory : ""}</div>` : "";
    const el = document.createElement("div"); el.className = "product"; el.style.animationDelay = (i * 0.05) + "s";
    el.innerHTML = `
      <div class="${!inStock ? 'out-of-stock-overlay' : ''}"><img src="${p.image}" alt="${p.name}" loading="lazy" /></div>
      <div class="info">
        <div class="name">${p.name}</div>${tag}
        <div class="price-row"><span class="price">₹${price}</span>${p.discount > 0 ? `<span class="strike">₹${p.price}</span><span class="off">${p.discount}% off</span>` : ""}</div>
        <span class="stock-badge ${inStock ? 'in' : 'out'}">${inStock ? '● In Stock' : '● Out of Stock'}</span>
        <div class="btn-row">
          <button class="btn-outline btn-cart-grid" ${!inStock ? 'disabled' : ''}>🛒 Cart</button>
          <button class="btn-primary btn-buy-grid"  ${!inStock ? 'disabled' : ''}>💳 Buy</button>
        </div>
      </div>`;
    el.querySelector("img").onclick = () => openProductDetail(p);
    el.querySelector(".name").onclick = () => openProductDetail(p);
    if (inStock) {
      el.querySelector(".btn-cart-grid").onclick = (e) => { e.stopPropagation(); addToCart(p); };
      el.querySelector(".btn-buy-grid").onclick  = (e) => { e.stopPropagation(); directBuyCheckout(p); };
    }
    grid.appendChild(el);
  });
}

/* ════════════════════════════════════
   PRODUCT DETAIL PAGE
════════════════════════════════════ */
function openProductDetail(p) {
  lockScroll(); // Lock background
  currentDetailProduct = p; const price = finalPrice(p), inStock = p.inStock !== false, cat = getCat(p.mainCategoryId);
  $("pdImage").src = p.image; $("pdImage").alt = p.name;
  const badge = $("pdStockBadge"); badge.textContent = inStock ? "● In Stock" : "● Out of Stock"; badge.className = "stock-badge pd-img-stock " + (inStock ? "in" : "out");
  $("pdBreadcrumb").textContent = (cat ? cat.name : "") + (p.subCategory ? " › " + p.subCategory : "");
  $("pdName").textContent = p.name; $("pdPrice").textContent = "₹" + price;
  if (p.discount > 0) { $("pdStrike").textContent = "₹" + p.price; $("pdStrike").classList.remove("hidden"); $("pdOff").textContent = p.discount + "% off"; $("pdOff").classList.remove("hidden"); } else { $("pdStrike").classList.add("hidden"); $("pdOff").classList.add("hidden"); }
  const addBtn = $("pdAddCart"), buyBtn = $("pdBuyNow");
  addBtn.textContent = "🛒 Add to Cart"; buyBtn.textContent = "💳 Buy Now";
  if (inStock) {
    addBtn.disabled = false; buyBtn.disabled = false;
    addBtn.onclick = () => { addToCart(p); addBtn.textContent = "✅ Added!"; setTimeout(() => { addBtn.textContent = "🛒 Add to Cart"; }, 1200); };
    buyBtn.onclick = () => directBuyCheckout(p);
  } else { addBtn.disabled = true; buyBtn.disabled = true; addBtn.textContent = "Out of Stock"; buyBtn.textContent = "Out of Stock"; }
  $("prodDetail").classList.remove("hidden", "closing"); syncDetailCartBadge();
}

function closeProductDetail() {
  const detail = $("prodDetail"); detail.classList.add("closing");
  detail.addEventListener("animationend", () => {
    detail.classList.add("hidden"); detail.classList.remove("closing"); currentDetailProduct = null;
    unlockScroll(); // Unlock background
  }, { once: true });
}
$("pdBackBtn").onclick = closeProductDetail;
$("pdCartBtn").onclick = () => { renderCart(); $("cartOverlay").classList.remove("hidden"); lockScroll(); };

function syncDetailCartBadge() { const count = cart.reduce((s, i) => s + i.qty, 0); $("pdCartCount").textContent = count; $("pdCartCount").classList.toggle("hidden", count === 0); }

/* ════════════════════════════════════
   CART
════════════════════════════════════ */
function addToCart(p) {
  const found = cart.find(i => i.product.id === p.id);
  if (found) found.qty += 1; else cart.push({ product: p, qty: 1 });
  save("knk_cart", cart); renderCartCount(); syncDetailCartBadge(); renderCart();
  $("cartBtn").style.color = "#C9A84C"; setTimeout(() => { $("cartBtn").style.color = ""; }, 600);
}
function removeFromCart(id) { cart = cart.filter(i => i.product.id !== id); save("knk_cart", cart); renderCartCount(); syncDetailCartBadge(); renderCart(); }
function clearCart() { cart = []; save("knk_cart", cart); renderCartCount(); syncDetailCartBadge(); renderCart(); }
function renderCartCount() { const count = cart.reduce((s, i) => s + i.qty, 0); $("cartCount").textContent = count; $("cartCount").classList.toggle("hidden", count === 0); }

function renderCart() {
  const body = $("cartItems"), foot = $("cartFooter");
  if (!cart.length) { body.innerHTML = '<p class="empty">Cart is empty</p>'; foot.classList.add("hidden"); return; }
  body.innerHTML = "";
  cart.forEach(i => {
    const el = document.createElement("div"); el.className = "cart-item";
    el.innerHTML = `<img src="${i.product.image}" alt="${i.product.name}" /><div class="ci-info"><div class="ci-name">${i.product.name}</div><div class="ci-sub">₹${finalPrice(i.product)} × ${i.qty}</div></div><button class="trash">🗑️</button>`;
    el.querySelector(".trash").onclick = () => removeFromCart(i.product.id); body.appendChild(el);
  });
  $("cartTotal").textContent = "₹" + cart.reduce((s, i) => s + finalPrice(i.product) * i.qty, 0); foot.classList.remove("hidden");
}

$("cartBtn").onclick = () => { renderCart(); $("cartOverlay").classList.remove("hidden"); lockScroll(); };
$("cartClose").onclick = () => { $("cartOverlay").classList.add("hidden"); unlockScroll(); };
$("cartOverlay").onclick = e => { if (e.target === $("cartOverlay")) { $("cartOverlay").classList.add("hidden"); unlockScroll(); } };
$("clearCartBtn").onclick = clearCart;

/* ════════════════════════════════════
   CHECKOUT OVERLAY & STEPPER LOGIC
════════════════════════════════════ */
function directBuyCheckout(p) {
  cart = [{ product: p, qty: 1 }]; save("knk_cart", cart); renderCartCount();
  $("prodDetail").classList.add("hidden"); $("prodDetail").classList.remove("closing"); currentDetailProduct = null;
  openCheckout();
}

$("checkoutBtn").onclick = () => { if (!cart.length) return; $("cartOverlay").classList.add("hidden"); openCheckout(); };

function openCheckout() {
  lockScroll(); // Keep background locked securely
  const total = cart.reduce((s, i) => s + finalPrice(i.product) * i.qty, 0);
  $("chkTotalAmt").textContent = "₹" + total;
  $("checkoutOverlay").classList.remove("hidden");
  $("step1Indicator").className = "step-item active"; $("step1Circle").innerHTML = "1";
  $("line1").className = "step-line"; $("step2Indicator").className = "step-item"; $("step3Indicator").className = "step-item";
}

$("closeCheckout").onclick = () => { $("checkoutOverlay").classList.add("hidden"); unlockScroll(); };

$("step1NextBtn").onclick = () => {
  const name = $("chkName").value.trim(), mobile = $("chkMobile").value.trim(), address = $("chkAddress").value.trim(), state = $("chkState").value.trim(), pincode = $("chkPincode").value.trim(), landmark = $("chkLandmark").value.trim();
  if(!name || !mobile || !address || !state || !pincode) { alert("Kripya sabhi zaroori jankari (Name, Mobile, Address, State, Pincode) bharein!"); return; }
  if(mobile.length < 10 || isNaN(mobile)) { alert("Mobile number galat hai! Kripya 10-digit number daalein."); return; }

  const total = cart.reduce((s, i) => s + finalPrice(i.product) * i.qty, 0);
  const orderData = { name, mobile, address, state, pincode, landmark, items: cart, totalAmount: total, status: "Recent" };

  const btn = $("step1NextBtn"); btn.textContent = "Placing Order...";
  if (window.saveOrderToFirebase) {
    window.saveOrderToFirebase(orderData).then(success => {
      btn.textContent = "Save Address & Place Order";
      if (success) {
        $("step1Indicator").className = "step-item completed"; $("step1Circle").innerHTML = "✔";
        $("line1").classList.add("completed"); $("step2Indicator").classList.add("active");
        alert("Order successfully placed! 🎉");
        $("checkoutOverlay").classList.add("hidden");
        unlockScroll();
        clearCart();
        if (window.fetchOrdersFromFirebase) window.fetchOrdersFromFirebase();
      }
    });
  } else { alert("Firebase connection error."); btn.textContent = "Save Address & Place Order"; }
};

/* ════════════════════════════════════
   ADMIN PIN & PANEL LOGIC
════════════════════════════════════ */
let tapCount = 0, tapTimer = null;
$("logoBtn").onclick = () => {
  tapCount++; if (tapTimer) clearTimeout(tapTimer);
  if (tapCount >= 20) { tapCount = 0; openPin(); return; }
  tapTimer = setTimeout(() => { tapCount = 0; }, 3000);
};

function openPin() { $("pinInput").value = ""; $("pinError").classList.add("hidden"); $("adminPin").classList.remove("hidden"); setTimeout(() => $("pinInput").focus(), 100); }
$("pinClose").onclick = () => $("adminPin").classList.add("hidden");
$("pinUnlock").onclick = tryUnlock;
$("pinInput").onkeydown = e => { if (e.key === "Enter") tryUnlock(); };

function tryUnlock() {
  if ($("pinInput").value === ADMIN_PIN) { $("adminPin").classList.add("hidden"); openAdmin(); } else { $("pinError").classList.remove("hidden"); $("pinInput").style.borderColor = "#e05555"; setTimeout(() => { $("pinInput").style.borderColor = ""; }, 800); }
}

function openAdmin() { lockScroll(); renderAdmin(); $("adminPanel").classList.remove("hidden"); }
$("adminClose").onclick = () => { $("adminPanel").classList.add("hidden"); unlockScroll(); };

function saveCategories() { if (window.saveCategoriesToFirebase) window.saveCategoriesToFirebase(mainCategories); }

function renderCatMgmt() {
  const list = $("catMgmtList"); list.innerHTML = "";
  mainCategories.forEach(cat => {
    const card = document.createElement("div"); card.className = "cat-mgmt-card";
    card.innerHTML = `<div class="cat-mgmt-head"><span class="cat-mgmt-name">${cat.name}</span><div class="cat-mgmt-actions"><button class="cat-action-btn edit-cat-btn">✏️ Edit</button><button class="cat-action-btn del del-cat-btn">🗑️ Delete</button></div></div>`;
    list.appendChild(card);
  });
}

// ═════ ADMIN ORDER MANAGEMENT (NEW) ═════
let liveOrders = [];
let currentOrderTab = "Recent";

window.renderAdminOrders = function(orders) {
  liveOrders = orders;
  renderOrdersByTab();
};

function renderOrdersByTab() {
  const list = $("adminOrdersList");
  if (!list) return;

  let filtered = liveOrders.filter(o => (o.status || "Recent") === currentOrderTab);

  if (filtered.length === 0) { list.innerHTML = `<p class='empty'>Koi order nahi hai is tab mein.</p>`; return; }
  list.innerHTML = "";
  
  filtered.forEach(o => {
    const itemsHtml = o.items.map(i => `${i.product.name} (x${i.qty})`).join("<br>");
    const dateStr = o.timestamp && o.timestamp.seconds ? new Date(o.timestamp.seconds * 1000).toLocaleString() : "Just Now";
    
    const div = document.createElement("div");
    div.className = "admin-order-card";
    div.innerHTML = `
      <div class="order-head">
        <span class="order-id">ID: ${o.id ? o.id.substring(0,8) : 'NEW'}...</span>
        <span class="order-total">₹${o.totalAmount}</span>
      </div>
      <div class="order-cust">
        <strong>${o.name}</strong> (${o.mobile})<br>
        ${o.address}, ${o.state} - ${o.pincode}<br>
        <small style="color:var(--muted)">${dateStr}</small>
      </div>
      <div class="order-items">${itemsHtml}</div>
      <div class="order-actions">
        <select class="field small-field status-select" data-id="${o.id}">
          <option value="Recent" ${o.status === 'Recent' ? 'selected' : ''}>Recent</option>
          <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
        <button class="trash del-order-btn" data-id="${o.id}">🗑️ Remove</button>
      </div>
    `;
    list.appendChild(div);
  });

  // Attach status change event
  document.querySelectorAll(".status-select").forEach(sel => {
    sel.addEventListener("change", async (e) => {
      const id = e.target.getAttribute("data-id");
      const newStatus = e.target.value;
      const order = liveOrders.find(x => x.id === id);
      if(order) order.status = newStatus;
      renderOrdersByTab(); // Re-render to move to correct tab
      if (window.updateOrderStatusInFirebase) await window.updateOrderStatusInFirebase(id, newStatus);
    });
  });

  // Attach delete event
  document.querySelectorAll(".del-order-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      if(!confirm("Kya aap sach me is order ko delete karna chahte hain?")) return;
      liveOrders = liveOrders.filter(x => x.id !== id);
      renderOrdersByTab();
      if (window.deleteOrderFromFirebase) await window.deleteOrderFromFirebase(id);
    });
  });
}

// Hook up Order Tabs
document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.addEventListener("click", (e) => {
    document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
    e.currentTarget.classList.add("active");
    currentOrderTab = e.currentTarget.getAttribute("data-tab");
    renderOrdersByTab();
  });
});

window.renderAdmin = function() {
  renderCatMgmt();
  if (window.fetchOrdersFromFirebase) window.fetchOrdersFromFirebase();
};

/* ════════════════════════════════════
   INIT
════════════════════════════════════ */
renderCartCount();
