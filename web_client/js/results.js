/**
 * Task 12 - Lekérdezés kliensről: eredmények megjelenítése
 * Task 15 - Automatikus frissítés (5 másodpercenként)
 *
 * Ha URL-ben van ?betId=xxx → azt a szavazást mutatja részletesen
 * Ha nincs → listázza az összes aktív szavazást
 */

const REFRESH_MS = 5000;
const BAR_COLORS = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
let chartInstance = null;
let refreshTimer  = null;

document.addEventListener('DOMContentLoaded', () => {
    const betId = new URLSearchParams(window.location.search).get('betId');
    if (betId) {
        loadResults(betId);
        refreshTimer = setInterval(() => loadResults(betId), REFRESH_MS);
    } else {
        loadBetList();
    }
});

// ── Szavazáslista ─────────────────────────────────────────────────────

async function loadBetList() {
    const container = document.getElementById('results-container');
    try {
        const bets = await apiFetch('/api/bets');
        if (!bets.length) {
            container.innerHTML = '<div class="alert alert-info show">Nincs aktív szavazás.</div>';
            return;
        }

        container.innerHTML = `
            <p class="vote-question">Válassz szavazást az eredmények megtekintéséhez:</p>
            <div class="bet-list">${bets.map(bet => `
                <a class="bet-card" href="/results.html?betId=${bet._id}">
                    <div class="bet-card-type">${escHtml(bet.questionType === 'text' ? 'Szöveges' : `${bet.options.length} lehetőség`)}</div>
                    <div class="bet-card-question">${escHtml(bet.question)}</div>
                    <div class="bet-card-cta">Eredmények &rarr;</div>
                </a>`).join('')}
            </div>`;
    } catch (err) {
        container.innerHTML = `<div class="alert alert-error show">${escHtml(err.message)}</div>`;
    }
}

// ── Egy szavazás részletes eredményei ─────────────────────────────────

async function loadResults(betId) {
    const container = document.getElementById('results-container');
    try {
        const [bet, regionalData] = await Promise.all([
            apiFetch(`/api/bet/${betId}`),
            apiFetch(`/api/bet/${betId}/regional`).catch(() => ({ regional: [] })),
        ]);
        renderResults(container, bet, regionalData.regional || []);
    } catch (err) {
        if (!container.querySelector('.results-question')) {
            container.innerHTML = `<div class="alert alert-error show">${escHtml(err.message)}</div>`;
        }
    }
}

function renderResults(container, bet, regional) {
    const total = bet.votes.reduce((s, v) => s + v.count, 0);

    const items = bet.options.length
        ? bet.options.map(option => {
            const e = bet.votes.find(v => v._id === option);
            const count = e ? e.count : 0;
            return { option, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
        }).sort((a, b) => b.count - a.count)
        : bet.votes.map(v => ({ option: v._id, count: v.count, pct: total > 0 ? Math.round((v.count / total) * 100) : 0 }))
              .sort((a, b) => b.count - a.count);

    const barsHtml = items.map((item, i) => `
        <div class="result-item">
            <div class="result-row">
                <span class="result-option">${escHtml(item.option)}</span>
                <span class="result-meta">${item.count} szavazat &middot; ${item.pct}%</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar" style="width:${item.pct}%; background:${BAR_COLORS[i % BAR_COLORS.length]}"></div>
            </div>
        </div>`).join('');

    const regionalHtml = renderRegionalTable(bet.options, regional);

    container.innerHTML = `
        <div class="results-header">
            <div>
                <p class="results-question">${escHtml(bet.question)}</p>
                <p class="total-votes">${total} szavazat összesen</p>
            </div>
            <span class="live-badge"><span class="live-dot"></span> Élő</span>
        </div>
        <div class="results-list">${barsHtml}</div>
        <div class="chart-container"><canvas id="results-chart"></canvas></div>
        ${regionalHtml}
        <div style="margin-top:20px">
            <a href="/results.html" class="auth-link">← Vissza a szavazásokhoz</a>
        </div>`;

    renderChart(items);
}

// ── Régiónkénti táblázat ──────────────────────────────────────────────

function renderRegionalTable(options, regional) {
    if (!regional || !regional.length) return '';

    // Összes opció összegyűjtése
    const allOptions = options.length ? options : [...new Set(regional.flatMap(r => r.votes.map(v => v.option)))];

    const rows = regional.map(({ region, votes }) => {
        const total = votes.reduce((s, v) => s + v.count, 0);
        const countMap = Object.fromEntries(votes.map(v => [v.option, v.count]));

        // Vezető párt
        const winner = votes.reduce((a, b) => (a.count >= b.count ? a : b), { option: '-', count: 0 });

        const cells = allOptions.map((opt, i) => {
            const cnt = countMap[opt] || 0;
            const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
            const isWinner = opt === winner.option;
            return `<td style="${isWinner ? `font-weight:700;color:${BAR_COLORS[i % BAR_COLORS.length]}` : ''}">${cnt} <small>(${pct}%)</small></td>`;
        }).join('');

        return `<tr>
            <td style="font-weight:600;white-space:nowrap">${escHtml(region)}</td>
            ${cells}
            <td style="color:var(--text-muted)">${total}</td>
            <td style="font-weight:700;color:${BAR_COLORS[allOptions.indexOf(winner.option) % BAR_COLORS.length]}">${escHtml(winner.option)}</td>
        </tr>`;
    }).join('');

    const headers = allOptions.map((o, i) =>
        `<th style="color:${BAR_COLORS[i % BAR_COLORS.length]}">${escHtml(o)}</th>`
    ).join('');

    return `
        <div class="chart-container" style="margin-top:28px; overflow-x:auto">
            <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px;color:var(--text)">
                Régiónkénti bontás
            </h3>
            <table class="regional-table">
                <thead>
                    <tr>
                        <th>Megye</th>
                        ${headers}
                        <th>Összesen</th>
                        <th>Vezető</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

// ── Bar chart ─────────────────────────────────────────────────────────

function renderChart(items) {
    const canvas = document.getElementById('results-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: items.map(i => i.option),
            datasets: [{
                label: 'Szavazatok',
                data:  items.map(i => i.count),
                backgroundColor: items.map((_, i) => BAR_COLORS[i % BAR_COLORS.length] + 'bb'),
                borderColor:     items.map((_, i) => BAR_COLORS[i % BAR_COLORS.length]),
                borderWidth: 2,
                borderRadius: 6,
            }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} szavazat` } } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } },
        },
    });
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
