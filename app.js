// ===== Firebase Setup =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEBIKehowe8KjYFe2L8wegHOpYnuBtx2k",
  authDomain: "kk-fashion-267cc.firebaseapp.com",
  projectId: "kk-fashion-267cc",
  storageBucket: "kk-fashion-267cc.firebasestorage.app",
  messagingSenderId: "442266988581",
  appId: "1:442266988581:web:c72f318b2ce17c2c580fcc",
  measurementId: "G-8CVPWV26LF"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const storage = getStorage(app);

// ===== Config =====
const WHATSAPP_NUMBER = "9950701758";
const ADMIN_PIN = "8619";

// ===== Default data =====
const DEFAULT_CATEGORIES = ["Combos", "T-Shirt", "Shirt", "Pant"];
const SAMPLE_PRODUCTS = [
  { id: "p1", name: "Classic White T-Shirt", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80", price: 599, discount: 20, extra: 0, category: "T-Shirt" },
  { id: "p2", name: "Denim Casual Shirt", image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80", price: 1299, discount: 15, extra: 49, category: "Shirt" },
  { id: "p3", name: "Slim Fit Pant", image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80", price: 999, discount: 10, extra: 0, category: "Pant" },
  { id: "p4", name: "Shirt + Pant Combo", image: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=600&q=80", price: 1999, discount: 25, extra: 99, category: "Combos" },
];

// ===== State =====
const load = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let categories = load("knk_categories", DEFAULT_CATEGORIES);
let products   = load("knk_products",   SAMPLE_PRODUCTS);
let cart       = load("knk_cart",       []);
let activeCat  = "All";

const finalPrice = (p) => Math.round(p.price - (p.price * p.discount) / 100 + p.extra);
const uid = () => "p" + Date.now() + Math.floor(Math.random() * 1000);
const $ = (id) => document.getElementById(id);

// ===== Splash =====
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

// ===== Categories =====
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

// ===== Products =====
function renderProducts() {
  $("activeTitle").textContent = activeCat;
  const grid = $("products");
  const list = activeCat === "All" ? products : products.filter((p) => p.category === activeCat);
  if (list.length === 0) { grid.innerHTML = '<p class="empty">No products here yet.</p>'; return; }
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
          <button class="btn-outline cart-add-btn">🛒 Cart</button>
          <button class="btn-primary buy-btn">💬 Buy</button>
        </div>
      </div>`;
    el.querySelector(".cart-add-btn").onclick = () => addToCart(p);
    el.querySelector(".buy-btn").onclick = () => {
      const text = encodeURIComponent(`Hello! I want to buy: ${p.name} - ₹${price}`);
      window.open(`https://wa.me/91${WHATSAPP_NUMBER}?text=${text}`, "_blank");
    };
    grid.appendChild(el);
  });
}

// ===== Cart =====
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

// ===== Admin 7-tap =====
let tapCount = 0, tapTimer = null;
$("logoBtn").onclick = () => {
  tapCount++; if (tapTimer) clearTimeout(tapTimer);
  if (tapCount >= 7) { tapCount = 0; openPin(); return; }
  tapTimer = setTimeout(() => { tapCount = 0; }, 1200);
};

// ===== PIN =====
function openPin() { $("pinInput").value = ""; $("pinError").classList.add("hidden"); $("adminPin").classList.remove("hidden"); $("pinInput").focus(); }
$("pinClose").onclick = () => $("adminPin").classList.add("hidden");
$("pinUnlock").onclick = tryUnlock;
$("pinInput").onkeydown = (e) => { if (e.key === "Enter") tryUnlock(); };
function tryUnlock() {
  if ($("pinInput").value === ADMIN_PIN) { $("adminPin").classList.add("hidden"); openAdmin(); }
  else { $("pinError").classList.remove("hidden"); $("pinInput").style.borderColor = "#e05555"; setTimeout(() => { $("pinInput").style.borderColor = ""; }, 800); }
}

// ===== Admin Panel =====
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
    el.querySelector(".trash").onclick = () => { products = products.filter((x) => x.id !== p.id); save("knk_products", products); renderProducts(); renderAdmin(); };
    list.appendChild(el);
  });
}
$("addCatBtn").onclick = () => {
  const v = $("newCat").value.trim(); if (!v) return;
  if (!categories.some((x) => x.toLowerCase() === v.toLowerCase())) categories.push(v);
  save("knk_categories", categories); $("newCat").value = "";
  renderCats(); renderProducts(); renderAdmin();
};

// ===== Firebase Storage Upload & Product Add =====
$("addProductBtn").onclick = () => {
  const name = $("pName").value.trim(); 
  const price = Number($("pPrice").value);
  const fileInput = $("pImageFile");
  const file = fileInput.files[0];

  if (!name || !price || !file) {
    alert("Please provide a product name, price, and select an image file.");
    return;
  }

  // Update button to show upload state
  const btn = $("addProductBtn");
  btn.textContent = "Uploading Image...";
  btn.disabled = true;

  // Create a unique storage reference
  const storageRef = ref(storage, 'products/' + Date.now() + '_' + file.name);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on('state_changed', 
    (snapshot) => {
      // You can add a progress bar indicator here if you want in the future
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log('Upload is ' + progress + '% done');
    }, 
    (error) => {
      console.error("Firebase upload failed:", error);
      alert("Failed to upload image. Please try again.");
      btn.textContent = "Add Product";
      btn.disabled = false;
    }, 
    async () => {
      // Upload complete, get download URL
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      
      // Save product with Firebase URL
      products.unshift({ 
        id: uid(), 
        name, 
        image: downloadURL, 
        price, 
        discount: Number($("pDiscount").value) || 0, 
        extra: Number($("pExtra").value) || 0, 
        category: $("pCategory").value || categories[0] || "Other" 
      });
      
      save("knk_products", products);
      
      // Reset fields
      $("pName").value = "";
      $("pPrice").value = "";
      $("pDiscount").value = "";
      $("pExtra").value = "";
      fileInput.value = "";
      
      // Reset button
      btn.textContent = "Add Product";
      btn.disabled = false;

      renderProducts(); 
      renderAdmin();
    }
  );
};

// ===== Init =====
renderCats(); renderProducts(); renderCartCount();
