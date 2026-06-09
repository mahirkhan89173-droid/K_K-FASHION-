/* ═══════════════════════════════════════════════════════
   K_K FASHION — app.js (FINAL - VISIBLE UTR BOX FIX)
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

// SCROLL & ZOOM LOCK UTILS
const lockScroll   = () => document.body.classList.add("no-scroll");
const unlockScroll = () => document.body.classList.remove("no-scroll");

const allowZoom   = () => document.querySelector('meta[name="viewport"]').setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=5.0");
const preventZoom = () => document.querySelector('meta[name="viewport"]').setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");

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
    const splash = $("splash"); splash.style.transition = "opacity 0.5s ease"; splash.style.opacity = "0";
    setTimeout(() => { splash.classList.add("hidden"); $("app").classList.remove("hidden"); }, 500);
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
    const mainImg = (Array.isArray(p.image) && p.image.length > 0) ? p.image[0] : "placeholder.jpg";
    
    const el = document.createElement("div"); el.className = "product"; el.style.animationDelay = (i * 0.05) + "s";
    el.innerHTML = `
      <div class="${!inStock ? 'out-of-stock-overlay' : ''}"><img src="${mainImg}" alt="${p.name}" loading="lazy" /></div>
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
  lockScroll();
  currentDetailProduct = p; const price = finalPrice(p), inStock = p.inStock !== false, cat = getCat(p.mainCategoryId);
  
  const slider = $("pdImageSlider");
  const dotsWrap = $("pdImageDots");
  slider.innerHTML = ""; dotsWrap.innerHTML = "";
  
  let images = Array.isArray(p.image) ? p.image : [p.image];
  if(images.length === 0) images = ["placeholder.jpg"];

  images.forEach((imgUrl, i) => {
    const imgEl = document.createElement("img");
    imgEl.src = imgUrl; imgEl.alt = p.name;
    imgEl.onclick = () => {
      $("fullImage").src = imgUrl;
      $("imageViewer").classList.remove("hidden");
      allowZoom(); 
    };

    slider.appendChild(imgEl);
    if(images.length > 1) {
      const dot = document.createElement("div");
      dot.className = "dot" + (i === 0 ? " active" : "");
      dotsWrap.appendChild(dot);
    }
  });

  if(images.length > 1) {
    slider.onscroll = () => {
      const index = Math.round(slider.scrollLeft / slider.offsetWidth);
      Array.from(dotsWrap.children).forEach((dot, i) => {
        dot.className = "dot" + (i === index ? " active" : "");
      });
    };
  }

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
  
  renderHorizSections(p);
  $("pdScroll").scrollTop = 0;
  
  $("prodDetail").classList.remove("hidden", "closing"); syncDetailCartBadge();
}

function closeProductDetail() {
  preventZoom();
  const detail = $("prodDetail"); detail.classList.add("closing");
  detail.addEventListener("animationend", () => {
    detail.classList.add("hidden"); detail.classList.remove("closing"); currentDetailProduct = null;
    unlockScroll();
  }, { once: true });
}
$("pdBackBtn").onclick = closeProductDetail;
$("pdCartBtn").onclick = () => { renderCart(); $("cartOverlay").classList.remove("hidden"); lockScroll(); preventZoom(); };

/* ════════════════════════════════════
   HORIZONTAL SECTIONS (More From...)
════════════════════════════════════ */
function renderHorizSections(currentProduct) {
  const container = $("pdHorizSections"); container.innerHTML = "";
  if (currentProduct.subCategory) {
    const subList = products.filter(p => p.id !== currentProduct.id && p.subCategory === currentProduct.subCategory);
    if (subList.length > 0) container.appendChild(buildHorizSection("More from " + currentProduct.subCategory, subList));
  }
  const sameMainList = products.filter(p => p.id !== currentProduct.id && p.mainCategoryId === currentProduct.mainCategoryId && (currentProduct.subCategory ? p.subCategory !== currentProduct.subCategory : true));
  if (sameMainList.length > 0) {
    const cat = getCat(currentProduct.mainCategoryId);
    container.appendChild(buildHorizSection("More from " + (cat ? cat.name : "This Category"), sameMainList));
  }
}

function buildHorizSection(title, list) {
  const section = document.createElement("div"); section.className = "horiz-section";
  const head = document.createElement("div"); head.className = "horiz-section-head";
  head.innerHTML = `<span class="horiz-section-title">${title}</span><span class="horiz-section-count">${list.length} items</span>`;
  section.appendChild(head);
  const row = document.createElement("div"); row.className = "horiz-row";
  list.forEach((p, i) => {
    const price = finalPrice(p), inStock = p.inStock !== false;
    const mainImg = (Array.isArray(p.image) && p.image.length > 0) ? p.image[0] : "placeholder.jpg";
    const card = document.createElement("div"); card.className = "horiz-card"; card.style.animationDelay = (i * 0.04) + "s";
    card.innerHTML = `<div class="horiz-card-img-wrap"><img src="${mainImg}" alt="${p.name}" loading="lazy" />${!inStock ? '<div class="horiz-card-oos">OUT OF STOCK</div>' : ''}</div>
      <div class="horiz-card-info"><div class="horiz-card-name">${p.name}</div><div class="horiz-card-price">₹${price}</div><button class="horiz-card-add" ${!inStock ? 'disabled' : ''}>+ Cart</button></div>`;
    
    const switchProduct = () => { closeProductDetail(); setTimeout(() => openProductDetail(p), 300); };
    card.querySelector(".horiz-card-img-wrap").onclick = switchProduct;
    card.querySelector(".horiz-card-name").onclick = switchProduct;
    card.querySelector(".horiz-card-price").onclick = switchProduct;
    
    if (inStock) { card.querySelector(".horiz-card-add").onclick = (e) => { e.stopPropagation(); addToCart(p); const btn = e.currentTarget; btn.textContent = "✓"; setTimeout(() => { btn.textContent = "+ Cart"; }, 1000); }; }
    row.appendChild(card);
  });
  section.appendChild(row); return section;
}

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
    const mainImg = (Array.isArray(i.product.image) && i.product.image.length > 0) ? i.product.image[0] : "placeholder.jpg";
    const el = document.createElement("div"); el.className = "cart-item";
    el.innerHTML = `<img src="${mainImg}" alt="${i.product.name}" /><div class="ci-info"><div class="ci-name">${i.product.name}</div><div class="ci-sub">₹${finalPrice(i.product)} × ${i.qty}</div></div><button class="trash">🗑️</button>`;
    el.querySelector(".trash").onclick = () => removeFromCart(i.product.id); body.appendChild(el);
  });
  $("cartTotal").textContent = "₹" + cart.reduce((s, i) => s + finalPrice(i.product) * i.qty, 0); foot.classList.remove("hidden");
}

$("cartBtn").onclick = () => { renderCart(); $("cartOverlay").classList.remove("hidden"); lockScroll(); };
$("cartClose").onclick = () => { $("cartOverlay").classList.add("hidden"); unlockScroll(); };
$("cartOverlay").onclick = e => { if (e.target === $("cartOverlay")) { $("cartOverlay").classList.add("hidden"); unlockScroll(); } };
$("clearCartBtn").onclick = clearCart;

/* ════════════════════════════════════
   CHECKOUT OVERLAY (STEP 1, 2 & 3 WITH UTR VERIFY)
════════════════════════════════════ */
const UPI_ID = "kkfashion@nyes"; 
const STORE_NAME = "KKFashion"; 

function directBuyCheckout(p) {
  preventZoom();
  cart = [{ product: p, qty: 1 }]; save("knk_cart", cart); renderCartCount();
  $("prodDetail").classList.add("hidden"); $("prodDetail").classList.remove("closing"); currentDetailProduct = null;
  openCheckout();
}

$("checkoutBtn").onclick = () => { if (!cart.length) return; $("cartOverlay").classList.add("hidden"); openCheckout(); };

function resetCheckoutUI() {
  $("checkoutStep1").classList.remove("hidden");
  $("checkoutStep2").classList.add("hidden");
  if($("checkoutStep3")) $("checkoutStep3").classList.add("hidden");
  $("checkoutFooter").classList.remove("hidden");
  $("chkFooterTotalRow").classList.remove("hidden");
  $("step1NextBtn").classList.remove("hidden");
  $("step2PayBtn").classList.add("hidden");
  $("utrSection").classList.add("hidden"); 
  
  if($("chkUtr")) $("chkUtr").value = "";
  if($("dynamicUtrInput")) $("dynamicUtrInput").value = "";
  
  // Clear timer if running
  if(window.paymentInterval) clearInterval(window.paymentInterval);
  
  // Remove generated QR box if any
  const qrBox = $("qrDisplayBox");
  if(qrBox) qrBox.remove();
  
  $("step1Indicator").className = "step-item active"; $("step1Circle").innerHTML = "1";
  $("line1").className = "step-line"; 
  $("step2Indicator").className = "step-item"; $("step2Circle").innerHTML = "2";
  $("line2").className = "step-line"; 
  $("step3Indicator").className = "step-item"; $("step3Circle").innerHTML = "3";
}

function openCheckout() {
  lockScroll(); 
  resetCheckoutUI();
  const total = cart.reduce((s, i) => s + finalPrice(i.product) * i.qty, 0);
  $("chkTotalAmt").textContent = "₹" + total;
  $("checkoutOverlay").classList.remove("hidden");
}

/* SMART BACK BUTTON LOGIC (FOR TOP HEADER ARROW) */
$("closeCheckout").onclick = () => { 
  // Agar QR code dikh raha hai (Step 2.5), toh Payment Options par wapas jao
  if (!$("utrSection").classList.contains("hidden")) {
      $("utrSection").classList.add("hidden");
      $("step2PayBtn").classList.remove("hidden");
      if(window.paymentInterval) clearInterval(window.paymentInterval);
      const qrBox = $("qrDisplayBox");
      if(qrBox) qrBox.remove();
  }
  // Agar Payment Options dikh rahe hain (Step 2), toh Address form (Step 1) par wapas jao
  else if (!$("checkoutStep2").classList.contains("hidden")) {
      $("checkoutStep2").classList.add("hidden");
      $("checkoutStep1").classList.remove("hidden");
      $("step1NextBtn").classList.remove("hidden");
      $("step2PayBtn").classList.add("hidden");
      $("chkFooterTotalRow").classList.remove("hidden");

      // Stepper UI reset
      $("step2Indicator").classList.remove("active");
      $("step1Indicator").classList.remove("completed");
      $("step1Indicator").classList.add("active");
      $("line1").classList.remove("completed");
      $("step1Circle").innerHTML = "1";
  }
  // Agar Step 1 par hi hain, toh poora Checkout Popup band kar do
  else {
      $("checkoutOverlay").classList.add("hidden"); 
      unlockScroll(); 
  }
};

// Adjust top back arrow style dynamically
if($("closeCheckout")) {
    $("closeCheckout").style.position = "absolute";
    $("closeCheckout").style.left = "15px";
}

// STEP 1 -> STEP 2
$("step1NextBtn").onclick = () => {
  const name = $("chkName").value.trim(), mobile = $("chkMobile").value.trim(), address = $("chkAddress").value.trim(), state = $("chkState").value.trim(), pincode = $("chkPincode").value.trim();
  if(!name || !mobile || !address || !state || !pincode) { alert("Kripya sabhi zaroori jankari bharein!"); return; }
  if(mobile.length < 10 || isNaN(mobile)) { alert("Mobile number galat hai!"); return; }

  // Transition to Step 2
  $("checkoutStep1").classList.add("hidden");
  $("checkoutStep2").classList.remove("hidden");
  
  $("step1NextBtn").classList.add("hidden");
  $("step2PayBtn").classList.remove("hidden");
  $("chkFooterTotalRow").classList.add("hidden");

  // Stepper UI
  $("step1Indicator").classList.remove("active"); $("step1Indicator").classList.add("completed");
  $("step1Circle").innerHTML = "✔"; $("line1").classList.add("completed");
  $("step2Indicator").classList.add("active");

  renderStep2();
};

function renderStep2() {
  if (!cart.length) return;
  const item = cart[0]; 
  const p = item.product;
  const mainImg = (Array.isArray(p.image) && p.image.length > 0) ? p.image[0] : (typeof p.image === 'string' ? p.image : "placeholder.jpg");
  
  $("chkStep2Img").src = mainImg;
  $("chkStep2Qty").value = item.qty > 7 ? 7 : item.qty; 
  
  updateStep2Summary();

  $("chkStep2Qty").onchange = (e) => {
    item.qty = parseInt(e.target.value);
    save("knk_cart", cart); renderCartCount();
    updateStep2Summary();
  };
}

function updateStep2Summary() {
  let actualTotal = 0;
  let finalTotal = 0;
  cart.forEach(i => {
     actualTotal += i.product.price * i.qty;
     finalTotal += finalPrice(i.product) * i.qty;
  });
  
  $("billActual").textContent = "₹" + actualTotal;
  $("billFinal").textContent = "₹" + finalTotal;
  
  if (actualTotal > 0) {
     const discPercent = Math.round(((actualTotal - finalTotal) / actualTotal) * 100);
     $("billDiscount").textContent = discPercent + "% off";
  }

  // Update COD Alert Details
  const advance = Math.round(finalTotal * 0.25);
  const balance = finalTotal - advance;
  $("codAdvanceAmt").textContent = "₹" + advance;
  $("codBalanceAmt").textContent = "₹" + balance;
}

// Payment Option Toggle Logic
document.querySelectorAll('input[name="payMethod"]').forEach(radio => {
  radio.addEventListener("change", (e) => {
    
    // Clear previous UTR status and restore standard pay button
    $("step2PayBtn").classList.remove("hidden");
    $("utrSection").classList.add("hidden");
    if(window.paymentInterval) clearInterval(window.paymentInterval);
    const qrBox = $("qrDisplayBox");
    if(qrBox) qrBox.remove(); // Remove QR box if payment method is changed

    if (e.target.value === "COD") {
       $("codWarningBox").classList.remove("hidden");
       $("step2PayBtn").textContent = "Pay 25% Advance";
    } else {
       $("codWarningBox").classList.add("hidden");
       $("step2PayBtn").textContent = "Pay 100% Now";
    }
  });
});

// PAY BUTTON CLICK -> SHOW QR CODE INSTEAD OF REDIRECT
$("step2PayBtn").onclick = () => {
  const payMethod = $("payPrepaid").checked ? "Prepaid" : "COD";
  let finalTotal = 0;
  cart.forEach(i => finalTotal += finalPrice(i.product) * i.qty);
  
  let amountPaid = payMethod === "Prepaid" ? finalTotal : Math.round(finalTotal * 0.25);

  // HIDE PAY BUTTON AND SHOW UTR INPUT SECTION
  $("step2PayBtn").classList.add("hidden");
  $("utrSection").classList.remove("hidden");

  // Fix Scrolling issue by allowing native scroll
  $("checkoutStep2").style.overflowY = "auto";
  $("checkoutStep2").style.paddingBottom = "50px"; 

  // Hide original UTR box completely so we don't have duplicates
  let origUtrBox = $("chkUtr");
  if (origUtrBox) origUtrBox.style.display = "none";

  // Remove existing QR box if present
  let existingQr = document.getElementById("qrDisplayBox");
  if(existingQr) existingQr.remove();

  // Inject NEW QR Code Box dynamically
  let qrContainer = document.createElement("div");
  qrContainer.id = "qrDisplayBox";
  qrContainer.style.cssText = "position:relative; text-align:center; background:#fff; padding:15px; border-radius:12px; margin-bottom:20px; border: 1px solid #e0e0e0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);";
  
  // Insert right before UTR section's first child
  $("utrSection").insertBefore(qrContainer, $("utrSection").firstChild);
  
  qrContainer.innerHTML = `
      <button id="qrBackBtn" style="position:absolute; top:10px; left:10px; background:var(--bg); border:1px solid #ddd; font-size:18px; cursor:pointer; color:#333; padding:5px 10px; border-radius:6px; font-weight:bold; display:flex; align-items:center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index:10;">
        ⬅
      </button>

      <h4 style="color:#111; margin-top:5px; margin-bottom:5px; font-size:16px;">Scan To Pay: <span style="color:#e05555; font-weight:900;">₹${amountPaid}</span></h4>
      
      <div id="paymentTimer" style="color:#d9534f; font-weight:bold; font-size:14px; margin-bottom:10px; background:#fff3f3; padding:5px; border-radius:5px; display:inline-block;">Time left: 05:00</div>
      
      <br>
      <img src="62673.png" alt="QR Code Scanner" style="width:180px; height:auto; max-height:220px; object-fit:contain; border-radius:8px; margin-bottom:10px; border:2px solid #f0f0f0; padding:5px;" />
      
      <div style="color:#666; font-size:12px; margin-bottom:8px; text-transform:uppercase;">Or Pay via UPI ID</div>
      
      <div id="copyUpiBtn" style="font-weight:bold; font-size:15px; color:#333; background:#f9f9f9; padding:8px 15px; border-radius:6px; border:1px dashed #ccc; display:inline-flex; align-items:center; gap:8px; cursor:pointer; margin-bottom:12px; transition:0.3s;">
          ${UPI_ID} <span style="font-size:12px; background:var(--primary); color:#fff; padding:3px 8px; border-radius:4px;">📋 Copy</span>
      </div>
      
      <div style="font-size:12px; color:#d9534f; margin-top:5px; padding:8px; background:#fff3f3; border-radius:6px; font-weight:bold;">
        ⚠️ Niche wale box me strictly 12-digit ka UTR number dalein!
      </div>

      <input type="tel" id="dynamicUtrInput" placeholder="Enter 12-Digit UTR No." maxlength="12" style="width:100%; padding:14px; margin-top:15px; border:2px solid #ccc; border-radius:8px; font-size:16px; text-align:center; font-weight:bold; box-sizing:border-box; letter-spacing:2px; color:#111; background:#fff;" />
  `;

  // Strict 12 digit validation on dynamic input
  let dynUtr = $("dynamicUtrInput");
  dynUtr.oninput = function() {
      this.value = this.value.replace(/[^0-9]/g, '').slice(0, 12);
  };

  // QR Box Back Button Logic
  document.getElementById("qrBackBtn").onclick = function() {
      $("utrSection").classList.add("hidden");
      $("step2PayBtn").classList.remove("hidden");
      if(window.paymentInterval) clearInterval(window.paymentInterval);
      qrContainer.remove();
  };

  // Copy UPI ID Logic
  document.getElementById("copyUpiBtn").onclick = function() {
      navigator.clipboard.writeText(UPI_ID).then(() => {
          const btn = document.getElementById("copyUpiBtn");
          btn.innerHTML = `${UPI_ID} <span style="font-size:12px; background:#4cc968; color:#fff; padding:3px 8px; border-radius:4px;">✅ Copied!</span>`;
          setTimeout(() => { 
              btn.innerHTML = `${UPI_ID} <span style="font-size:12px; background:var(--primary); color:#fff; padding:3px 8px; border-radius:4px;">📋 Copy</span>`; 
          }, 2000);
      }).catch(err => alert("Copy nahi ho paya, manually type karein."));
  };

  // Timer Logic (5 Minutes)
  let timeLeft = 300; 
  const timerDisplay = document.getElementById("paymentTimer");
  
  if(window.paymentInterval) clearInterval(window.paymentInterval);
  
  window.paymentInterval = setInterval(() => {
      timeLeft--;
      let minutes = Math.floor(timeLeft / 60);
      let seconds = timeLeft % 60;
      timerDisplay.innerText = "Time left: 0" + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;

      if (timeLeft <= 0) {
          clearInterval(window.paymentInterval);
          timerDisplay.innerText = "Time expired! Kripya page refresh karein.";
          timerDisplay.style.color = "red";
      }
  }, 1000);
};

// FINAL CONFIRM UTR & SAVE TO FIREBASE
$("confirmOrderBtn").onclick = () => {
  // Grab UTR from our dynamically visible box, fallback to old box if needed
  let utrValue = "";
  let dynUtr = $("dynamicUtrInput");
  let oldUtr = $("chkUtr");

  if (dynUtr) {
      utrValue = dynUtr.value.trim();
  } else if (oldUtr) {
      utrValue = oldUtr.value.trim();
  }
  
  // STRICT CHECK: Ensure length is exactly 12 and contains only digits
  if (utrValue.length !== 12 || !/^\d+$/.test(utrValue)) {
    alert("Galat UTR! Kripya exactly 12-digit ka sahi numeric UTR / Reference Number daalein (Aapne " + utrValue.length + " anko ka dala hai).");
    return;
  }

  const payMethod = $("payPrepaid").checked ? "Prepaid" : "COD";
  let finalTotal = 0;
  cart.forEach(i => finalTotal += finalPrice(i.product) * i.qty);
  
  let amountPaid = 0;
  let balanceDue = 0;
  
  if (payMethod === "Prepaid") {
    amountPaid = finalTotal;
    balanceDue = 0;
  } else {
    amountPaid = Math.round(finalTotal * 0.25);
    balanceDue = finalTotal - amountPaid;
  }

  // Prepare Data for Firebase
  const orderData = { 
    name: $("chkName").value.trim(), 
    mobile: $("chkMobile").value.trim(), 
    address: $("chkAddress").value.trim(), 
    state: $("chkState").value.trim(), 
    pincode: $("chkPincode").value.trim(), 
    landmark: $("chkLandmark").value.trim(), 
    items: cart, 
    totalAmount: finalTotal,
    paymentMethod: payMethod,
    amountPaid: amountPaid,
    balanceDue: balanceDue,
    utrNumber: utrValue,
    status: "Recent" 
  };

  const btn = $("confirmOrderBtn"); btn.textContent = "Placing Order...";
  if(window.paymentInterval) clearInterval(window.paymentInterval); // Stop timer on success
  
  // Save to Firebase
  if (window.saveOrderToFirebase) {
    window.saveOrderToFirebase(orderData).then(success => {
      if (success) {
        showStep3Success(payMethod, amountPaid, balanceDue);
        if (window.fetchOrdersFromFirebase) window.fetchOrdersFromFirebase();
      } else {
        alert("Server error. Please try again.");
        btn.textContent = "Confirm & Place Order";
      }
    });
  } else {
      // Fallback if firebase function not present
      showStep3Success(payMethod, amountPaid, balanceDue);
  }
};

// STEP 3 SUCCESS SCREEN
function showStep3Success(payMethod, paid, due) {
  $("checkoutStep2").classList.add("hidden");
  $("checkoutStep3").classList.remove("hidden");
  $("checkoutFooter").classList.add("hidden"); 
  
  $("step2Indicator").classList.remove("active"); $("step2Indicator").classList.add("completed");
  $("step2Circle").innerHTML = "✔"; $("line2").classList.add("completed");
  $("step3Indicator").classList.add("active");

  let sumHtml = `<strong style="font-size:14px; color:var(--primary);">Payment Mode: ${payMethod}</strong><br><br>`;
  if(payMethod === "COD") {
    sumHtml += `<strong>Safety Deposit Paid (25%):</strong> ₹${paid}<br>`;
    sumHtml += `<strong style="color:var(--destructive)">Balance Cash on Delivery (75%):</strong> ₹${due}`;
  } else {
    sumHtml += `<strong>Total Paid Online:</strong> ₹${paid}<br>`;
    sumHtml += `<strong style="color:#4cc968">No pending dues!</strong>`;
  }
  $("successOrderSummary").innerHTML = sumHtml;
  clearCart();
}

$("successCloseBtn").onclick = () => {
  $("checkoutOverlay").classList.add("hidden");
  unlockScroll();
  resetCheckoutUI();
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
    card.innerHTML = `<div class="cat-mgmt-head"><span class="cat-mgmt-name">${cat.name}</span><div class="cat-mgmt-actions"><button class="cat-action-btn edit-cat-btn">✏️ Edit</button><button class="cat-action-btn del del-cat-btn">🗑️ Delete</button></div></div>
      <div class="cat-sub-section"><div class="cat-sub-label">SUB-CATEGORIES</div><div class="chips" id="subChips_${cat.id}"></div><div class="inline-row"><input class="field sub-inp" id="subInp_${cat.id}" placeholder="Sub-category naam" /><button class="btn-primary sm-btn add-sub-btn" data-id="${cat.id}">+ Add</button></div></div>`;
    const chipsEl = card.querySelector(`#subChips_${cat.id}`);
    (cat.subCategories || []).forEach(sub => {
      const chip = document.createElement("span"); chip.className = "chip"; chip.innerHTML = `${sub}<button class="chip-btn edt">✏️</button><button class="chip-btn del">✕</button>`;
      chip.querySelector(".edt").onclick = () => { const n = prompt(`"${sub}" ka naya naam:`, sub); if (!n || !n.trim()) return; const idx = cat.subCategories.indexOf(sub); if (idx > -1) cat.subCategories[idx] = n.trim().toUpperCase(); saveCategories(); renderAdmin(); if (activeMainCatId === cat.id) { activeSubCat = "All"; renderSubCats(); renderProducts(); } };
      chip.querySelector(".del").onclick = () => { if (!confirm(`"${sub}" delete karein?`)) return; cat.subCategories = cat.subCategories.filter(x => x !== sub); saveCategories(); renderAdmin(); if (activeMainCatId === cat.id) { activeSubCat = "All"; renderSubCats(); renderProducts(); } };
      chipsEl.appendChild(chip);
    });
    card.querySelector(".add-sub-btn").onclick = () => { const inp = card.querySelector(`#subInp_${cat.id}`); const v = inp.value.trim().toUpperCase(); if (!v) return; if ((cat.subCategories || []).some(x => x.toUpperCase() === v)) { alert("Pehle se exist karti hai!"); return; } cat.subCategories = [...(cat.subCategories || []), v]; saveCategories(); inp.value = ""; renderAdmin(); if (activeMainCatId === cat.id) renderSubCats(); };
    card.querySelector(".edit-cat-btn").onclick = () => { const n = prompt(`"${cat.name}" ka naya naam:`, cat.name); if (!n || !n.trim()) return; cat.name = n.trim().toUpperCase(); saveCategories(); renderAdmin(); renderMainCats(); };
    card.querySelector(".del-cat-btn").onclick = () => { if (!confirm(`"${cat.name}" category delete karein?`)) return; mainCategories = mainCategories.filter(c => c.id !== cat.id); if (activeMainCatId === cat.id) { activeMainCatId = mainCategories.length > 0 ? mainCategories[0].id : null; activeSubCat = "All"; } saveCategories(); renderAdmin(); renderMainCats(); renderSubCats(); renderProducts(); };
    list.appendChild(card);
  });
}

$("addCatBtn").onclick = () => { const inp = $("newCatName"); const v = inp.value.trim().toUpperCase(); if (!v) return; if (mainCategories.some(c => c.name.toUpperCase() === v)) { alert("Pehle se exist karti hai!"); return; } mainCategories.push({ id: genId(), name: v, subCategories: [] }); saveCategories(); inp.value = ""; renderAdmin(); renderMainCats(); };

function syncAddProductDropdowns() { const pMainCat = $("pMainCat"); pMainCat.innerHTML = ""; mainCategories.forEach(cat => { const o = document.createElement("option"); o.value = cat.id; o.textContent = cat.name; pMainCat.appendChild(o); }); onMainCatChange(); }
window.onMainCatChange = function() { const cat = getCat($("pMainCat").value); const group = $("subCatGroup"); const pSub = $("pSubCat"); if (!cat || !cat.subCategories || cat.subCategories.length === 0) { group.style.display = "none"; return; } group.style.display = ""; pSub.innerHTML = ""; cat.subCategories.forEach(s => { const o = document.createElement("option"); o.value = s; o.textContent = s; pSub.appendChild(o); }); };
$("pInStock").addEventListener("change", function() { const lbl = $("pStockLabel"); lbl.textContent = this.checked ? "In Stock" : "Out of Stock"; lbl.className = "stock-label " + (this.checked ? "in" : "out"); });

function syncFilterDropdown() { const sel = $("adminFilterCat"); sel.innerHTML = '<option value="ALL">All Categories</option>'; mainCategories.forEach(cat => { const o = document.createElement("option"); o.value = cat.id; o.textContent = cat.name; sel.appendChild(o); }); }

// ═════ ADMIN ORDER MANAGEMENT ═════
let liveOrders = [];
let currentOrderTab = "Recent";

window.renderAdminOrders = function(orders) { liveOrders = orders; renderOrdersByTab(); };

function renderOrdersByTab() {
  const list = $("adminOrdersList");
  if (!list) return;

  let filtered = liveOrders.filter(o => (o.status || "Recent") === currentOrderTab);
  if (filtered.length === 0) { list.innerHTML = `<p class='empty'>Koi order nahi hai is tab mein.</p>`; return; }
  list.innerHTML = "";
  
  filtered.forEach(o => {
    const itemsHtml = o.items.map(i => {
      const mainImg = (Array.isArray(i.product.image) && i.product.image.length > 0) ? i.product.image[0] : (typeof i.product.image === 'string' ? i.product.image : "placeholder.jpg");
      return `<div class="order-item-row"><img src="${mainImg}" class="order-item-img" alt="${i.product.name}" /><span>${i.product.name} <strong style="color:var(--primary)">(x${i.qty})</strong></span></div>`;
    }).join("");
    
    const dateStr = o.timestamp && o.timestamp.seconds ? new Date(o.timestamp.seconds * 1000).toLocaleString() : "Just Now";
    
    // Pay Method Badge and UTR Display
    const payBadge = o.paymentMethod === "COD" 
       ? `<span style="background:var(--destructive); color:#fff; padding:3px 8px; border-radius:4px; font-size:10px; margin-left:8px;">C.O.D (Due: ₹${o.balanceDue})</span>` 
       : `<span style="background:#4cc968; color:#fff; padding:3px 8px; border-radius:4px; font-size:10px; margin-left:8px; color:black; font-weight:bold;">PREPAID</span>`;
    
    const utrText = o.utrNumber ? `<div style="margin-top:4px; font-size:11px; color:var(--primary);">UTR/Ref: <strong>${o.utrNumber}</strong></div>` : "";

    const div = document.createElement("div"); div.className = "admin-order-card";
    div.innerHTML = `
      <div class="order-head">
        <span class="order-id">ID: ${o.id ? o.id.substring(0,8) : 'NEW'}...</span>
        <span class="order-total">₹${o.totalAmount}</span>
      </div>
      <div class="order-cust">
        <strong>${o.name}</strong> (${o.mobile}) ${payBadge}<br>
        ${o.address}, ${o.state} - ${o.pincode}<br>
        ${utrText}
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
      </div>`;
    list.appendChild(div);
  });

  document.querySelectorAll(".status-select").forEach(sel => { sel.addEventListener("change", async (e) => { const id = e.target.getAttribute("data-id"); const newStatus = e.target.value; const order = liveOrders.find(x => x.id === id); if(order) order.status = newStatus; renderOrdersByTab(); if (window.updateOrderStatusInFirebase) await window.updateOrderStatusInFirebase(id, newStatus); }); });
  document.querySelectorAll(".del-order-btn").forEach(btn => { btn.addEventListener("click", async (e) => { const id = e.currentTarget.getAttribute("data-id"); if(!confirm("Kya aap sach me is order ko delete karna chahte hain?")) return; liveOrders = liveOrders.filter(x => x.id !== id); renderOrdersByTab(); if (window.deleteOrderFromFirebase) await window.deleteOrderFromFirebase(id); }); });
}

document.querySelectorAll(".admin-tab").forEach(tab => { tab.addEventListener("click", (e) => { document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active")); e.currentTarget.classList.add("active"); currentOrderTab = e.currentTarget.getAttribute("data-tab"); renderOrdersByTab(); }); });

function renderAdminProducts() {
  $("adminProdTitle").textContent = `Products (${products.length})`; const filterCat = $("adminFilterCat").value || "ALL"; const list = $("adminProducts"); list.innerHTML = "";
  const filtered = filterCat === "ALL" ? products : products.filter(p => p.mainCategoryId === filterCat);
  filtered.forEach(p => {
    const price = finalPrice(p), inStock = p.inStock !== false, cat = getCat(p.mainCategoryId), catName = cat ? cat.name : "—", subLabel = p.subCategory ? ` · ${p.subCategory}` : "";
    const mainImg = (Array.isArray(p.image) && p.image.length > 0) ? p.image[0] : "placeholder.jpg";
    const el = document.createElement("div"); el.className = "admin-prod";
    el.innerHTML = `<img src="${mainImg}" alt="${p.name}" /><div class="ap-info"><div class="ap-name">${p.name}</div><div class="ap-sub">${catName}${subLabel}</div><div class="ap-price">₹${price} ${p.discount > 0 ? `(${p.discount}% off)` : ''} · <span style="color:${inStock ? '#4cc968' : '#e05555'}">${inStock ? 'In Stock' : 'Out of Stock'}</span></div></div><div class="ap-actions"><button class="edit-btn">✏️</button><button class="trash">🗑️</button></div>`;
    el.querySelector(".edit-btn").onclick = () => openEditModal(p); el.querySelector(".trash").onclick = () => { if (!confirm("Delete karein?")) return; products = products.filter(x => x.id !== p.id); renderProducts(); renderAdmin(); if (window.deleteProductFromFirebase) window.deleteProductFromFirebase(p.id); }; list.appendChild(el);
  });
}

window.renderAdmin = function() {
  renderCatMgmt(); syncAddProductDropdowns(); syncFilterDropdown(); renderAdminProducts();
  if ($("updatePinBtn")) { $("updatePinBtn").onclick = () => { const newPin = $("newAdminPin").value.trim(); if (newPin.length < 4) { alert("PIN kam se kam 4 digit ka hona chahiye!"); return; } ADMIN_PIN = newPin; save("admin_pin", ADMIN_PIN); alert("Success! Naya Admin PIN set ho gaya hai: " + ADMIN_PIN); $("newAdminPin").value = ""; }; }
  if (window.fetchOrdersFromFirebase) window.fetchOrdersFromFirebase();
};

function openEditModal(p) { 
  editingProductId = p.id; 
  $("editPName").textContent = p.name; 
  let imgArray = Array.isArray(p.image) ? p.image : [p.image];
  $("editPImage").value = imgArray.join(", "); 
  $("editPPrice").value = p.price; 
  $("editPDiscount").value = p.discount || 0; 
  $("editPExtra").value = p.extra || 0; 
  const inStock = p.inStock !== false; $("editInStock").checked = inStock; 
  const lbl = $("editStockLabel"); lbl.textContent = inStock ? "In Stock" : "Out of Stock"; lbl.className = "stock-label " + (inStock ? "in" : "out"); 
  $("editModal").classList.remove("hidden"); 
}

$("editInStock").addEventListener("change", function() { const lbl = $("editStockLabel"); lbl.textContent = this.checked ? "In Stock" : "Out of Stock"; lbl.className = "stock-label " + (this.checked ? "in" : "out"); });
$("editClose").onclick = () => { $("editModal").classList.add("hidden"); editingProductId = null; };

$("saveEditBtn").onclick = () => {
  if (!editingProductId) return; 
  const newPrice = Number($("editPPrice").value), newDiscount = Number($("editPDiscount").value) || 0, newExtra = Number($("editPExtra").value) || 0, newInStock = $("editInStock").checked;
  const rawImage = $("editPImage").value.trim();
  const newImgArray = rawImage.split(",").map(s => s.trim()).filter(Boolean);
  
  if (!newPrice || newPrice <= 0 || newImgArray.length === 0) { alert("Sahi Image aur Price daalein!"); return; } 
  const idx = products.findIndex(p => p.id === editingProductId);
  
  if (idx > -1) { 
    products[idx] = { ...products[idx], image: newImgArray, price: newPrice, discount: newDiscount, extra: newExtra, inStock: newInStock }; 
    renderProducts(); renderAdmin(); 
  }
  
  if (window.updateProductInFirebase) { 
    window.updateProductInFirebase(editingProductId, { imageUrl: newImgArray, price: newPrice, discount: newDiscount, extra: newExtra, inStock: newInStock }); 
  }
  
  $("editModal").classList.add("hidden"); editingProductId = null;
};

/* ════════════════════════════════════
   FULLSCREEN VIEWER LOGIC
════════════════════════════════════ */
$("closeViewerBtn").onclick = () => { 
  $("imageViewer").classList.add("hidden"); 
  preventZoom(); 
};
$("imageViewer").onclick = (e) => { 
  if (e.target === $("imageViewer") || e.target === $("fullImage")) { 
    $("imageViewer").classList.add("hidden"); 
    preventZoom(); 
  } 
};

/* ════════════════════════════════════
   INIT
════════════════════════════════════ */
preventZoom(); 
renderCartCount();
