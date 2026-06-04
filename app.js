const WHATSAPP_NUMBER = "9950701758";
const ADMIN_PIN = "8619";

const DEFAULT_CATEGORIES = ["Combos", "T-Shirt", "Shirt", "Pant"];

const load = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let categories = load("knk_categories", DEFAULT_CATEGORIES);
let products   = []; // 🔥 NAYA: Ab data local se nahi, Firebase se aayega!
let cart       = load("knk_cart",       []);
let activeCat  = "All";

const finalPrice = (p) => Math.round(p.price - (p.price * p.discount) / 100 + (p.extra || 0));
const uid = () => "p" + Date.now() + Math.floor(Math.random() * 1000);
const $ = (id) => document.getElementById(id);

// 🔥 NAYA FUNCTION: HTML wali file Firebase se data lakar isko degi 🔥
window.updateProductsFromFirebase = function(firebaseProducts) {
  products = firebaseProducts;
  renderProducts();
  if(!$("adminPanel").classList.contains("hidden")) renderAdmin();
};

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const splash = $("splash");
    splash.style.transition = "opacity 0.5s ease";
    splash.style.opacity = "0";
    setTimeout(() => { splash.classList.add("hidden"); $("app").classList.remove("hidden"); }, 500);
  }, 2500);
});

function renderCats() {
  const wrap = $("cats"); wrap.innerHTML = "";
  ["All", ...categories].forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "cat" + (c === activeCat ? " active" : "");
    b.textContent = c;
    b.style.animationDelay = (i * 0.06) + "s";
    b.style.animation = "fadeUp 0.4s ease both";
    b.onclick = () => { activeCat = c; renderCats(); renderProducts(); };
    wrap.appendChild(b);
  });
}

function renderProducts() {
  $("activeTitle").textContent = activeCat;
  const grid = $("products");
  const list = activeCat === "All" ? products : products.filter((p) => p.category === activeCat);
  if (list.length === 0) { grid.innerHTML = '<p class="empty">No products here yet. (Firebase loading...)</p>'; return; }
  grid.innerHTML = "";
  list.forEach((p, i) => {
    const price = finalPrice(p);
    const el = document.createElement("div");
    el.className = "product";
    el.style.animationDelay = (i * 0.07) + "s";
    el.innerHTML = `
      <img src="${p.image}" alt="${p.name}" loading="lazy" />
      <div class="info">
        <div class="name">${p.name}</div>
        <div class="price-row">
          <span class="price">₹${price}</span>
          ${p.discount > 0 ? `<span class="strike">₹${p.price}</span><span class="off">${p.discount}% off</span>` : ""}
        </div>
        <div class="btn-row">
          <button class="btn-outline">🛒 Cart</button>
          <button class="btn-primary">💬 Buy</button>
        </div>
      </div>`;
    el.querySelector(".btn-outline").onclick = () => addToCart(p);
    el.querySelector(".btn-primary").onclick = () => {
      const text = encodeURIComponent(`Hello! I want to buy: ${p.name} - ₹${price}`);
      window.open(`https://wa.me/91${WHATSAPP_NUMBER}?text=${text}`, "_blank");
    };
    grid.appendChild(el);
  });
}

function addToCart(p) {
  const found = cart.find((i) => i.product.id === p.id);
  if (found) found.qty += 1; else cart.push({ product: p, qty: 1 });
  save("knk_cart", cart); renderCartCount(); renderCart();
  const btn = $("cartBtn");
  btn.style.color = "#C9A84C";
  setTimeout(() => { btn.style.color = ""; }, 600);
}
function removeFromCart(id) { cart = cart.filter((i) => i.product.id !== id); save("knk_cart", cart); renderCartCount(); renderCart(); }
function clearCart() { cart = []; save("knk_cart", cart); renderCartCount(); renderCart(); }
function renderCartCount() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = $("cartCount"); badge.textContent = count; badge.classList.toggle("hidden", count === 0);
}
function renderCart() {
  const body = $("cartItems"); const foot = $("cartFooter");
  if (cart.length === 0) { body.innerHTML = '<p class="empty">Cart is empty</p>'; foot.classList.add("hidden"); return; }
  body.innerHTML = "";
  cart.forEach((i) => {
    const el = document.createElement("div"); el.className = "cart-item";
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
  const total = cart.reduce((s, i) => s + finalPrice(i.product) * i.qty, 0);
  $("cartTotal").textContent = "₹" + total; foot.classList.remove("hidden");
}
$("cartBtn").onclick = () => { renderCart(); $("cartOverlay").classList.remove("hidden"); };
$("cartClose").onclick = () => $("cartOverlay").classList.add("hidden");
$("cartOverlay").onclick = (e) => { if (e.target === $("cartOverlay")) $("cartOverlay").classList.add("hidden"); };
$("clearCartBtn").onclick = clearCart;
$("checkoutBtn").onclick = () => {
  if (cart.length === 0) return;
  const total = cart.reduce((s, i) => s + finalPrice(i.product) * i.qty, 0);
  const lines = cart.map((i) => `${i.product.name} x${i.qty} = ₹${finalPrice(i.product) * i.qty}`).join("%0A");
  window.open(`https://wa.me/91${WHATSAPP_NUMBER}?text=Hello! My order:%0A${lines}%0A%0ATotal: ₹${total}`, "_blank");
};

let tapCount = 0, tapTimer = null;
$("logoBtn").onclick = () => {
  tapCount++; if (tapTimer) clearTimeout(tapTimer);
  if (tapCount >= 7) { tapCount = 0; openPin(); return; }
  tapTimer = setTimeout(() => { tapCount = 0; }, 1200);
};

function openPin() { $("pinInput").value = ""; $("pinError").classList.add("hidden"); $("adminPin").classList.remove("hidden"); $("pinInput").focus(); }
$("pinClose").onclick = () => $("adminPin").classList.add("hidden");
$("pinUnlock").onclick = tryUnlock;
$("pinInput").onkeydown = (e) => { if (e.key === "Enter") tryUnlock(); };
function tryUnlock() {
  if ($("pinInput").value === ADMIN_PIN) { $("adminPin").classList.add("hidden"); openAdmin(); }
  else { $("pinError").classList.remove("hidden"); $("pinInput").style.borderColor = "#e05555"; setTimeout(() => { $("pinInput").style.borderColor = ""; }, 800); }
}

function openAdmin() { renderAdmin(); $("adminPanel").classList.remove("hidden"); }
$("adminClose").onclick = () => $("adminPanel").classList.add("hidden");
function renderAdmin() {
  const chips = $("adminCats"); chips.innerHTML = "";
  categories.forEach((c) => {
    const el = document.createElement("span"); el.className = "chip";
    el.innerHTML = `${c} <button>🗑️</button>`;
    el.querySelector("button").onclick = () => { categories = categories.filter((x) => x !== c); save("knk_categories", categories); renderCats(); renderProducts(); renderAdmin(); };
    chips.appendChild(el);
  });
  const sel = $("pCategory"); sel.innerHTML = "";
  categories.forEach((c) => { const o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o); });
  $("adminProdTitle").textContent = `Products (${products.length})`;
  const list = $("adminProducts"); list.innerHTML = "";
  products.forEach((p) => {
    const el = document.createElement("div"); el.className = "admin-prod";
    el.innerHTML = `
      <img src="${p.image}" alt="${p.name}" />
      <div class="ap-info"><div class="ap-name">${p.name}</div><div class="ap-sub">${p.category} · ₹${p.price}</div></div>
      <button class="trash">🗑️</button>`;
    el.querySelector(".trash").onclick = () => { 
       // (Note: Abhi ke liye yeh sirf screen se hatega, Firebase se delete karne ka logic baad me lagana padega)
       products = products.filter((x) => x.id !== p.id); renderProducts(); renderAdmin(); 
    };
    list.appendChild(el);
  });
}
$("addCatBtn").onclick = () => {
  const v = $("newCat").value.trim(); if (!v) return;
  if (!categories.some((x) => x.toLowerCase() === v.toLowerCase())) categories.push(v);
  save("knk_categories", categories); $("newCat").value = "";
  renderCats(); renderProducts(); renderAdmin();
};

renderCats(); renderProducts(); renderCartCount();
