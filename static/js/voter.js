/**
 * Voter Interface — JavaScript
 * Handles voter login, candidate selection, vote submission,
 * confirmation modal, and blockchain receipt display.
 * Uses Lucide icons — calls lucide.createIcons() after dynamic HTML injection.
 */

const API = '';

// ─── State ──────────────────────────────────────────────────────────
let currentVoter = null;
let selectedCandidate = null;

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

function showStep(stepId) {
    ['step-login', 'step-vote', 'step-receipt', 'step-already-voted'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById(stepId).style.display = 'block';
}

// ─── Step 1: Voter Login ────────────────────────────────────────────

document.getElementById('voter-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const voterId = document.getElementById('voter-id').value.trim().toUpperCase();

    if (!voterId) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Verifying…';

    try {
        const res = await fetch(API + '/api/voter/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voter_id: voterId })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        currentVoter = data.voter;

        if (currentVoter.has_voted) {
            showAlreadyVoted();
            return;
        }

        document.getElementById('voter-name-display').textContent = currentVoter.name;
        await loadCandidates();
        showStep('step-vote');

    } catch (err) {
        showAlert('login-alert', err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="fingerprint"></i> Verify Identity';
        lucide.createIcons();
    }
});

// ─── Already Voted Screen ───────────────────────────────────────────

async function showAlreadyVoted() {
    showStep('step-already-voted');

    try {
        const res = await fetch(API + `/api/verify-vote/${currentVoter.voter_id}`);
        const data = await res.json();

        if (data.verified) {
            const block = data.block;
            document.getElementById('existing-vote-info').innerHTML = `
                <div class="detail-row">
                    <span class="d-label">Voter ID</span>
                    <span class="d-value">${block.data.voter_id}</span>
                </div>
                <div class="detail-row">
                    <span class="d-label">Candidate</span>
                    <span class="d-value">${block.data.candidate}</span>
                </div>
                <div class="detail-row">
                    <span class="d-label">Block Hash</span>
                    <span class="d-value" style="font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:var(--cyan-400);word-break:break-all;">${block.hash}</span>
                </div>
                <div class="detail-row">
                    <span class="d-label">Chain Status</span>
                    <span class="d-value">
                        <span class="badge badge-success"><i data-lucide="shield-check"></i> Verified</span>
                    </span>
                </div>
            `;
            lucide.createIcons();
        }
    } catch (err) {
        console.error('Verify error:', err);
    }
}

// ─── Step 2: Load & Select Candidates ───────────────────────────────

async function loadCandidates() {
    const container = document.getElementById('candidate-list');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Loading candidates…</span></div>';

    try {
        const res = await fetch(API + '/api/candidates');
        const data = await res.json();

        if (data.candidates.length === 0) {
            container.innerHTML = `
                <div class="glass-card text-center text-muted" style="padding:48px; grid-column:1/-1;">
                    <i data-lucide="inbox" style="width:32px;height:32px;margin-bottom:12px;opacity:0.4;"></i>
                    <p>No candidates available</p>
                </div>`;
            lucide.createIcons();
            return;
        }

        container.innerHTML = data.candidates.map(c => `
            <div class="glass-card candidate-option" data-name="${c.name}" onclick="selectCandidate(this, '${c.name.replace(/'/g, "\\'")}')">
                <div class="c-name">${c.name}</div>
                <div class="c-party">${c.party}</div>
                <div class="c-desc">${c.description || ''}</div>
            </div>
        `).join('');

        lucide.createIcons();
    } catch (err) {
        container.innerHTML = `<div class="alert alert-error"><i data-lucide="alert-circle"></i> Failed to load candidates</div>`;
        lucide.createIcons();
    }
}

function selectCandidate(element, name) {
    document.querySelectorAll('.candidate-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    selectedCandidate = name;
    document.getElementById('submit-vote-btn').disabled = false;
}

// ─── Step 3: Submit Vote ────────────────────────────────────────────

document.getElementById('submit-vote-btn').addEventListener('click', () => {
    if (!selectedCandidate) return;
    document.getElementById('confirm-candidate-name').textContent = selectedCandidate;
    document.getElementById('confirm-modal').classList.add('active');
});

document.getElementById('cancel-vote-btn').addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.remove('active');
});

document.getElementById('confirm-vote-btn').addEventListener('click', async () => {
    const confirmBtn = document.getElementById('confirm-vote-btn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner"></span> Mining block…';

    try {
        const res = await fetch(API + '/api/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                voter_id: currentVoter.voter_id,
                candidate_name: selectedCandidate
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Vote failed');

        document.getElementById('confirm-modal').classList.remove('active');

        const receipt = data.receipt;
        document.getElementById('receipt-hash').textContent = receipt.block_hash;
        document.getElementById('receipt-voter-id').textContent = receipt.voter_id;
        document.getElementById('receipt-candidate').textContent = receipt.candidate;
        document.getElementById('receipt-block-index').textContent = '#' + receipt.block_index;
        document.getElementById('receipt-timestamp').textContent = new Date(receipt.timestamp * 1000).toLocaleString();

        showStep('step-receipt');
        lucide.createIcons();

    } catch (err) {
        document.getElementById('confirm-modal').classList.remove('active');
        showAlert('vote-alert', err.message);
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i data-lucide="check"></i> Confirm Vote';
        lucide.createIcons();
    }
});

// Close modal on overlay click
document.getElementById('confirm-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        document.getElementById('confirm-modal').classList.remove('active');
    }
});
