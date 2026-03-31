// ─────────────────────────────────────────────
// STATE & CONFIG (API_BASE is taken from HTML)
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
        // Using API_BASE defined in your HTML file
        const res = await fetch(`${API_BASE}/api/banks`);
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        allBanks = data.banks;
        if (banner) {
            banner.className = 'api-banner';
            banner.style.display = 'none';
        }
        renderBgGrid();
    } catch (err) {
        console.error('Failed to load banks:', err);
        if (banner) {
            banner.className = 'api-banner error';
            banner.style.display = 'block';
            banner.textContent = '⚠️ Could not connect to server. Check API_BASE in HTML.';
        }
    }
}

// ─────────────────────────────────────────────
// BLOOD GROUP BUTTONS
// ─────────────────────────────────────────────
function renderBgGrid() {
    const grid = document.getElementById('bgGrid');
    if (!grid) return;
    grid.innerHTML = bloodGroups.map(g =>
        `<button class="bg-btn${selectedGroup === g ? ' active' : ''}" onclick="selectGroup('${g}')">${g}</button>`
    ).join('');
}

function selectGroup(g) {
    selectedGroup = selectedGroup === g ? null : g;
    renderBgGrid();
    filterCards();
}

// ─────────────────────────────────────────────
// FILTERS & LOCATION
// ─────────────────────────────────────────────
function setFilter(f, el) {
    activeFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    filterCards();
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getLocation() {
    const s = document.getElementById('locStatus');
    if (!s) return;
    s.style.display = 'block';
    s.textContent = '📍 Detecting your location...';
    if (!navigator.geolocation) { 
        s.textContent = '❌ Location not supported.'; 
        return; 
    }
    navigator.geolocation.getCurrentPosition(pos => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        s.textContent = '✅ Location found!';
        const nearestBtn = document.querySelector('[data-f="nearest"]');
        setFilter('nearest', nearestBtn);
    }, () => { 
        s.textContent = '❌ Access denied.'; 
    });
}

// ─────────────────────────────────────────────
// RENDER CARDS
// ─────────────────────────────────────────────
function filterCards() {
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    let list = allBanks.map(b => ({ ...b }));

    if (search) {
        list = list.filter(b =>
            (b.name && b.name.toLowerCase().includes(search)) ||
            (b.area && b.area.toLowerCase().includes(search)) ||
            (b.address && b.address.toLowerCase().includes(search))
        );
    }

    if (activeFilter === 'free') list = list.filter(b => (b.tags || []).includes('free'));
    if (activeFilter === 'open24') list = list.filter(b => (b.tags || []).includes('open24'));

    if (activeFilter === 'nearest' && userLat) {
        list = list.map(b => ({
            ...b,
            dist: haversine(userLat, userLng, parseFloat(b.lat), parseFloat(b.lng))
        })).sort((a, b) => a.dist - b.dist);
    }

    const info = document.getElementById('resultsInfo');
    const container = document.getElementById('results');
    const showing = selectedGroup || search || activeFilter !== 'all';

    if (!container) return;
    if (!showing) {
        if (info) info.textContent = '';
        container.innerHTML = '';
        return;
    }

    if (info) {
        info.innerHTML = `<strong>${list.length}</strong> banks found${selectedGroup ? ` for <strong>${selectedGroup}</strong>` : ''}`;
    }

    if (list.length === 0) {
        container.innerHTML = `<div class="empty"><p>No blood banks found.</p></div>`;
        return;
    }

    container.innerHTML = list.map(b => {
        const distBadge = b.dist != null ? `<span class="distance-badge">📍 ${b.dist.toFixed(1)} km</span>` : '';
        const rawPhone = b.phone ? b.phone.split('/')[0].replace(/\D/g, '') : '';
        const waPhone = rawPhone.startsWith('0') ? '92' + rawPhone.substring(1) : rawPhone;
        const waText = encodeURIComponent(`Assalam-o-Alaikum, I need ${selectedGroup || 'blood'} blood. Found you on Karachi Blood Finder.`);

        return `
        <div class="bank-card">
            <div class="card-top">
                <div style="flex:1;"><div class="card-name">${b.name}</div><div class="card-area">${b.area}</div></div>
                ${distBadge}
            </div>
            <div class="divider"></div>
            <div class="card-row"><span>📍 ${b.address}</span></div>
            <div class="card-row"><a href="tel:${rawPhone}">📞 ${b.phone}</a></div>
            <div class="card-bottom">
                <a class="action-btn call-btn" href="tel:${rawPhone}">Call Now</a>
                ${b.email ? `<button class="action-btn email-btn" onclick="openEmailModal(${b.id})">Email</button>` : ''}
                <a class="action-btn wa-btn" href="https://wa.me/${waPhone}?text=${waText}" target="_blank">WhatsApp</a>
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
    const modalName = document.getElementById('modalBankName');
    if (modalName) modalName.textContent = currentEmailBank.name;
    document.getElementById('emailModal').classList.add('open');
}

function closeEmailModal() {
    document.getElementById('emailModal').classList.remove('open');
}

// ─────────────────────────────────────────────
// DONOR REGISTRATION
// ─────────────────────────────────────────────
async function submitDonor() {
    const btn = document.getElementById('submitBtn');
    const body = {
        full_name: document.getElementById('dName').value.trim(),
        phone: document.getElementById('dPhone').value.trim(),
        blood_group: document.getElementById('dGroup').value
    };

    if (!body.full_name || !body.phone) {
        showMsg('error', '⚠️ Fill required fields.');
        return;
    }

    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/api/donors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) showMsg('success', '✅ Registered!');
    } catch(err) { showMsg('error', '❌ Error.'); }
    finally { btn.disabled = false; }
}

function showMsg(type, text) {
    const el = document.getElementById('formMsg');
    if (!el) return;
    el.className = `form-msg ${type}`;
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderBgGrid();
    loadBanks();
});