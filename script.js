// ─────────────────────────────────────────────
// STATE & CONFIG
// ─────────────────────────────────────────────
const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
let allBanks = [];
let selectedGroup = null;
let activeFilter = 'all';
let userLat = null, userLng = null;
let currentEmailBank = null;

// API URL (Ensure this matches your backend)
const API_BASE = 'https://blood-bank-data-production.up.railway.app';

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
            banner.textContent = '⚠️ Could not connect to server. Please check your API_BASE URL.';
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
        s.textContent = '❌ Your browser does not support location access.'; 
        return; 
    }
    navigator.geolocation.getCurrentPosition(pos => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        s.textContent = '✅ Location found! Showing nearest blood banks first.';
        const nearestBtn = document.querySelector('[data-f="nearest"]');
        setFilter('nearest', nearestBtn);
    }, () => { 
        s.textContent = '❌ Location access was denied.'; 
    });
}

// ─────────────────────────────────────────────
// RENDER CARDS (Main Filtering Logic)
// ─────────────────────────────────────────────
function filterCards() {
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    let list = allBanks.map(b => ({ ...b }));

    // Apply Search
    if (search) {
        list = list.filter(b =>
            (b.name && b.name.toLowerCase().includes(search)) ||
            (b.area && b.area.toLowerCase().includes(search)) ||
            (b.address && b.address.toLowerCase().includes(search))
        );
    }

    // Apply Group Filter
    // (Optional: depending on if you want to filter DB results by group availability)

    // Apply Tags Filters
    if (activeFilter === 'free') list = list.filter(b => (b.tags || []).includes('free'));
    if (activeFilter === 'open24') list = list.filter(b => (b.tags || []).includes('open24'));

    // Apply Location Sorting
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
        info.innerHTML = `<strong>${list.length}</strong> blood bank${list.length !== 1 ? 's' : ''} found${selectedGroup ? ` — for <strong>${selectedGroup}</strong> blood group` : ''}`;
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                <p>No blood banks found. Try adjusting your search or filter.</p>
            </div>`;
        return;
    }

    container.innerHTML = list.map(b => {
        const distBadge = b.dist != null ? `<span class="distance-badge">📍 ${b.dist.toFixed(1)} km</span>` : '';
        const rawPhone = b.phone ? b.phone.split('/')[0].replace(/\D/g, '') : '';
        const waPhone = rawPhone.startsWith('0') ? '92' + rawPhone.substring(1) : rawPhone;
        const waText = encodeURIComponent(`Assalam-o-Alaikum, I found your blood bank (${b.name}) on Karachi Blood Finder. Do you have ${selectedGroup || 'blood'} available?\n\nAddress: ${b.address}`);

        return `
        <div class="bank-card">
            <div class="card-top">
                <div class="card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#C8102E" stroke-width="1.8" width="22" height="22"><path d="M12 2C12 2 5 9 5 14a7 7 0 0 0 14 0C19 9 12 2 12 2z"/></svg>
                </div>
                <div style="flex:1;">
                    <div class="card-name">${b.name}</div>
                    <div class="card-area">${b.area}</div>
                </div>
                ${distBadge}
            </div>
            <div class="divider"></div>
            <div class="card-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${b.address}</span>
            </div>
            <div class="card-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <a href="tel:${rawPhone}">${b.phone}${b.phone_alt ? ' / ' + b.phone_alt : ''}</a>
            </div>
            <div class="card-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>${b.timing || 'Contact for timing'}</span>
            </div>
            <div class="tags-row">
                ${(b.services || []).slice(0, 3).map(s => `<span class="tag tag-service">${s}</span>`).join('')}
                ${(b.tags || []).includes('free') ? '<span class="tag tag-free">✓ Free Blood</span>' : ''}
                ${(b.tags || []).includes('open24') ? '<span class="tag tag-open">⏰ Open 24h</span>' : ''}
            </div>
            <div class="card-bottom">
                <a class="action-btn call-btn" href="tel:${rawPhone}">Call Now</a>
                ${b.email ? `<button class="action-btn email-btn" onclick="openEmailModal(${b.id})">Email</button>` : ''}
                <a class="action-btn wa-btn" href="https://wa.me/${waPhone}?text=${waText}" target="_blank">WhatsApp</a>
            </div>
        </div>`;
    }).join('');
}

// ─────────────────────────────────────────────
// EMAIL MODAL logic
// ─────────────────────────────────────────────
function openEmailModal(bankId) {
    currentEmailBank = allBanks.find(b => b.id === bankId);
    if (!currentEmailBank) return;
    const modalName = document.getElementById('modalBankName');
    const groupInput = document.getElementById('eGroup');
    if (modalName) modalName.textContent = currentEmailBank.name;
    if (groupInput) groupInput.value = selectedGroup || '';
    document.getElementById('emailModal').classList.add('open');
}

function closeEmailModal() {
    document.getElementById('emailModal').classList.remove('open');
    currentEmailBank = null;
}

// Close modal on outside click
const modalOverlay = document.getElementById('emailModal');
if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeEmailModal();
    });
}

async function sendEmail() {
    const name = document.getElementById('eName').value.trim();
    const from = document.getElementById('eFrom').value.trim();
    const group = document.getElementById('eGroup').value.trim();
    const msg = document.getElementById('eMsg').value.trim();
    
    if (!name || !from || !group) { 
        alert('Please fill in your name, email, and blood group.'); 
        return; 
    }

    // Attempt to log contact in DB
    try {
        await fetch(`${API_BASE}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                bank_id: currentEmailBank.id, 
                sender_name: name, 
                sender_email: from, 
                blood_group: group, 
                message: msg 
            })
        });
    } catch(e) { console.warn('DB logging failed, proceeding to email client.'); }

    const subject = encodeURIComponent(`Blood Request — ${group} needed urgently`);
    const body = encodeURIComponent(`Dear ${currentEmailBank.name} Team,\n\nMy name is ${name} and I need ${group} blood.\n\n${msg}\n\nContact me at: ${from}`);
    window.location.href = `mailto:${currentEmailBank.email}?subject=${subject}&body=${body}`;
    closeEmailModal();
}

// ─────────────────────────────────────────────
// DONOR REGISTRATION
// ─────────────────────────────────────────────
async function submitDonor() {
    const btn = document.getElementById('submitBtn');
    const body = {
        full_name: document.getElementById('dName').value.trim(),
        phone: document.getElementById('dPhone').value.trim(),
        email: document.getElementById('dEmail').value.trim(),
        blood_group: document.getElementById('dGroup').value,
        area: document.getElementById('dArea').value.trim(),
        notes: document.getElementById('dNote').value.trim()
    };

    if (!body.full_name || !body.phone || !body.blood_group) {
        showMsg('error', '⚠️ Please fill name, phone, and blood group.');
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
        if (res.ok) {
            showMsg('success', '✅ Thank you for registering as a donor!');
            // Clear form
            ['dName','dPhone','dEmail','dArea','dNote'].forEach(id => document.getElementById(id).value = '');
        } else {
            showMsg('error', '❌ Registration failed. Try again later.');
        }
    } catch(err) {
        showMsg('error', '❌ Connection error.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Register Now ❤️';
    }
}

function showMsg(type, text) {
    const el = document.getElementById('formMsg');
    if (!el) return;
    el.className = `form-msg ${type}`;
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 6000);
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderBgGrid();
    loadBanks();
});