/* ═══════════════════════════════════════════════════════
   VAULTD — app.js
   APIs used:
     Records → Discogs      https://www.discogs.com/developers
     Books   → Google Books https://developers.google.com/books
     Games   → RAWG         https://rawg.io/apidocs
     Film    → TMDB         https://developer.themoviedb.org
═══════════════════════════════════════════════════════ */

// ┌─────────────────────────────────────────────────────┐
// │  ⚙️  API KEYS — paste yours here                    │
// └─────────────────────────────────────────────────────┘
const API_KEYS = {
  // Discogs: https://www.discogs.com/settings/developers → Generate token
  DISCOGS: 'zTgDLOHVAFbathyKSXVSVfJyjcpshRlLKmbmdiBB',

  // Google Books: https://console.cloud.google.com → Enable Books API → Create key
  // Note: Google Books works without a key for basic searches (quota is just lower)
  GOOGLE_BOOKS: 'AIzaSyCW1KvrNoStPO4PfqEhkdE6lpu35vSyPW8',

  // RAWG: https://rawg.io/apidocs → Sign up for free key
  RAWG: 'YOUR_RAWG_API_KEY',

  // TMDB: https://www.themoviedb.org/settings/api → Request API key (free)
  TMDB: 'YOUR_TMDB_API_KEY',
};

// ─── API BASE URLs ───────────────────────────────────────
const API = {
  DISCOGS:  'https://api.discogs.com',
  GBOOKS:   'https://www.googleapis.com/books/v1',
  RAWG:     'https://api.rawg.io/api',
  TMDB:     'https://api.themoviedb.org/3',
  TMDB_IMG: 'https://image.tmdb.org/t/p/w342',
};

// ─── MEDIA TYPE CONFIG ───────────────────────────────────
const MEDIA_CONFIG = {
  records: { label: 'Record', icon: '◉', color: '#e85d4a' },
  books:   { label: 'Book',   icon: '▬', color: '#5b8dd9' },
  games:   { label: 'Game',   icon: '▶', color: '#6ec46e' },
  film:    { label: 'Film',   icon: '◈', color: '#b07fdd' },
};

// ─── STATE ────────────────────────────────────────────────
let state = {
  collection: [],       // { id, type, title, sub, year, cover, description, notes, rating, wanted, addedAt, rawData }
  wantlist:   [],       // same shape, wanted: true
  activeMedia: 'all',
  activeTab: 'records', // add modal tab
  viewMode: 'grid',
  filters: { owned: true, wanted: false },
  sort: 'added_desc',
  currentView: 'hero',  // 'hero' | 'collection' | 'wantlist'
};

// ─── PERSIST ─────────────────────────────────────────────
function saveState() {
  localStorage.setItem('vaultd_collection', JSON.stringify(state.collection));
  localStorage.setItem('vaultd_wantlist', JSON.stringify(state.wantlist));
}
function loadState() {
  try {
    state.collection = JSON.parse(localStorage.getItem('vaultd_collection') || '[]');
    state.wantlist   = JSON.parse(localStorage.getItem('vaultd_wantlist')   || '[]');
  } catch(e) { /* fresh start */ }
}

// ─── HELPERS ─────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function toast(msg, type = 'success') {
  const c = document.querySelector('.toast-container') || (() => {
    const el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();
  const t = document.createElement('div');
  t.className = `toast toast--${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function getAll() { return [...state.collection, ...state.wantlist]; }

function filterAndSort(items) {
  let list = items;
  if (state.activeMedia !== 'all') list = list.filter(i => i.type === state.activeMedia);
  if (state.filters.owned && !state.filters.wanted) list = list.filter(i => !i.wanted);
  if (state.filters.wanted && !state.filters.owned) list = list.filter(i => i.wanted);
  // sort
  const [key, dir] = state.sort.split('_');
  list = [...list].sort((a, b) => {
    let va, vb;
    if (key === 'added') { va = a.addedAt; vb = b.addedAt; }
    else if (key === 'alpha') { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
    else if (key === 'year') { va = parseInt(a.year) || 0; vb = parseInt(b.year) || 0; }
    if (dir === 'asc') return va > vb ? 1 : -1;
    return va < vb ? 1 : -1;
  });
  return list;
}

// ─── RENDER COLLECTION ────────────────────────────────────
function renderCollection() {
  const grid  = document.getElementById('collectionGrid');
  const empty = document.getElementById('collectionEmpty');
  const count = document.getElementById('collectionCount');
  const title = document.getElementById('collectionTitle');

  const items = filterAndSort(getAll());
  count.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
  title.textContent = state.activeMedia === 'all' ? 'All Media'
    : MEDIA_CONFIG[state.activeMedia]?.label + 's';

  grid.className = 'collection__grid' + (state.viewMode === 'list' ? ' list-view' : '');

  if (!items.length) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = items.map(renderCard).join('');

  // badges
  ['records','books','games','film'].forEach(t => {
    const el = document.querySelector(`[data-badge="${t}"]`);
    if (el) el.textContent = getAll().filter(i => i.type === t).length;
  });

  // stats
  document.getElementById('totalCount').textContent = state.collection.length;
  document.getElementById('wantCount').textContent   = state.wantlist.length;
}

function renderCard(item) {
  const coverImg = item.cover
    ? `<img class="card__cover" src="${item.cover}" alt="${item.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholder = `<div class="card__cover-placeholder" ${item.cover ? 'style="display:none"' : ''}>${MEDIA_CONFIG[item.type]?.icon}</div>`;
  const wantedBadge = item.wanted ? '<span class="card__wanted-badge">WANTED</span>' : '';
  const listMeta = `<div class="card__list-meta">
    <span class="card__type-tag ${item.type}">${item.type}</span>
    <span class="card__year">${item.year || '—'}</span>
  </div>`;

  return `<div class="card" data-id="${item.id}" onclick="openDetail('${item.id}')">
    <div class="card__type-bar ${item.type}"></div>
    <div class="card__cover-wrap">
      ${coverImg}${placeholder}${wantedBadge}
    </div>
    <div class="card__body">
      <div class="card__title">${item.title}</div>
      <div class="card__sub">${item.sub || ''}</div>
      <div class="card__meta">
        <span class="card__year">${item.year || '—'}</span>
        <span class="card__type-tag ${item.type}">${item.type}</span>
      </div>
    </div>
    ${listMeta}
  </div>`;
}

// ─── RENDER WANTLIST ─────────────────────────────────────
function renderWantlist() {
  const grid  = document.getElementById('wantlistGrid');
  const empty = document.getElementById('wantlistEmpty');
  const count = document.getElementById('wantlistCount');
  const wantTotal = document.getElementById('wantTotalCount');

  const items = state.wantlist.filter(i =>
    state.activeMedia === 'all' || i.type === state.activeMedia
  );
  count.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
  if (wantTotal) wantTotal.textContent = state.wantlist.length;

  if (!items.length) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = items.map(renderCard).join('');
}

// ─── DETAIL MODAL ─────────────────────────────────────────
function openDetail(id) {
  const item = getAll().find(i => i.id === id);
  if (!item) return;

  const cfg = MEDIA_CONFIG[item.type];
  const stars = [1,2,3,4,5].map(n =>
    `<span class="star ${(item.rating||0) >= n ? 'lit' : ''}" data-star="${n}" onclick="setRating('${id}',${n})">★</span>`
  ).join('');
  const coverHtml = item.cover
    ? `<img class="detail__cover" src="${item.cover}" alt="${item.title}" onerror="this.style.display='none'">`
    : `<div class="detail__cover-placeholder">${cfg.icon}</div>`;
  const isInWant   = state.wantlist.some(i => i.id === id);
  const isInOwned  = state.collection.some(i => i.id === id);

  document.getElementById('detailContent').innerHTML = `
    <div class="detail__top">
      ${coverHtml}
      <div class="detail__info">
        <span class="detail__type-tag ${item.type}">${cfg.label}</span>
        <h2 class="detail__title">${item.title}</h2>
        <p class="detail__sub">${item.sub || ''}</p>
        <div class="detail__meta-row">
          ${item.year ? `<span class="detail__meta-chip">${item.year}</span>` : ''}
          ${item.genre ? `<span class="detail__meta-chip">${item.genre}</span>` : ''}
          ${item.platform ? `<span class="detail__meta-chip">${item.platform}</span>` : ''}
          ${item.format ? `<span class="detail__meta-chip">${item.format}</span>` : ''}
        </div>
        <div class="rating-row">
          ${stars}
          <span class="rating-label">${item.rating ? item.rating + '/5' : 'Rate it'}</span>
        </div>
        <div class="detail__actions">
          ${isInOwned
            ? `<button class="btn btn--ghost btn--sm" onclick="moveToWantlist('${id}')">Move to Wantlist</button>
               <button class="btn btn--danger btn--sm" onclick="removeItem('${id}')">Remove</button>`
            : `<button class="btn btn--teal btn--sm" onclick="moveToCollection('${id}')">Mark as Owned</button>
               <button class="btn btn--danger btn--sm" onclick="removeItem('${id}')">Remove</button>`}
        </div>
      </div>
    </div>
    ${item.description ? `<p class="detail__desc">${item.description.slice(0,600)}${item.description.length>600?'…':''}</p>` : ''}
    <span class="detail__notes-label">Personal Notes</span>
    <textarea class="detail__notes-input" id="notesInput" placeholder="Add your notes, condition, purchase price…">${item.notes || ''}</textarea>
    <div style="margin-top:10px;display:flex;gap:8px;">
      <button class="btn btn--primary btn--sm" onclick="saveNotes('${id}')">Save Notes</button>
    </div>
  `;

  document.getElementById('detailModal').style.display = 'flex';
}

function setRating(id, rating) {
  const item = getAll().find(i => i.id === id);
  if (!item) return;
  item.rating = rating;
  saveState();
  openDetail(id); // re-render
}

function saveNotes(id) {
  const item = getAll().find(i => i.id === id);
  if (!item) return;
  item.notes = document.getElementById('notesInput').value;
  saveState();
  toast('Notes saved');
}

function removeItem(id) {
  state.collection = state.collection.filter(i => i.id !== id);
  state.wantlist   = state.wantlist.filter(i => i.id !== id);
  saveState();
  document.getElementById('detailModal').style.display = 'none';
  renderCollection();
  renderWantlist();
  toast('Item removed', 'warning');
}

function moveToWantlist(id) {
  const idx = state.collection.findIndex(i => i.id === id);
  if (idx === -1) return;
  const item = { ...state.collection[idx], wanted: true };
  state.collection.splice(idx, 1);
  state.wantlist.push(item);
  saveState();
  document.getElementById('detailModal').style.display = 'none';
  renderCollection();
  renderWantlist();
  toast('Moved to wantlist');
}

function moveToCollection(id) {
  const idx = state.wantlist.findIndex(i => i.id === id);
  if (idx === -1) return;
  const item = { ...state.wantlist[idx], wanted: false };
  state.wantlist.splice(idx, 1);
  state.collection.push(item);
  saveState();
  document.getElementById('detailModal').style.display = 'none';
  renderCollection();
  renderWantlist();
  toast('Marked as owned ✓');
}

function addToCollection(item, asWanted = false) {
  item.id      = uid();
  item.addedAt = Date.now();
  item.wanted  = asWanted;
  if (asWanted) state.wantlist.push(item);
  else          state.collection.push(item);
  saveState();
  renderCollection();
  renderWantlist();
}

// ─── API: DISCOGS RECORDS ─────────────────────────────────
async function searchRecords(query) {
  const url = `${API.DISCOGS}/database/search?q=${encodeURIComponent(query)}&type=release&per_page=12&token=${API_KEYS.DISCOGS}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Vaultd/1.0' } });
  if (!res.ok) throw new Error('Discogs search failed');
  const data = await res.json();
  return (data.results || []).map(r => ({
    type:        'records',
    title:       r.title,
    sub:         r.label ? r.label[0] : (r.country || ''),
    year:        r.year ? String(r.year) : '',
    cover:       r.cover_image || r.thumb || '',
    genre:       r.genre ? r.genre[0] : '',
    format:      r.format ? r.format[0] : '',
    description: r.style ? r.style.join(', ') : '',
    discogsId:   r.id,
  }));
}

// ─── API: GOOGLE BOOKS ────────────────────────────────────
async function searchBooks(query) {
  const key = API_KEYS.GOOGLE_BOOKS !== 'YOUR_GOOGLE_BOOKS_API_KEY'
    ? `&key=${API_KEYS.GOOGLE_BOOKS}` : '';
  const url = `${API.GBOOKS}/volumes?q=${encodeURIComponent(query)}&maxResults=12${key}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('Google Books search failed');
  const data = await res.json();
  return (data.items || []).map(b => {
    const v = b.volumeInfo;
    return {
      type:        'books',
      title:       v.title || 'Unknown',
      sub:         v.authors ? v.authors.join(', ') : 'Unknown Author',
      year:        v.publishedDate ? v.publishedDate.slice(0,4) : '',
      cover:       v.imageLinks?.thumbnail?.replace('http:','https:') || '',
      genre:       v.categories ? v.categories[0] : '',
      description: v.description || '',
      isbn:        v.industryIdentifiers?.[0]?.identifier || '',
    };
  });
}

// ─── API: RAWG GAMES ──────────────────────────────────────
async function searchGames(query) {
  const url = `${API.RAWG}/games?key=${API_KEYS.RAWG}&search=${encodeURIComponent(query)}&page_size=12`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('RAWG search failed');
  const data = await res.json();
  return (data.results || []).map(g => ({
    type:        'games',
    title:       g.name,
    sub:         g.platforms ? g.platforms.map(p => p.platform.name).slice(0,2).join(', ') : '',
    year:        g.released ? g.released.slice(0,4) : '',
    cover:       g.background_image || '',
    genre:       g.genres ? g.genres.map(x => x.name).join(', ') : '',
    platform:    g.platforms ? g.platforms.map(p => p.platform.name).slice(0,1).join() : '',
    description: g.short_screenshots ? '' : '',
    rawgId:      g.id,
  }));
}

// ─── API: TMDB FILM ───────────────────────────────────────
async function searchFilm(query) {
  const url = `${API.TMDB}/search/multi?api_key=${API_KEYS.TMDB}&query=${encodeURIComponent(query)}&page=1`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('TMDB search failed');
  const data = await res.json();
  return (data.results || [])
    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 12)
    .map(r => ({
      type:        'film',
      title:       r.title || r.name || 'Unknown',
      sub:         r.media_type === 'tv' ? 'TV Series' : 'Film',
      year:        (r.release_date || r.first_air_date || '').slice(0,4),
      cover:       r.poster_path ? `${API.TMDB_IMG}${r.poster_path}` : '',
      genre:       '',
      description: r.overview || '',
      tmdbId:      r.id,
      format:      r.media_type === 'tv' ? 'TV' : 'Film',
    }));
}

// ─── MODAL SEARCH DISPATCHER ──────────────────────────────
async function runModalSearch(query) {
  const results = document.getElementById('modalResults');
  results.innerHTML = '<p class="modal__loading">Searching…</p>';
  try {
    let items = [];
    if (state.activeTab === 'records') items = await searchRecords(query);
    else if (state.activeTab === 'books')  items = await searchBooks(query);
    else if (state.activeTab === 'games')  items = await searchGames(query);
    else if (state.activeTab === 'film')   items = await searchFilm(query);

    if (!items.length) {
      results.innerHTML = '<p class="modal__hint">No results found. Try a different search.</p>';
      return;
    }
    results.innerHTML = items.map((item, idx) => renderModalResult(item, idx)).join('');
  } catch (err) {
    const isKeyError = err.message.includes('failed');
    results.innerHTML = `<p class="modal__hint" style="color:#e85d4a">
      ${isKeyError ? 'API error — check that your API key is set correctly in app.js.' : err.message}
    </p>`;
  }
}

function renderModalResult(item, idx) {
  const cfg = MEDIA_CONFIG[item.type];
  const already = getAll().some(i =>
    i.title === item.title && i.type === item.type && i.year === item.year
  );
  const coverHtml = item.cover
    ? `<img class="modal-result__thumb" src="${item.cover}" alt="" onerror="this.style.display='none'">`
    : `<div class="modal-result__placeholder">${cfg.icon}</div>`;

  return `<div class="modal-result">
    ${coverHtml}
    <div class="modal-result__info">
      <div class="modal-result__title">${item.title}</div>
      <div class="modal-result__sub">${item.sub || ''} ${item.year ? '· ' + item.year : ''}</div>
    </div>
    <div class="modal-result__actions">
      ${already
        ? `<span style="font-size:11px;color:var(--muted)">In vault</span>`
        : `<button class="btn btn--primary btn--sm" onclick="addFromModal(${idx})">Add</button>
           <button class="btn btn--ghost btn--sm" onclick="wantFromModal(${idx})">Want</button>`}
    </div>
  </div>`;
}

// Store last search results so we can reference by index
let lastSearchResults = [];

async function runModalSearchAndStore(query) {
  const results = document.getElementById('modalResults');
  results.innerHTML = '<p class="modal__loading">Searching…</p>';
  try {
    if (state.activeTab === 'records') lastSearchResults = await searchRecords(query);
    else if (state.activeTab === 'books') lastSearchResults = await searchBooks(query);
    else if (state.activeTab === 'games') lastSearchResults = await searchGames(query);
    else if (state.activeTab === 'film')  lastSearchResults = await searchFilm(query);

    if (!lastSearchResults.length) {
      results.innerHTML = '<p class="modal__hint">No results found. Try a different search.</p>';
      return;
    }
    results.innerHTML = lastSearchResults.map((item, idx) => renderModalResult(item, idx)).join('');
  } catch (err) {
    results.innerHTML = `<p class="modal__hint" style="color:#e85d4a">
      API error — check that your API key is set correctly in app.js.<br>
      <small style="color:var(--muted)">${err.message}</small>
    </p>`;
  }
}

function addFromModal(idx) {
  const item = { ...lastSearchResults[idx] };
  addToCollection(item, false);
  toast(`Added "${item.title}" to collection ✓`);
  renderModalResult(item, idx);
  runModalSearchAndStore(document.getElementById('modalSearchInput').value);
}

function wantFromModal(idx) {
  const item = { ...lastSearchResults[idx] };
  addToCollection(item, true);
  toast(`Added "${item.title}" to wantlist`);
  runModalSearchAndStore(document.getElementById('modalSearchInput').value);
}

// ─── GLOBAL SEARCH (topbar) ───────────────────────────────
let searchTimeout;
function handleGlobalSearch(val) {
  const box = document.getElementById('searchResults');
  if (!val.trim()) { box.classList.remove('open'); return; }
  const hits = getAll().filter(i =>
    i.title.toLowerCase().includes(val.toLowerCase()) ||
    (i.sub  || '').toLowerCase().includes(val.toLowerCase())
  ).slice(0, 8);
  if (!hits.length) { box.classList.remove('open'); return; }
  box.innerHTML = hits.map(i => `
    <div class="search-result-item" onclick="openDetail('${i.id}')">
      ${i.cover ? `<img class="search-result-item__thumb" src="${i.cover}" alt="" onerror="this.style.display='none'">` : `<div class="search-result-item__thumb" style="display:flex;align-items:center;justify-content:center;font-size:18px">${MEDIA_CONFIG[i.type]?.icon}</div>`}
      <div class="search-result-item__info">
        <div class="search-result-item__title">${i.title}</div>
        <div class="search-result-item__sub">${MEDIA_CONFIG[i.type]?.label} · ${i.year || '—'}</div>
      </div>
    </div>
  `).join('');
  box.classList.add('open');
}

// ─── VIEW SWITCHING ───────────────────────────────────────
function showView(view) {
  document.getElementById('heroSection').style.display       = view === 'hero'       ? 'flex'  : 'none';
  document.getElementById('appSection').style.display        = view === 'collection' ? 'grid'  : 'none';
  document.getElementById('wantlistSection').style.display   = view === 'wantlist'   ? 'grid'  : 'none';
  state.currentView = view;
  if (view === 'collection') renderCollection();
  if (view === 'wantlist')   renderWantlist();
}

// ─── INIT & EVENT LISTENERS ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  showView('hero');

  // hero
  document.getElementById('heroAddBtn').addEventListener('click', () => {
    showView('collection');
    document.getElementById('addModal').style.display = 'flex';
  });
  document.getElementById('heroExploreBtn').addEventListener('click', () => showView('collection'));
  document.getElementById('emptyAddBtn').addEventListener('click', () => {
    document.getElementById('addModal').style.display = 'flex';
  });

  // topbar logo → hero
  document.querySelector('.topbar__logo').addEventListener('click', (e) => {
    e.preventDefault();
    showView('hero');
  });

  // topbar nav links
  document.querySelectorAll('[data-media]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      state.activeMedia = el.dataset.media;
      document.querySelectorAll('[data-media]').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
      showView('collection');
      document.getElementById('navOverlay').classList.remove('open');
    });
  });

  // sidebar nav
  document.querySelectorAll('.sidebar__link').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar__link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.media) { state.activeMedia = btn.dataset.media; renderCollection(); }
      if (btn.dataset.wantmedia) { state.activeMedia = btn.dataset.wantmedia; renderWantlist(); }
    });
  });

  // add button
  document.getElementById('addBtn').addEventListener('click', () => {
    showView('collection');
    document.getElementById('addModal').style.display = 'flex';
  });

  // wantlist button
  document.getElementById('wantlistBtn').addEventListener('click', () => showView('wantlist'));
  document.getElementById('overlayWantlistLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showView('wantlist');
    document.getElementById('navOverlay').classList.remove('open');
  });
  document.getElementById('overlayStatsLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showView('collection');
    document.getElementById('navOverlay').classList.remove('open');
  });

  // hamburger
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('navOverlay').classList.add('open');
  });
  document.getElementById('navClose').addEventListener('click', () => {
    document.getElementById('navOverlay').classList.remove('open');
  });

  // modal tabs
  document.querySelectorAll('.modal__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal__tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeTab = tab.dataset.tab;
      document.getElementById('modalResults').innerHTML = '<p class="modal__hint">Search above to find media to add.</p>';
      document.getElementById('modalSearchInput').placeholder =
        `Search ${state.activeTab}…`;
    });
  });

  // modal search
  document.getElementById('modalSearchBtn').addEventListener('click', () => {
    const q = document.getElementById('modalSearchInput').value.trim();
    if (q) runModalSearchAndStore(q);
  });
  document.getElementById('modalSearchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (q) runModalSearchAndStore(q);
    }
  });

  // close add modal
  document.getElementById('addModalClose').addEventListener('click', () => {
    document.getElementById('addModal').style.display = 'none';
  });
  document.getElementById('addModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });

  // close detail modal
  document.getElementById('detailModalClose').addEventListener('click', () => {
    document.getElementById('detailModal').style.display = 'none';
  });
  document.getElementById('detailModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });

  // global search
  document.getElementById('globalSearch').addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleGlobalSearch(e.target.value), 200);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.topbar__search-wrap')) {
      document.getElementById('searchResults').classList.remove('open');
    }
  });

  // filters
  document.getElementById('filterOwned').addEventListener('change', e => {
    state.filters.owned = e.target.checked;
    renderCollection();
  });
  document.getElementById('filterWanted').addEventListener('change', e => {
    state.filters.wanted = e.target.checked;
    renderCollection();
  });

  // sort
  document.getElementById('sortSelect').addEventListener('change', e => {
    state.sort = e.target.value;
    renderCollection();
  });

  // view mode
  document.getElementById('viewGrid').addEventListener('click', () => {
    state.viewMode = 'grid';
    document.getElementById('viewGrid').classList.add('active');
    document.getElementById('viewList').classList.remove('active');
    renderCollection();
  });
  document.getElementById('viewList').addEventListener('click', () => {
    state.viewMode = 'list';
    document.getElementById('viewList').classList.add('active');
    document.getElementById('viewGrid').classList.remove('active');
    renderCollection();
  });

  // keyboard: Escape closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('addModal').style.display = 'none';
      document.getElementById('detailModal').style.display = 'none';
      document.getElementById('navOverlay').classList.remove('open');
    }
  });
});
