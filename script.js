
// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
let allBanks = [];
let selectedGroup = null;
let activeFilter = 'all';
let userLat = null, userLng = null;
let currentEmailBank = null;

// ─────────────────────────────────────────────
// LOAD BANKS FROM API
// ─────────────────────────────────────────────
async function loadBanks() {
  const banner = document.getElementById('apiBanner');
  try {
    const res = await fetch(`${API_BASE}/api/banks`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    allBanks = data.banks;
    banner.className = 'api-banner';  // hide
    banner.style.display = 'none';
    renderBgGrid();
  } catch (err) {
    console.error('Failed to load banks:', err);
    banner.className = 'api-banner error';
    banner.textContent = '⚠️ Could not connect to server. Please check your API_BASE URL in the HTML file.';
  }
}

// ─────────────────────────────────────────────
// BLOOD GROUP BUTTONS
// ─────────────────────────────────────────────
function renderBgGrid() {
  document.getElementById('bgGrid').innerHTML = bloodGroups.map(g =>
    `<button class="bg-btn${selectedGroup===g?' active':''}" onclick="selectGroup('${g}')">${g}</button>`
  ).join('');
}

function selectGroup(g) {
  selectedGroup = selectedGroup === g ? null : g;
  renderBgGrid();
  filterCards();
}

// ─────────────────────────────────────────────
// FILTERS
// ─────────────────────────────────────────────
function setFilter(f, el) {
  activeFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  filterCards();
}

// ─────────────────────────────────────────────
// LOCATION
// ─────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getLocation() {
  const s = document.getElementById('locStatus');
  s.style.display = 'block';
  s.textContent = '📍 Detecting your location...';
  if (!navigator.geolocation) { s.textContent = '❌ Your browser does not support location access.'; return; }
  navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
    s.textContent = '✅ Location found! Showing nearest blood banks first.';
    setFilter('nearest', document.querySelector('[data-f="nearest"]'));
  }, () => { s.textContent = '❌ Location access was denied.'; });
}

// ─────────────────────────────────────────────
// RENDER CARDS
// ─────────────────────────────────────────────
function filterCards() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  let list = allBanks.map(b => ({...b}));

  if (search) list = list.filter(b =>
    b.name.toLowerCase().includes(search) ||
    b.area.toLowerCase().includes(search) ||
    b.address.toLowerCase().includes(search)
  );
  if (activeFilter === 'free') list = list.filter(b => (b.tags||[]).includes('free'));
  if (activeFilter === 'open24') list = list.filter(b => (b.tags||[]).includes('open24'));
  if (activeFilter === 'nearest' && userLat) {
    list = list.map(b => ({...b, dist: haversine(userLat, userLng, parseFloat(b.lat), parseFloat(b.lng))}))
               .sort((a,b) => a.dist - b.dist);
  }

  const info = document.getElementById('resultsInfo');
  const container = document.getElementById('results');
  const showing = selectedGroup || search || activeFilter !== 'all';

  if (!showing) { info.textContent = ''; container.innerHTML = ''; return; }

  info.innerHTML = `<strong>${list.length}</strong> blood bank${list.length!==1?'s':''} found${selectedGroup?` — for <strong>${selectedGroup}</strong> blood group`:''}`;

  if (list.length === 0) {
    container.innerHTML = `<div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
      <p>No blood banks found. Try adjusting your search or filter.</p>
    </div>`;
    return;
  }

  container.innerHTML = list.map(b => {
    const distBadge = b.dist != null ? `<span class="distance-badge">📍 ${b.dist.toFixed(1)} km</span>` : '';
    const waText = encodeURIComponent(`Hello! I need ${selectedGroup||'blood'} blood.\n\nBlood Bank: ${b.name}\nAddress: ${b.address}\nPhone: ${b.phone}`);
    const safeId = b.id;
    return `<div class="bank-card">
      <div class="card-top">
        <div class="card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#C8102E" stroke-width="1.8" width="22" height="22"><path d="M12 2C12 2 5 9 5 14a7 7 0 0 0 14 0C19 9 12 2 12 2z"/></svg>
        </div>
        <div style="flex:1;"><div class="card-name">${b.name}</div><div class="card-area">${b.area}</div></div>
        ${distBadge}
      </div>
      <div class="divider"></div>
      <div class="card-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${b.address}</span></div>
      <div class="card-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg><a href="tel:${b.phone}">${b.phone}${b.phone_alt ? ' / ' + b.phone_alt : ''}</a></div>
      ${b.email ? `<div class="card-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg><span>${b.email}</span></div>` : ''}
      <div class="card-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${b.timing}</span></div>
      ${b.note ? `<div class="card-row" style="font-size:12.5px;color:#888;font-style:italic;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>${b.note}</span></div>` : ''}
      <div class="tags-row">
        ${(b.services||[]).slice(0,4).map(s=>`<span class="tag tag-service">${s}</span>`).join('')}
        ${(b.tags||[]).includes('free')?'<span class="tag tag-free">✓ Free Blood</span>':''}
        ${(b.tags||[]).includes('open24')?'<span class="tag tag-open">⏰ Open 24h</span>':''}
      </div>
      <div class="card-bottom">
        <a class="action-btn call-btn" href="tel:${b.phone}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Call Now
        </a>
        ${b.email ? `<button class="action-btn email-btn" onclick="openEmailModal(${safeId})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>Send Email
        </button>` : ''}
        <a class="action-btn wa-btn" href="https://wa.me/?text=${waText}" target="_blank">
          <svg viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>WhatsApp
        </a>
      </div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// EMAIL MODAL
// ─────────────────────────────────────────────
function openEmailModal(bankId) {
  currentEmailBank = allBanks.find(b => b.id === bankId);
  if (!currentEmailBank) return;
  document.getElementById('modalBankName').textContent = currentEmailBank.name;
  document.getElementById('eGroup').value = selectedGroup || '';
  document.getElementById('emailModal').classList.add('open');
}
function closeEmailModal() {
  document.getElementById('emailModal').classList.remove('open');
  currentEmailBank = null;
}
document.getElementById('emailModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeEmailModal(); });

async function sendEmail() {
  const name = document.getElementById('eName').value.trim();
  const from = document.getElementById('eFrom').value.trim();
  const group = document.getElementById('eGroup').value.trim();
  const msg = document.getElementById('eMsg').value.trim();
  if (!name || !from || !group) { alert('Please fill in your name, email, and blood group needed.'); return; }

  // Save to DB
  try {
    await fetch(`${API_BASE}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank_id: currentEmailBank.id, sender_name: name, sender_email: from, blood_group: group, message: msg })
    });
  } catch(e) { /* silent — still open email app */ }

  // Open email client
  const subject = encodeURIComponent(`Blood Request — ${group} needed urgently`);
  const body = encodeURIComponent(`Dear ${currentEmailBank.name} Team,\n\nMy name is ${name} and I need ${group} blood.\n\n${msg ? 'Details:\n' + msg + '\n\n' : ''}Please contact me at: ${from}\n\nThank you.\n\n${name}`);
  window.location.href = `mailto:${currentEmailBank.email}?subject=${subject}&body=${body}`;
  closeEmailModal();
}

// ─────────────────────────────────────────────
// DONOR FORM SUBMIT
// ─────────────────────────────────────────────
async function submitDonor() {
  const btn = document.getElementById('submitBtn');
  const msg = document.getElementById('formMsg');
  const body = {
    full_name: document.getElementById('dName').value.trim(),
    phone: document.getElementById('dPhone').value.trim(),
    email: document.getElementById('dEmail').value.trim(),
    blood_group: document.getElementById('dGroup').value,
    area: document.getElementById('dArea').value.trim(),
    age: parseInt(document.getElementById('dAge').value) || null,
    last_donated: document.getElementById('dLast').value.trim(),
    notes: document.getElementById('dNote').value.trim()
  };

  if (!body.full_name || !body.phone || !body.blood_group) {
    showMsg('error', '⚠️ Please fill in your name, phone number, and blood group.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Registering...';

  try {
    const res = await fetch(`${API_BASE}/api/donors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!res.ok) {
      showMsg('error', `⚠️ ${data.error || 'Registration failed. Please try again.'}`);
    } else {
      showMsg('success', '✅ Thank you! You have been registered as a blood donor. May you always be a source of hope!');
      ['dName','dPhone','dEmail','dGroup','dArea','dAge','dLast','dNote'].forEach(id => {
        const el = document.getElementById(id);
        if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = '';
      });
    }
  } catch(err) {
    showMsg('error', '❌ Could not connect to server. Please check your internet connection.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Register Now ❤️';
  }
}

function showMsg(type, text) {
  const el = document.getElementById('formMsg');
  el.className = `form-msg ${type}`;
  el.textContent = text;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 6000);
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
renderBgGrid();
loadBanks();