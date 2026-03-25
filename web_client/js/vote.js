/**
 * Task 11 - Kliens: dinamikus form megszerkesztése DOM manipulációval
 *
 * Ha az URL-ben van ?betId=xxx → egyből mutatja azt a szavazást
 * Ha nincs → listázza az összes aktív szavazást
 */

const HU_REGIONS = [
    'Budapest', 'Pest', 'Fejér', 'Komárom-Esztergom', 'Veszprém',
    'Győr-Moson-Sopron', 'Vas', 'Zala', 'Somogy', 'Tolna', 'Baranya',
    'Bács-Kiskun', 'Békés', 'Csongrád-Csanád', 'Heves', 'Nógrád',
    'Borsod-Abaúj-Zemplén', 'Szabolcs-Szatmár-Bereg', 'Hajdú-Bihar',
    'Jász-Nagykun-Szolnok',
];

document.addEventListener('DOMContentLoaded', async () => {
    const betId = new URLSearchParams(window.location.search).get('betId');
    const container = document.getElementById('form-container');

    if (betId) {
        await loadSingleBet(container, betId);
    } else {
        await loadBetList(container);
    }
});

// ── Szavazáslista (összes aktív) ──────────────────────────────────────

async function loadBetList(container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Szavazások betöltése...</p></div>';
    try {
        const bets = await apiFetch('/api/bets');
        if (!bets.length) {
            container.innerHTML = `
                <div class="alert alert-info show">Jelenleg nincs aktív szavazás.</div>
                <a href="/admin.html" class="btn btn-primary" style="margin-top:16px">+ Új szavazás létrehozása</a>
            `;
            return;
        }
        // Párhuzamosan lekérdezzük, melyikre szavaztunk már
        const myVotes = await Promise.all(
            bets.map(b => apiFetch(`/api/bet/${b._id}/my-vote`).catch(() => ({ voted: false })))
        );
        renderBetList(container, bets, myVotes);
    } catch (err) {
        container.innerHTML = `<div class="alert alert-error show">${escHtml(err.message)}</div>`;
    }
}

function renderBetList(container, bets, myVotes) {
    container.innerHTML = '';

    const title = document.createElement('p');
    title.className = 'vote-question';
    title.textContent = 'Aktív szavazások — válassz egyet:';
    container.appendChild(title);

    const adminLink = document.createElement('a');
    adminLink.href = '/admin.html';
    adminLink.className = 'btn btn-secondary';
    adminLink.style.cssText = 'display:inline-block;margin-bottom:20px;font-size:0.85rem;';
    adminLink.textContent = '+ Új szavazás';
    container.appendChild(adminLink);

    const grid = document.createElement('div');
    grid.className = 'bet-list';

    bets.forEach((bet, i) => {
        const alreadyVoted = myVotes[i]?.voted;
        const card = document.createElement('a');
        card.className = 'bet-card' + (alreadyVoted ? ' bet-card-voted' : '');
        card.href = alreadyVoted ? `/results.html?betId=${bet._id}` : `/vote.html?betId=${bet._id}`;

        const typeLabel = bet.questionType === 'text' ? 'Szöveges válasz' : `${bet.options.length} lehetőség`;
        const ctaText = alreadyVoted
            ? `Már szavaztál: <strong>${escHtml(myVotes[i].option || '')}</strong> — Eredmények`
            : 'Szavazok &rarr;';

        card.innerHTML = `
            <div class="bet-card-type">${escHtml(typeLabel)}</div>
            <div class="bet-card-question">${escHtml(bet.question)}</div>
            <div class="bet-card-cta">${ctaText}</div>
        `;
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

// ── Egy szavazás formja ───────────────────────────────────────────────

async function loadSingleBet(container, betId) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Betöltés...</p></div>';
    try {
        // Ellenőrzés: szavazott-e már
        const myVote = await apiFetch(`/api/bet/${betId}/my-vote`);
        if (myVote.voted) {
            renderAlreadyVoted(container, betId, myVote.option);
            return;
        }

        const bet = await apiFetch(`/api/bet/${betId}`);
        renderForm(container, bet);
    } catch (err) {
        // 503 = backend nem elérhető → dobjuk tovább, hogy a lista próbáljon mást
        if (err.status === 503) throw err;
        container.innerHTML = `<div class="alert alert-error show">${escHtml(err.message)}</div>`;
    }
}

function renderAlreadyVoted(container, betId, option) {
    container.innerHTML = `
        <div class="alert alert-info show">
            Már leadtad a szavazatodat: <strong>${escHtml(option)}</strong>
        </div>
        <a href="/results.html?betId=${betId}" class="btn btn-primary" style="margin-top:12px">
            Eredmények megtekintése
        </a>
        <a href="/vote.html" class="btn btn-secondary" style="margin-top:8px; width:100%">
            Vissza a szavazásokhoz
        </a>
    `;
}

function renderForm(container, bet) {
    container.innerHTML = '';

    // Kérdés — DOM-mal épül fel (Task 11)
    const question = document.createElement('p');
    question.className = 'vote-question';
    question.textContent = bet.question;

    const alertEl = document.createElement('div');
    alertEl.className = 'alert';

    const form = document.createElement('form');
    form.id = 'vote-form';

    // ── Opciók (choice) vagy szövegmező (text) ──
    if (bet.questionType === 'text') {
        const ta = document.createElement('textarea');
        ta.name = 'textOption';
        ta.required = true;
        ta.placeholder = 'Írd ide a véleményed...';
        ta.style.cssText = 'width:100%;padding:12px;border:1px solid var(--border);border-radius:6px;font-size:1rem;min-height:100px;resize:vertical;margin-bottom:16px;';
        form.appendChild(ta);
    } else {
        const optionsGrid = document.createElement('div');
        optionsGrid.className = 'options-grid';

        bet.options.forEach(option => {
            const label = document.createElement('label');
            label.className = 'option-label';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'option';
            input.value = option;
            input.required = true;

            const span = document.createElement('span');
            span.textContent = option;

            label.appendChild(input);
            label.appendChild(span);
            optionsGrid.appendChild(label);
        });

        form.appendChild(optionsGrid);
    }

    // ── Régió választó ──
    const regionGroup = document.createElement('div');
    regionGroup.className = 'form-group';
    regionGroup.style.marginBottom = '20px';

    const regionLabel = document.createElement('label');
    regionLabel.textContent = 'Megye / Régió (opcionális)';

    const regionSelect = document.createElement('select');
    regionSelect.name = 'region';
    regionSelect.style.cssText = 'width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:6px;font-size:1rem;background:white;color:var(--text);cursor:pointer;';

    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '— Nem adom meg —';
    regionSelect.appendChild(emptyOpt);

    HU_REGIONS.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        regionSelect.appendChild(opt);
    });

    regionGroup.appendChild(regionLabel);
    regionGroup.appendChild(regionSelect);
    form.appendChild(regionGroup);

    // ── Submit gomb ──
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Szavazat leadása';

    form.appendChild(alertEl);
    form.appendChild(submitBtn);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let option;
        if (bet.questionType === 'text') {
            option = form.querySelector('textarea[name="textOption"]').value.trim();
            if (!option) return;
        } else {
            const sel = form.querySelector('input[name="option"]:checked');
            if (!sel) return;
            option = sel.value;
        }

        const region = regionSelect.value || null;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Küldés...';
        alertEl.className = 'alert';

        try {
            await apiFetch('/api/vote', {
                method: 'POST',
                body: JSON.stringify({ betId: bet._id, option, region }),
            });

            alertEl.className = 'alert alert-success show';
            alertEl.textContent = `Szavazatod sikeresen leadva: "${option}"`;
            submitBtn.textContent = 'Szavazat elküldve ✓';
            form.querySelectorAll('input, textarea, select, button').forEach(el => { el.disabled = true; });

            setTimeout(() => { window.location.href = `/results.html?betId=${bet._id}`; }, 1800);
        } catch (err) {
            alertEl.className = 'alert alert-error show';
            alertEl.textContent = err.message;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Szavazat leadása';
        }
    });

    const backLink = document.createElement('a');
    backLink.href = '/vote.html';
    backLink.className = 'auth-link';
    backLink.style.display = 'block';
    backLink.style.marginTop = '16px';
    backLink.textContent = '← Vissza a szavazásokhoz';

    container.appendChild(question);
    container.appendChild(form);
    container.appendChild(backLink);
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
