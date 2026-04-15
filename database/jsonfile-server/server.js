/**
 * Task 10: Adatbázis text file írása — socketen figyelő szerver
 *
 * TCP socket szerver, amely JSON fájlokban tárolja a szavazatokat.
 * Protokoll: minden üzenet egy JSON objektum + newline (\n)
 *
 * Támogatott akciók:
 *   GET_ACTIVE_BET          → visszaadja az aktív szavazást szavazatszámokkal
 *   GET_VOTES { betId }     → visszaadja a szavazatszámokat
 *   RECORD_VOTE { betId, option, voterId } → szavazat rögzítése
 *
 * Indítás: node database/jsonfile-server/server.js
 */

const net  = require('net');
const fs   = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const PORT     = parseInt(process.env.JSONFILE_PORT) || 5002;
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── File helpers ──────────────────────────────────────────────────────

function betsFile()         { return path.join(DATA_DIR, 'bets.json'); }
function votesFile(betId)   { return path.join(DATA_DIR, `votes_${betId}.json`); }

app.get('/api/active-bet', async (_req, res) => {
    try {
        const activeBet = await adapter.getActiveBet();
        res.json(activeBet || null);
    } catch (err) {
        res.status(503).json({ error: `Backend nem elérhető: ${err.message}` });
    }
});

function loadBets() {
    if (!fs.existsSync(betsFile())) return [];
    return JSON.parse(fs.readFileSync(betsFile(), 'utf8'));
}

function loadVotesRaw(betId) {
    const f = votesFile(betId);
    if (!fs.existsSync(f)) return {};
    return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function saveVotesRaw(betId, data) {
    fs.writeFileSync(votesFile(betId), JSON.stringify(data, null, 2));
}

/** Aggregálja a nyers szavazatokat: [{ _id: option, count }] */
function aggregateVotes(betId) {
    const raw = loadVotesRaw(betId);
    const counts = {};
    for (const entry of Object.values(raw)) {
        counts[entry.option] = (counts[entry.option] || 0) + 1;
    }
    return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
}

// ── Request handler ───────────────────────────────────────────────────

function handleMessage(msg, socket) {
    try {
        switch (msg.action) {
            case 'GET_ACTIVE_BET': {
                const bet = loadBets().find(b => b.isActive);
                if (!bet) {
                    socket.write(JSON.stringify({ success: true, data: null }) + '\n');
                    return;
                }
                socket.write(JSON.stringify({
                    success: true,
                    data: { ...bet, votes: aggregateVotes(bet.id) },
                }) + '\n');
                break;
            }
            case 'GET_VOTES': {
                if (!msg.betId) throw new Error('betId required');
                socket.write(JSON.stringify({
                    success: true,
                    data: aggregateVotes(msg.betId),
                }) + '\n');
                break;
            }
            case 'HAS_VOTED': {
                if (!msg.betId || !msg.voterId) throw new Error('betId, voterId required');
                const rawHv = loadVotesRaw(msg.betId);
                const entry = rawHv[msg.voterId];
                socket.write(JSON.stringify({ success: true, data: entry ? { option: entry.option } : null }) + '\n');
                break;
            }
            case 'RECORD_VOTE': {
                if (!msg.betId || !msg.option || !msg.voterId) {
                    throw new Error('betId, option, voterId required');
                }
                const raw = loadVotesRaw(msg.betId);
                if (raw[msg.voterId]) {
                    socket.write(JSON.stringify({ error: 'DUPLICATE_VOTE' }) + '\n');
                    return;
                }
                raw[msg.voterId] = { option: msg.option, votedAt: new Date().toISOString() };
                saveVotesRaw(msg.betId, raw);
                socket.write(JSON.stringify({ success: true }) + '\n');
                break;
            }
            default:
                socket.write(JSON.stringify({ error: `Unknown action: ${msg.action}` }) + '\n');
        }
    } catch (err) {
        socket.write(JSON.stringify({ error: err.message }) + '\n');
    }
}

// ── TCP Server ────────────────────────────────────────────────────────

const server = net.createServer(socket => {
    let buffer = '';

    socket.on('data', chunk => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // utolsó, befejezetlen sor megőrzése

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                handleMessage(JSON.parse(line), socket);
            } catch {
                socket.write(JSON.stringify({ error: 'Invalid JSON' }) + '\n');
            }
        }
    });

    socket.on('error', () => {}); // kliens bonthatja a kapcsolatot
});

server.listen(PORT, () => {
    console.log(`JSON-file socket szerver fut a ${PORT} porton`);
    console.log(`Adatfájlok helye: ${DATA_DIR}`);
});
