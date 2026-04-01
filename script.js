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

async function sendEmail() {
    const name = document.getElementById('eName').value.trim();
    const from = document.getElementById('eFrom').value.trim();
    const group = document.getElementById('eGroup').value.trim();
    const msg = document.getElementById('eMsg').value.trim();
    
    if (!name || !from || !group) { 
        alert('Please fill in your name, email, and blood group.'); 
        return; 
    }

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

        // SweetAlert for Inquiry
        Swal.fire({
            icon: 'success',
            title: 'Inquiry Sent!',
            text: 'Your request has been logged. You will receive a response or a call within 5 to 10 minutes.',
            confirmButtonColor: '#C8102E'
        });

    } catch(e) { console.warn("DB log failed"); }

    const subject = encodeURIComponent(`Blood Request — ${group} needed urgently`);
    const body = encodeURIComponent(`Dear ${currentEmailBank.name} Team,\n\nMy name is ${name} and I need ${group} blood.\n\nContact: ${from}`);
    
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
        age: parseInt(document.getElementById('dAge').value) || null,
        last_donated: document.getElementById('dLast').value.trim(),
        notes: document.getElementById('dNote').value.trim()
    };

    if (!body.full_name || !body.phone || !body.blood_group) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Please fill in your name, phone, and blood group!',
            confirmButtonColor: '#C8102E'
        });
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
            // SweetAlert Success
            Swal.fire({
                icon: 'success',
                title: 'Registration Successful!',
                text: 'Thank you for registering. You will receive a verification call within 5 to 10 minutes.',
                confirmButtonColor: '#C8102E'
            });

            // Form clear
            ['dName','dPhone','dEmail','dGroup','dArea','dAge','dLast','dNote'].forEach(id => {
                const el = document.getElementById(id);
                if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = '';
            });
        } else {
            throw new Error('Failed');
        }
    } catch(err) {
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Could not connect to the server. Please try again later.',
            confirmButtonColor: '#C8102E'
        });
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
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderBgGrid();
    loadBanks();
});