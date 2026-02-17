/**
 * Admin Dashboard — JavaScript
 * Handles login, sidebar navigation, CRUD operations, results, and blockchain status.
 * Uses Lucide icons — must call lucide.createIcons() after dynamic HTML injection.
 */

const API = '';
let adminToken = null;

// ─── Helpers ────────────────────────────────────────────────────────

function showAlert(containerId, message, type = 'error') {
    const iconMap = {
        error: '<i data-lucide="alert-circle"></i>',
        success: '<i data-lucide="check-circle"></i>',
        info: '<i data-lucide="info"></i>'
    };
    const el = document.getElementById(containerId);
    el.innerHTML = `<div class="alert alert-${type}">${iconMap[type] || ''} ${message}</div>`;
    lucide.createIcons();
    setTimeout(() => { el.innerHTML = ''; }, 5000);
}

async function apiRequest(url, options = {}) {
    const defaults = { headers: { 'Content-Type': 'application/json' } };
    if (adminToken) defaults.headers['Authorization'] = `Bearer ${adminToken}`;
    const res = await fetch(API + url, { ...defaults, ...options });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// ─── Login ──────────────────────────────────────────────────────────

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
        const data = await apiRequest('/api/admin/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        adminToken = data.access_token;
        document.getElementById('admin-email-display').textContent = email;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard-screen').style.display = 'grid';

        loadOverview();
    } catch (err) {
        showAlert('login-alert', err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="log-in"></i> Sign In';
        lucide.createIcons();
    }
});

// ─── Sidebar Navigation ────────────────────────────────────────────

document.querySelectorAll('.sidebar-nav a[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;

        document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');

        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`panel-${section}`).classList.add('active');

        switch (section) {
            case 'overview': loadOverview(); break;
            case 'candidates': loadCandidates(); break;
            case 'voters': loadVoters(); break;
            case 'results': loadResults(); break;
            case 'blockchain': loadBlockchain(); break;
        }
    });
});

// ─── Logout ─────────────────────────────────────────────────────────

document.getElementById('logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    adminToken = null;
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('admin-email').value = '';
    document.getElementById('admin-password').value = '';
});

// ─── Overview ───────────────────────────────────────────────────────

async function loadOverview() {
    try {
        const [resultsData, candidatesData, votersData] = await Promise.all([
            apiRequest('/api/admin/results'),
            apiRequest('/api/admin/candidates'),
            apiRequest('/api/admin/voters')
        ]);

        const stats = resultsData.stats;
        document.getElementById('stat-candidates').textContent = candidatesData.candidates.length;
        document.getElementById('stat-voters').textContent = stats.total_voters;
        document.getElementById('stat-voted').textContent = stats.voted;
        document.getElementById('stat-turnout').textContent = stats.turnout + '%';

        const container = document.getElementById('overview-results');
        if (resultsData.results.length === 0) {
            container.innerHTML = `
                <div class="glass-card text-center text-muted" style="padding:48px; grid-column:1/-1;">
                    <i data-lucide="inbox" style="width:32px;height:32px;margin-bottom:12px;opacity:0.4;"></i>
                    <p>No results yet. Waiting for votes…</p>
                </div>`;
        } else {
            container.innerHTML = resultsData.results.map(r => `
                <div class="glass-card result-card">
                    <div class="r-header">
                        <div class="r-avatar">${r.name.charAt(0)}</div>
                        <div>
                            <div class="r-name">${r.name}</div>
                            <div class="r-party">${r.party}</div>
                        </div>
                    </div>
                    <div class="vote-bar">
                        <div class="vote-bar-fill" style="width:${r.percentage}%"></div>
                    </div>
                    <div class="r-stats">
                        <span class="count">${r.vote_count} votes</span>
                        <span>${r.percentage}%</span>
                    </div>
                </div>
            `).join('');
        }
        lucide.createIcons();
    } catch (err) {
        console.error('Overview error:', err);
    }
}

// ─── Candidates ─────────────────────────────────────────────────────

async function loadCandidates() {
    try {
        const data = await apiRequest('/api/admin/candidates');
        const tbody = document.getElementById('candidates-tbody');

        if (data.candidates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding:48px;">No candidates yet</td></tr>';
        } else {
            tbody.innerHTML = data.candidates.map(c => `
                <tr>
                    <td style="font-weight:600; color:var(--text-primary);">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="width:32px;height:32px;border-radius:50%;background:var(--gradient-brand);display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:0.75rem;color:white;flex-shrink:0;">${c.name.charAt(0)}</div>
                            ${c.name}
                        </div>
                    </td>
                    <td><span class="badge badge-info">${c.party}</span></td>
                    <td style="max-width:240px; white-space:normal;">${c.description || '—'}</td>
                    <td><span style="font-family:'Space Grotesk',sans-serif;font-weight:800;color:var(--indigo-400);font-size:1.1rem;">${c.vote_count}</span></td>
                </tr>
            `).join('');
        }
        lucide.createIcons();
    } catch (err) {
        console.error('Candidates error:', err);
    }
}

document.getElementById('add-candidate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cand-name').value.trim();
    const party = document.getElementById('cand-party').value.trim();
    const description = document.getElementById('cand-desc').value.trim();

    try {
        await apiRequest('/api/admin/add-candidate', {
            method: 'POST',
            body: JSON.stringify({ name, party, description })
        });
        showAlert('candidate-alert', `${name} added successfully!`, 'success');
        document.getElementById('add-candidate-form').reset();
        loadCandidates();
    } catch (err) {
        showAlert('candidate-alert', err.message);
    }
});

// ─── Voters ─────────────────────────────────────────────────────────

async function loadVoters() {
    try {
        const data = await apiRequest('/api/admin/voters');
        const tbody = document.getElementById('voters-tbody');

        if (data.voters.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted" style="padding:48px;">No voters registered</td></tr>';
        } else {
            tbody.innerHTML = data.voters.map(v => `
                <tr>
                    <td style="font-family:'JetBrains Mono',monospace; font-weight:600; color:var(--text-primary); font-size:0.85rem;">${v.voter_id}</td>
                    <td style="font-weight:500;">${v.name}</td>
                    <td style="color:var(--text-muted);">${v.email}</td>
                    <td>
                        ${v.has_voted
                    ? '<span class="badge badge-success"><i data-lucide="check"></i> Voted</span>'
                    : '<span class="badge badge-warning"><i data-lucide="clock"></i> Pending</span>'
                }
                    </td>
                </tr>
            `).join('');
        }
        lucide.createIcons();
    } catch (err) {
        console.error('Voters error:', err);
    }
}

document.getElementById('add-voter-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const voter_id = document.getElementById('voter-id-input').value.trim();
    const name = document.getElementById('voter-name-input').value.trim();
    const email = document.getElementById('voter-email-input').value.trim();

    try {
        await apiRequest('/api/admin/add-voter', {
            method: 'POST',
            body: JSON.stringify({ voter_id, name, email })
        });
        showAlert('voter-alert', `${name} (${voter_id}) registered!`, 'success');
        document.getElementById('add-voter-form').reset();
        loadVoters();
    } catch (err) {
        showAlert('voter-alert', err.message);
    }
});

// ─── Results ────────────────────────────────────────────────────────

async function loadResults() {
    try {
        const data = await apiRequest('/api/admin/results');
        const stats = data.stats;

        // Turnout ring
        const circumference = 2 * Math.PI * 70; // ~440
        const offset = circumference - (stats.turnout / 100) * circumference;
        document.getElementById('turnout-ring-fill').style.strokeDashoffset = offset;
        document.getElementById('turnout-percent').textContent = stats.turnout + '%';
        document.getElementById('result-voted').textContent = stats.voted;
        document.getElementById('result-registered').textContent = stats.total_voters;
        document.getElementById('result-total-votes').textContent = stats.total_votes;

        const container = document.getElementById('results-container');
        if (data.results.length === 0) {
            container.innerHTML = `
                <div class="glass-card text-center text-muted" style="padding:48px; grid-column:1/-1;">
                    <i data-lucide="inbox" style="width:32px;height:32px;margin-bottom:12px;opacity:0.4;"></i>
                    <p>No votes recorded yet</p>
                </div>`;
        } else {
            container.innerHTML = data.results.map(r => `
                <div class="glass-card result-card">
                    <div class="r-header">
                        <div class="r-avatar">${r.name.charAt(0)}</div>
                        <div>
                            <div class="r-name">${r.name}</div>
                            <div class="r-party">${r.party}</div>
                        </div>
                    </div>
                    <div class="vote-bar">
                        <div class="vote-bar-fill" style="width:${r.percentage}%"></div>
                    </div>
                    <div class="r-stats">
                        <span class="count">${r.vote_count} votes</span>
                        <span>${r.percentage}%</span>
                    </div>
                </div>
            `).join('');
        }
        lucide.createIcons();
    } catch (err) {
        console.error('Results error:', err);
    }
}

// ─── Blockchain ─────────────────────────────────────────────────────

async function loadBlockchain() {
    try {
        const data = await apiRequest('/api/blockchain/validate');

        document.getElementById('chain-status').innerHTML = `
            <div class="glass-card no-hover" style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
                    <div style="width:52px;height:52px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;background:${data.valid ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)'};color:${data.valid ? 'var(--emerald-400)' : 'var(--rose-400)'};">
                        <i data-lucide="${data.valid ? 'shield-check' : 'shield-x'}" style="width:26px;height:26px;"></i>
                    </div>
                    <div>
                        <h3 style="margin-bottom:2px;">Chain is ${data.valid ? 'Valid' : 'INVALID'}</h3>
                        <p style="font-size:0.8rem;color:var(--text-muted);">
                            ${data.stats.total_blocks} blocks · ${data.stats.total_votes} votes · Difficulty ${data.stats.difficulty}
                        </p>
                    </div>
                </div>
                <div class="stats-row" style="margin-bottom:0;">
                    <div class="glass-card stat-card">
                        <div class="stat-icon indigo"><i data-lucide="boxes"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${data.stats.total_blocks}</div>
                            <div class="stat-label">Total Blocks</div>
                        </div>
                    </div>
                    <div class="glass-card stat-card">
                        <div class="stat-icon emerald"><i data-lucide="check-square"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${data.stats.total_votes}</div>
                            <div class="stat-label">Vote Blocks</div>
                        </div>
                    </div>
                    <div class="glass-card stat-card">
                        <div class="stat-icon amber"><i data-lucide="gauge"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${data.stats.difficulty}</div>
                            <div class="stat-label">Difficulty</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('chain-blocks').innerHTML = data.chain.slice().reverse().map(block => `
            <div class="glass-card block-item">
                <div class="b-header">
                    <div class="b-badges">
                        <span class="badge ${block.data.type === 'genesis' ? 'badge-warning' : 'badge-success'}">
                            <i data-lucide="${block.data.type === 'genesis' ? 'flag' : 'check-square'}"></i>
                            ${block.data.type === 'genesis' ? 'Genesis' : 'Vote'}
                        </span>
                        <span class="badge badge-indigo">
                            <i data-lucide="hash"></i> Block ${block.index}
                        </span>
                    </div>
                    <span class="b-time">${new Date(block.timestamp * 1000).toLocaleString()}</span>
                </div>
                ${block.data.type === 'vote' ? `
                    <div class="b-vote-info">
                        <i data-lucide="user"></i>
                        <strong>${block.data.voter_id}</strong>
                        <i data-lucide="arrow-right"></i>
                        <strong>${block.data.candidate}</strong>
                    </div>
                ` : ''}
                <div class="b-hash">${block.hash}</div>
            </div>
        `).join('');

        lucide.createIcons();
    } catch (err) {
        console.error('Blockchain error:', err);
        document.getElementById('chain-status').innerHTML = `
            <div class="alert alert-error"><i data-lucide="alert-circle"></i> Failed to load blockchain data</div>
        `;
        lucide.createIcons();
    }
}
