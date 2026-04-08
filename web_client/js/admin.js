/**
 * Admin oldal — szavazások kezelése
 * Új szavazás létrehozása + meglévők lezárása
 */

document.addEventListener('DOMContentLoaded', () => {
    // Hitelesítés ellenőrzése — csak bejelentkezett felhasználók
    const user = getUser();
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    // Opcionálisan: csak admin felhasználók
    if (user.role !== 'admin') {
        window.location.href = '/index.html';
        return;
    }

    updateNav();
    initOptionsSection();
    loadBetsList();

    document.getElementById('create-form').addEventListener('submit', handleCreate);
    document.getElementById('questionType').addEventListener('change', (e) => {
        document.getElementById('options-section').style.display =
            e.target.value === 'text' ? 'none' : '';
    });
});

// ── Opciók kezelése ───────────────────────────────────────────────────

function initOptionsSection() {
    addOptionRow();
    addOptionRow();
    document.getElementById('add-option-btn').addEventListener('click', addOptionRow);
}

function addOptionRow(value = '') {
    const list = document.getElementById('options-list');
    const row = document.createElement('div');
    row.className = 'option-row';
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `${list.children.length + 1}. lehetőség`;
    input.value = value;
    input.style.flex = '1';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.className = 'btn btn-secondary';
    removeBtn.style.cssText = 'padding:8px 12px;flex-shrink:0;';
    removeBtn.addEventListener('click', () => {
        if (document.getElementById('options-list').children.length > 2) {
            row.remove();
            renumberOptions();
        }
    });

    row.appendChild(input);
    row.appendChild(removeBtn);
    list.appendChild(row);
}

function renumberOptions() {
    const inputs = document.querySelectorAll('#options-list input');
    inputs.forEach((inp, i) => { inp.placeholder = `${i + 1}. lehetőség`; });
}

function getOptions() {
    return Array.from(document.querySelectorAll('#options-list input'))
        .map(i => i.value.trim())
        .filter(Boolean);
}

// ── Szavazás létrehozása ──────────────────────────────────────────────

async function handleCreate(e) {
    e.preventDefault();
    const alertEl  = document.getElementById('create-alert');
    const btn      = document.getElementById('create-btn');
    const question = document.getElementById('question').value.trim();
    const questionType = document.getElementById('questionType').value;
    const dbType       = document.getElementById('dbType').value;

    const options = questionType === 'text' ? [] : getOptions();
    if (questionType !== 'text' && options.length < 2) {
        showAlert(alertEl, 'error', 'Legalább 2 választási lehetőség szükséges!');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Létrehozás...';
    alertEl.className = 'alert';

    try {
        await apiFetch('/api/bets', {
            method: 'POST',
            body: JSON.stringify({ question, options, questionType, dbType }),
        });

        showAlert(alertEl, 'success', 'Szavazás sikeresen létrehozva!');
        document.getElementById('create-form').reset();
        document.getElementById('options-list').innerHTML = '';
        document.getElementById('options-section').style.display = '';
        initOptionsSection();
        loadBetsList();
    } catch (err) {
        showAlert(alertEl, 'error', err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Szavazás létrehozása';
    }
}

// ── Szavazások listája ────────────────────────────────────────────────

async function loadBetsList() {
    const container = document.getElementById('bets-list');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Betöltés...</p></div>';

    try {
        const bets = await apiFetch('/api/bets/all');
        if (!bets.length) {
            container.innerHTML = '<p style="color:var(--text-light)">Még nincs szavazás.</p>';
            return;
        }
        renderBetsList(container, bets);
    } catch (err) {
        container.innerHTML = `<div class="alert alert-error show">${escHtml(err.message)}</div>`;
    }
}

function renderBetsList(container, bets) {
    container.innerHTML = '';

    bets.forEach(bet => {
        const row = document.createElement('div');
        row.className = 'admin-bet-row';
        row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;';

        const statusDot = bet.isActive
            ? '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--success);flex-shrink:0"></span>'
            : '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--border);flex-shrink:0"></span>';

        const label = document.createElement('div');
        label.style.flex = '1';
        label.innerHTML = `
            ${statusDot}
            <strong style="margin-left:8px">${escHtml(bet.question)}</strong>
            <span style="margin-left:8px;font-size:0.8rem;color:var(--text-light)">${escHtml(bet.dbType)} · ${escHtml(bet.questionType)}</span>
            ${!bet.isActive ? '<span style="margin-left:8px;font-size:0.8rem;color:var(--text-light)">[lezárva]</span>' : ''}
        `;

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;flex-shrink:0;';

        const viewBtn = document.createElement('a');
        viewBtn.href = `/results.html?betId=${bet._id}`;
        viewBtn.className = 'btn btn-secondary';
        viewBtn.style.cssText = 'padding:6px 12px;font-size:0.85rem;';
        viewBtn.textContent = 'Eredmények';
        actions.appendChild(viewBtn);

        if (bet.isActive) {
            const voteBtn = document.createElement('a');
            voteBtn.href = `/vote.html?betId=${bet._id}`;
            voteBtn.className = 'btn btn-secondary';
            voteBtn.style.cssText = 'padding:6px 12px;font-size:0.85rem;';
            voteBtn.textContent = 'Szavazás';
            actions.appendChild(voteBtn);

            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn-secondary';
            closeBtn.style.cssText = 'padding:6px 12px;font-size:0.85rem;color:var(--error);border-color:var(--error);';
            closeBtn.textContent = 'Lezárás';
            closeBtn.addEventListener('click', async () => {
                if (!confirm('Biztosan lezárod ezt a szavazást?')) return;
                try {
                    await apiFetch(`/api/bet/${bet._id}/close`, { method: 'PATCH' });
                    loadBetsList();
                } catch (err) {
                    alert(err.message);
                }
            });
            actions.appendChild(closeBtn);
        }

        row.appendChild(label);
        row.appendChild(actions);
        container.appendChild(row);
    });
}

// ── Helpers ───────────────────────────────────────────────────────────

function showAlert(el, type, msg) {
    el.className = `alert alert-${type} show`;
    el.textContent = msg;
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
