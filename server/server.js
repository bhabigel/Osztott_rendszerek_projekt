const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const http     = require('http');
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
require('dotenv').config();

const connectDatabase = require('../database/connection');
const Bet     = require('../database/models/Bet');
const Vote    = require('../database/models/Vote');
const User    = require('../database/models/User');
const adapter = require('../database/adapter');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web_client')));

const JWT_SECRET  = process.env.JWT_SECRET  || 'change-this-secret-in-production';
const DISPLAY_URL = process.env.DISPLAY_URL || 'http://localhost:5001';

// ── Auth middleware ───────────────────────────────────────────────────

function authMiddleware(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try { req.user = jwt.verify(authHeader.slice(7), JWT_SECRET); } catch { /* anonim */ }
    }
    next();
}

// ── Admin middleware — csak admin felhasználók ────────────────────────

function adminMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Hitelesítés szükséges' });
    }
    try {
        const user = jwt.verify(authHeader.slice(7), JWT_SECRET);
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin jogosultság szükséges' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Érvénytelen token' });
    }
}

// ── Task 6: RPC a kijelzőnek ──────────────────────────────────────────

function notifyDisplay(question, option, voterName, questionType) {
    const params  = new URLSearchParams({ nev: voterName || 'Névtelen', szavazat: option, kerdes: question || '', tipus: questionType || 'choice' });
    const urlObj  = new URL(DISPLAY_URL);
    const req = http.get({ hostname: urlObj.hostname, port: urlObj.port || 80, path: `/update?${params}` }, () => {});
    req.on('error', () => {});
    req.setTimeout(2000, () => req.destroy());
}

// ── Health ────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', pid: process.pid, port: PORT, dbConnected: mongoose.connection.readyState === 1 });
});

// ── Auth (Task 14) ────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'username, email és password kötelező' });
    if (password.length < 6) return res.status(400).json({ error: 'A jelszónak legalább 6 karakter kell' });
    
    // Validate role — only 'user' or 'admin' allowed
    const validRoles = ['user', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'user';
    
    try {
        const user  = await User.create({ 
            username, 
            email, 
            passwordHash: await bcrypt.hash(password, 10),
            role: userRole
        });
        const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user._id, username: user.username, role: user.role } });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'Ez a felhasználónév vagy email már foglalt' });
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Felhasználónév és jelszó kötelező' });
    try {
        const user = await User.findOne({ $or: [{ username }, { email: username }] });
        if (!user || !user.isActive || !await bcrypt.compare(password, user.passwordHash)) {
            return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó' });
        }
        const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Nem vagy bejelentkezve' });
    res.json({ user: { id: req.user.userId, username: req.user.username, role: req.user.role } });
});

// ── Task 5: Szavazások listája (összes aktív) ─────────────────────────

app.get('/api/bets', async (_req, res) => {
    try {
        const bets = await Bet.find({ isActive: true }).select('-__v').sort({ createdAt: -1 });
        res.json(bets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Összes szavazás (aktív + lezárt), admin nézethez ─────────────────

app.get('/api/bets/all', async (_req, res) => {
    try {
        const bets = await Bet.find({}).select('-__v').sort({ createdAt: -1 });
        res.json(bets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Új szavazás létrehozása ───────────────────────────────────────────

app.post('/api/bets', adminMiddleware, async (req, res) => {
    const { question, options, questionType, dbType } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ error: 'A kérdés szövege kötelező' });
    if (questionType !== 'text' && (!Array.isArray(options) || options.length < 2)) {
        return res.status(400).json({ error: 'Választásos szavazásnál legalább 2 lehetőség szükséges' });
    }
    try {
        const bet = await Bet.create({
            question: question.trim(),
            options:  questionType === 'text' ? [] : options.map(o => o.trim()).filter(Boolean),
            questionType: questionType || 'choice',
            dbType:       dbType || 'mongodb',
            isActive:     true,
        });
        res.status(201).json(bet);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Szavazás lezárása ─────────────────────────────────────────────────

app.patch('/api/bet/:id/close', adminMiddleware, async (req, res) => {
    try {
        const bet = await Bet.findByIdAndUpdate(req.params.id, { isActive: false });
        if (!bet) return res.status(404).json({ error: 'Szavazás nem található' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Task 5: Egy szavazás lekérdezése szavazatszámokkal ────────────────

app.get('/api/bet/:id', async (req, res) => {
    try {
        const bet = await Bet.findById(req.params.id);
        if (!bet) return res.status(404).json({ error: 'Szavazás nem található' });

        let votes = [];
        try {
            votes = await adapter.getVotes(bet.dbType, bet._id.toString());
        } catch (err) {
            return res.status(503).json({ error: `Az adatbázis backend (${bet.dbType}) nem elérhető: ${err.message}` });
        }
        res.json({ ...bet.toObject(), votes, _debug: { pid: process.pid, port: PORT, dbType: bet.dbType } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Régiónkénti bontás ────────────────────────────────────────────────

app.get('/api/bet/:id/regional', async (req, res) => {
    try {
        const bet = await Bet.findById(req.params.id);
        if (!bet) return res.status(404).json({ error: 'Szavazás nem található' });

        const regional = await adapter.getRegionalResults(bet.dbType, bet._id.toString());
        res.json({ betId: bet._id, question: bet.question, options: bet.options, regional });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Ellenőrzés: leadott-e már szavazatot ez a személy ─────────────────

app.get('/api/bet/:id/my-vote', authMiddleware, async (req, res) => {
    try {
        const betId     = req.params.id;
        const userId    = req.user?.userId || null;
        const visitorId = userId ? null : (req.headers['x-visitor-id'] || req.ip);

        const bet = await Bet.findById(req.params.id);
        if (!bet) return res.status(404).json({ error: 'Szavazás nem található' });

        let voted = null;
        try {
            voted = await adapter.hasVoted(bet.dbType, req.params.id, userId, visitorId);
        } catch (_) { /* backend nem elérhető — feltételezzük, hogy nem szavazott */ }
        if (voted) res.json({ voted: true,  option: voted.option || '' });
        else       res.json({ voted: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Task 2 + 3: Szavazat fogadása — egy személy csak egyszer szavazhat ─

app.post('/api/vote', authMiddleware, async (req, res) => {
    const { betId, option, region, city } = req.body;
    if (!betId || !option) return res.status(400).json({ error: 'betId és option kötelező' });

    try {
        const bet = await Bet.findById(betId);
        if (!bet || !bet.isActive) return res.status(404).json({ error: 'Szavazás nem található vagy lezárult' });
        if (bet.questionType === 'choice' && !bet.options.includes(option)) {
            return res.status(400).json({ error: 'Érvénytelen lehetőség' });
        }

        const userId    = req.user?.userId || null;
        const visitorId = userId ? null : (req.headers['x-visitor-id'] || req.ip);
        const voterName = req.user?.username || 'Névtelen';

        // Task 3 + Task 4: beírás a megfelelő backendbe
        await adapter.recordVote(bet.dbType, betId, option, userId, visitorId, region, city);

        // Task 6: RPC a kijelzőnek
        notifyDisplay(bet.question, option, voterName, bet.questionType);

        res.json({ success: true, message: `Szavazat leadva: "${option}"` });
    } catch (err) {
        // Duplikált szavazat: MongoDB code 11000, MySQL ER_DUP_ENTRY
        if (err.code === 11000 || err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            return res.status(409).json({ error: 'Már leadtad a szavazatodat erre a kérdésre' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Task 12
app.get('/api/active-bet', async (_req, res) => {
    try {
        const activeBet = await adapter.getActiveBet();
        res.json(activeBet || null);
    } catch (err) {
        res.status(503).json({ error: `Backend nem elérhető: ${err.message}` });
    }
});



const PORT = process.env.PORT || 3000;

connectDatabase()
    .then(() => app.listen(PORT, () => console.log(`Szerver fut: port ${PORT} (PID: ${process.pid})`)))
    .catch(err => { console.error('DB kapcsolat sikertelen:', err.message); process.exit(1); });
