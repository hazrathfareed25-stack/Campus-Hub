const API = '/api';
let state = {
  token: localStorage.getItem('ch_token') || null,
  user: JSON.parse(localStorage.getItem('ch_user') || 'null'),
  page: 'home',
  listings: [],
  categories: [],
  currentListing: null,
  conversations: [],
  activeConvo: null,
  filters: { q: '', category: '', sort: 'newest' }
};

function authHeaders() {
  return state.token ? { 'Authorization': `Bearer ${state.token}` } : {};
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(opts.headers || {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function setUser(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('ch_token', token);
  localStorage.setItem('ch_user', JSON.stringify(user));
  renderNav();
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('ch_token');
  localStorage.removeItem('ch_user');
  renderNav();
  goTo('home');
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-root').appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
}

// ---------- ROUTER ----------
async function goTo(page, param) {
  state.page = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  window.scrollTo(0, 0);

  if (page === 'home') { document.getElementById('page-home').classList.add('active'); await loadHome(); }
  if (page === 'marketplace') { document.getElementById('page-marketplace').classList.add('active'); await loadMarketplace(); }
  if (page === 'product') { document.getElementById('page-product').classList.add('active'); await loadProduct(param); }
  if (page === 'sell') {
    if (!requireAuth()) return;
    document.getElementById('page-sell').classList.add('active');
  }
  if (page === 'chat') {
    if (!requireAuth()) return;
    document.getElementById('page-chat').classList.add('active');
    await loadConversations(param);
  }
  if (page === 'seller-dashboard') {
    if (!requireAuth()) return;
    document.getElementById('page-seller-dash').classList.add('active');
    await loadSellerDashboard();
  }
  if (page === 'buyer-dashboard') {
    if (!requireAuth()) return;
    document.getElementById('page-buyer-dash').classList.add('active');
    await loadBuyerDashboard();
  }
}

function requireAuth() {
  if (!state.token) {
    toast('Please log in first 👋', 'error');
    openAuthModal('login');
    return false;
  }
  return true;
}

// ---------- HOME ----------
async function loadHome() {
  try {
    if (!state.categories.length) {
      const { categories } = await api('/categories');
      state.categories = categories;
    }
    renderCategories(document.getElementById('home-categories'));

    const { listings } = await api('/listings?sort=newest');
    renderProductGrid(document.getElementById('home-products'), listings.slice(0, 4));
  } catch (e) { toast(e.message, 'error'); }
}

function renderCategories(container) {
  container.innerHTML = state.categories.map(c => `
    <div class="cat-card" onclick="filterByCategory('${c.id}')">
      <span class="cat-emoji">${c.emoji}</span>
      <span class="label">${c.label}</span>
    </div>
  `).join('');
}

function filterByCategory(catId) {
  state.filters.category = catId;
  goTo('marketplace');
}

// ---------- MARKETPLACE ----------
async function loadMarketplace() {
  const wrap = document.getElementById('marketplace-controls');
  if (!state.categories.length) {
    const { categories } = await api('/categories');
    state.categories = categories;
  }
  wrap.innerHTML = `
    <input id="search-input" type="text" placeholder="🔍 Search for textbooks, cycles, calculators..." value="${state.filters.q}">
    <select id="cat-select">
      <option value="">All categories</option>
      ${state.categories.map(c => `<option value="${c.id}" ${state.filters.category === c.id ? 'selected' : ''}>${c.emoji} ${c.label}</option>`).join('')}
    </select>
    <select id="sort-select">
      <option value="newest" ${state.filters.sort === 'newest' ? 'selected' : ''}>Newest first</option>
      <option value="price_low" ${state.filters.sort === 'price_low' ? 'selected' : ''}>Price: Low to High</option>
      <option value="price_high" ${state.filters.sort === 'price_high' ? 'selected' : ''}>Price: High to Low</option>
      <option value="popular" ${state.filters.sort === 'popular' ? 'selected' : ''}>Most popular</option>
    </select>
  `;
  document.getElementById('search-input').addEventListener('input', debounce(e => { state.filters.q = e.target.value; runSearch(); }, 350));
  document.getElementById('cat-select').addEventListener('change', e => { state.filters.category = e.target.value; runSearch(); });
  document.getElementById('sort-select').addEventListener('change', e => { state.filters.sort = e.target.value; runSearch(); });

  await runSearch();
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function runSearch() {
  try {
    const params = new URLSearchParams();
    if (state.filters.q) params.set('q', state.filters.q);
    if (state.filters.category) params.set('category', state.filters.category);
    if (state.filters.sort) params.set('sort', state.filters.sort);
    const { listings, total } = await api(`/listings?${params.toString()}`);
    document.getElementById('marketplace-count').textContent = `${total} item${total !== 1 ? 's' : ''} found`;
    renderProductGrid(document.getElementById('marketplace-grid'), listings);
  } catch (e) { toast(e.message, 'error'); }
}

function renderProductGrid(container, listings) {
  if (!listings.length) {
    container.innerHTML = `<div class="empty-state">😶 No items found. Try a different search or category.</div>`;
    return;
  }
  container.innerHTML = listings.map(l => `
    <div class="prod-card" onclick="goTo('product', '${l.id}')">
      <div class="prod-img-wrap">
        <img src="${l.images[0]}" alt="${escapeHtml(l.title)}">
        ${l.status === 'sold' ? '<div class="tag tag-sold">Sold</div>' : (l.negotiable ? '<div class="tag">Negotiable</div>' : '<div class="tag">Fixed</div>')}
        <div class="wish ${l.wishlisted ? 'wished' : ''}" onclick="event.stopPropagation(); toggleWishlist('${l.id}', this)">${l.wishlisted ? '❤️' : '🤍'}</div>
      </div>
      <div class="prod-body">
        <div class="name">${escapeHtml(l.title)}</div>
        <div class="meta">${capitalize(l.condition)} · ${escapeHtml(l.location || 'Campus')} · 👁 ${l.views || 0}</div>
        <div class="price-row">
          <span class="price">₹${l.price.toLocaleString('en-IN')}</span>
          <button class="chat-btn" onclick="event.stopPropagation(); startChatFromCard('${l.id}')">Chat 💬</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function toggleWishlist(listingId, el) {
  if (!requireAuth()) return;
  try {
    const { wishlisted } = await api(`/listings/${listingId}/wishlist`, { method: 'POST' });
    el.textContent = wishlisted ? '❤️' : '🤍';
    el.classList.toggle('wished', wishlisted);
    toast(wishlisted ? 'Saved to wishlist 💖' : 'Removed from wishlist');
  } catch (e) { toast(e.message, 'error'); }
}

async function startChatFromCard(listingId) {
  if (!requireAuth()) return;
  try {
    const { conversation } = await api('/chat/start', { method: 'POST', body: { listingId } });
    goTo('chat', conversation.id);
  } catch (e) { toast(e.message, 'error'); }
}

// ---------- PRODUCT PAGE ----------
async function loadProduct(id) {
  try {
    const { listing, related } = await api(`/listings/${id}`);
    state.currentListing = listing;
    const isOwner = state.user && state.user.id === listing.sellerId;

    document.getElementById('product-content').innerHTML = `
      <div class="product-detail">
        <div class="product-gallery">
          <img src="${listing.images[0]}" class="product-main-img" alt="${escapeHtml(listing.title)}">
          ${listing.status === 'sold' ? '<div class="sold-banner">SOLD ✅</div>' : ''}
        </div>
        <div class="product-info">
          <div class="eyebrow">${capitalize(listing.category)}</div>
          <h1>${escapeHtml(listing.title)}</h1>
          <div class="product-price">₹${listing.price.toLocaleString('en-IN')} ${listing.negotiable ? '<span class="neg-tag">Negotiable</span>' : ''}</div>
          <p class="product-desc">${escapeHtml(listing.description || 'No description provided.')}</p>
          <div class="product-meta-grid">
            <div><strong>Condition</strong><br>${capitalize(listing.condition)}</div>
            <div><strong>Location</strong><br>${escapeHtml(listing.location || 'Campus')}</div>
            <div><strong>Posted</strong><br>${timeAgo(listing.createdAt)}</div>
            <div><strong>Views</strong><br>👁 ${listing.views || 0}</div>
          </div>
          <div class="seller-card">
            <div class="seller-avatar">${(listing.sellerName || '?')[0]}</div>
            <div>
              <div class="seller-name">${escapeHtml(listing.sellerName || 'Unknown')}</div>
              <div class="seller-trust">⭐ ${listing.sellerTrust || '—'} trust score · ${escapeHtml(listing.sellerHostel || '')}</div>
            </div>
          </div>
          <div class="product-actions">
            ${isOwner
              ? (listing.status === 'sold'
                  ? `<button class="btn btn-ghost" disabled>Already sold</button>`
                  : `<button class="btn btn-primary" onclick="markSold('${listing.id}')">✅ Mark as sold</button>`)
              : `<button class="btn btn-primary" onclick="startChatFromCard('${listing.id}')">💬 Chat with seller</button>
                 <button class="wish-btn-lg ${listing.wishlisted ? 'wished' : ''}" onclick="toggleWishlist('${listing.id}', this)">${listing.wishlisted ? '❤️ Saved' : '🤍 Save'}</button>`
            }
            <button class="btn btn-ghost btn-sm" onclick="reportListing('${listing.id}')">🚩 Report</button>
          </div>
        </div>
      </div>
      <div class="related-section">
        <h2>You might also like</h2>
        <div class="prod-grid" id="related-grid"></div>
      </div>
    `;
    renderProductGrid(document.getElementById('related-grid'), related.map(l => ({ ...l, wishlisted: false })));
  } catch (e) {
    toast(e.message, 'error');
    goTo('marketplace');
  }
}

async function markSold(id) {
  try {
    await api(`/listings/${id}/mark-sold`, { method: 'POST' });
    toast('Marked as sold! 🎉');
    loadProduct(id);
  } catch (e) { toast(e.message, 'error'); }
}

function reportListing() {
  toast('Report submitted. Our moderation team will review it. 🚩');
}

// ---------- SELL ----------
async function handleSellSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    title: form.title.value.trim(),
    description: form.description.value.trim(),
    price: Number(form.price.value),
    category: form.category.value,
    condition: form.condition.value,
    negotiable: form.negotiable.checked,
    location: form.location.value.trim(),
    images: form.imageUrl.value.trim() ? [form.imageUrl.value.trim()] : undefined
  };
  try {
    const { listing } = await api('/listings', { method: 'POST', body: payload });
    toast('Listed successfully! 🚀');
    form.reset();
    goTo('product', listing.id);
  } catch (e) { toast(e.message, 'error'); }
}

// ---------- CHAT ----------
async function loadConversations(activeId) {
  try {
    const { conversations } = await api('/chat/conversations');
    state.conversations = conversations;
    const list = document.getElementById('convo-list');
    if (!conversations.length) {
      list.innerHTML = `<div class="empty-state">No chats yet. Go message a seller! 👋</div>`;
    } else {
      list.innerHTML = conversations.map(c => `
        <div class="convo-item ${c.id === activeId ? 'active' : ''}" onclick="openConvo('${c.id}')">
          <img src="${c.listingImage || ''}" class="convo-thumb">
          <div class="convo-meta">
            <div class="convo-name">${escapeHtml(c.otherUserName)} ${c.unreadCount ? `<span class="unread-dot">${c.unreadCount}</span>` : ''}</div>
            <div class="convo-listing">${escapeHtml(c.listingTitle)}</div>
            <div class="convo-last">${escapeHtml(c.lastMessage || 'Say hi 👋')}</div>
          </div>
        </div>
      `).join('');
    }
    if (activeId) await openConvo(activeId);
    else if (conversations.length) await openConvo(conversations[0].id);
    else document.getElementById('chat-window').innerHTML = `<div class="empty-state">Select a conversation</div>`;
  } catch (e) { toast(e.message, 'error'); }
}

async function openConvo(id) {
  state.activeConvo = id;
  document.querySelectorAll('.convo-item').forEach(el => el.classList.remove('active'));
  try {
    const { messages } = await api(`/chat/${id}/messages`);
    const convo = state.conversations.find(c => c.id === id);
    const win = document.getElementById('chat-window');
    win.innerHTML = `
      <div class="chat-header">💬 ${escapeHtml(convo?.otherUserName || '')} · <span class="chat-listing-link" onclick="goTo('product','${convo?.listingId}')">${escapeHtml(convo?.listingTitle || '')}</span></div>
      <div class="chat-messages" id="chat-messages">
        ${messages.map(m => `
          <div class="msg ${m.senderId === state.user.id ? 'mine' : 'theirs'}">
            <div class="bubble">${escapeHtml(m.text)}</div>
            <div class="msg-time">${timeAgo(m.createdAt)}</div>
          </div>
        `).join('') || '<div class="empty-state">Say hi to start the conversation 👋</div>'}
      </div>
      <form class="chat-input-row" onsubmit="sendMessage(event, '${id}')">
        <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off" required>
        <button class="btn btn-primary btn-sm" type="submit">Send 🚀</button>
      </form>
    `;
    const msgsEl = document.getElementById('chat-messages');
    msgsEl.scrollTop = msgsEl.scrollHeight;
    loadConversationsSidebarOnly();
  } catch (e) { toast(e.message, 'error'); }
}

async function loadConversationsSidebarOnly() {
  const { conversations } = await api('/chat/conversations');
  state.conversations = conversations;
  const list = document.getElementById('convo-list');
  list.innerHTML = conversations.map(c => `
    <div class="convo-item ${c.id === state.activeConvo ? 'active' : ''}" onclick="openConvo('${c.id}')">
      <img src="${c.listingImage || ''}" class="convo-thumb">
      <div class="convo-meta">
        <div class="convo-name">${escapeHtml(c.otherUserName)} ${c.unreadCount ? `<span class="unread-dot">${c.unreadCount}</span>` : ''}</div>
        <div class="convo-listing">${escapeHtml(c.listingTitle)}</div>
        <div class="convo-last">${escapeHtml(c.lastMessage || 'Say hi 👋')}</div>
      </div>
    </div>
  `).join('');
}

async function sendMessage(e, convoId) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  try {
    await api(`/chat/${convoId}/messages`, { method: 'POST', body: { text } });
    await openConvo(convoId);
  } catch (e) { toast(e.message, 'error'); }
}

// ---------- DASHBOARDS ----------
async function loadSellerDashboard() {
  try {
    const data = await api('/dashboard/seller');
    const o = data.overview;
    document.getElementById('seller-dash-content').innerHTML = `
      <div class="dash-grid">
        <div class="dash-card"><div class="dash-num">₹${o.totalRevenue.toLocaleString('en-IN')}</div><div class="dash-lbl">Total revenue</div></div>
        <div class="dash-card"><div class="dash-num">${o.productsSold}</div><div class="dash-lbl">Items sold</div></div>
        <div class="dash-card"><div class="dash-num">${o.activeListings}</div><div class="dash-lbl">Active listings</div></div>
        <div class="dash-card"><div class="dash-num">${o.totalViews}</div><div class="dash-lbl">Total views</div></div>
        <div class="dash-card"><div class="dash-num">₹${o.avgPrice.toLocaleString('en-IN')}</div><div class="dash-lbl">Avg. sale price</div></div>
        <div class="dash-card"><div class="dash-num">${o.totalWishlistSaves}</div><div class="dash-lbl">Wishlist saves</div></div>
      </div>
      <h3 class="dash-sub">Sales — last 7 days</h3>
      <div class="bar-chart">
        ${data.salesGraph.map(d => `
          <div class="bar-col">
            <div class="bar" style="height:${Math.max(8, d.revenue / 30)}px" title="₹${d.revenue}"></div>
            <span class="bar-lbl">${d.date.slice(5)}</span>
          </div>
        `).join('')}
      </div>
      <h3 class="dash-sub">My listings</h3>
      <div class="prod-grid">${data.listings.map(l => `
        <div class="prod-card" onclick="goTo('product','${l.id}')">
          <div class="prod-img-wrap"><img src="${l.images[0]}">${l.status === 'sold' ? '<div class="tag tag-sold">Sold</div>' : ''}</div>
          <div class="prod-body">
            <div class="name">${escapeHtml(l.title)}</div>
            <div class="meta">👁 ${l.views || 0} views</div>
            <div class="price-row"><span class="price">₹${l.price.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
      `).join('') || '<div class="empty-state">You haven\'t listed anything yet.</div>'}</div>
    `;
  } catch (e) { toast(e.message, 'error'); }
}

async function loadBuyerDashboard() {
  try {
    const data = await api('/dashboard/buyer');
    document.getElementById('buyer-dash-content').innerHTML = `
      <h3 class="dash-sub">My wishlist (${data.wishlist.length})</h3>
      <div class="prod-grid" id="buyer-wishlist"></div>
      <h3 class="dash-sub">Purchase history (${data.purchaseHistory.length})</h3>
      <div class="prod-grid" id="buyer-purchases"></div>
    `;
    renderProductGrid(document.getElementById('buyer-wishlist'), data.wishlist.map(l => ({ ...l, wishlisted: true })));
    if (!data.wishlist.length) document.getElementById('buyer-wishlist').innerHTML = `<div class="empty-state">Nothing saved yet. Go heart some items! 🤍</div>`;
    renderProductGrid(document.getElementById('buyer-purchases'), data.purchaseHistory);
    if (!data.purchaseHistory.length) document.getElementById('buyer-purchases').innerHTML = `<div class="empty-state">No purchases yet.</div>`;
  } catch (e) { toast(e.message, 'error'); }
}

// ---------- AUTH MODAL ----------
function openAuthModal(mode) {
  document.getElementById('auth-modal').classList.add('show');
  switchAuthMode(mode);
}
function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('show');
}
function switchAuthMode(mode) {
  document.getElementById('auth-login-form').style.display = mode === 'login' ? 'block' : 'none';
  document.getElementById('auth-register-form').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('auth-title').textContent = mode === 'login' ? 'Welcome back 👋' : 'Join CampusHub 🎉';
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  try {
    const { token, user } = await api('/auth/login', { method: 'POST', body: { email: form.email.value, password: form.password.value } });
    setUser(token, user);
    closeAuthModal();
    toast(`Welcome back, ${user.name.split(' ')[0]}! 🎉`);
    goTo(state.page);
  } catch (e) { toast(e.message, 'error'); }
}

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  try {
    const { token, user } = await api('/auth/register', {
      method: 'POST',
      body: { name: form.name.value, email: form.email.value, password: form.password.value, hostel: form.hostel.value }
    });
    setUser(token, user);
    closeAuthModal();
    toast(`Welcome to CampusHub, ${user.name.split(' ')[0]}! 🎉`);
    goTo(state.page);
  } catch (e) { toast(e.message, 'error'); }
}

// ---------- NAV ----------
function renderNav() {
  const actions = document.getElementById('nav-actions');
  if (state.user) {
    actions.innerHTML = `
      <span class="nav-greeting">Hey, ${escapeHtml(state.user.name.split(' ')[0])} 👋</span>
      <button class="btn btn-ghost btn-sm" onclick="goTo('buyer-dashboard')">My orders</button>
      <button class="btn btn-ghost btn-sm" onclick="goTo('seller-dashboard')">Seller hub</button>
      <button class="btn btn-primary btn-sm" onclick="logout()">Log out</button>
    `;
  } else {
    actions.innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="openAuthModal('login')">Log in</button>
      <button class="btn btn-primary btn-sm" onclick="openAuthModal('register')">Sign up free</button>
    `;
  }
}

// ---------- UTILS ----------
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ') : ''; }
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  goTo('home');
});
