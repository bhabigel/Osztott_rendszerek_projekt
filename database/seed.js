/**
 * Seed script — teszt adatokat szúr be a MongoDB-be.
 * Futtatás: npm run seed
 *
 * FIGYELEM: A regionális választási adatok KITALÁLT, demo célú adatok,
 * nem tükröznek valós politikai eredményeket.
 */

require('dotenv').config();
const path     = require('path');
const fs       = require('fs');
const mongoose = require('mongoose');
const connectDatabase = require('./connection');
const Bet  = require('./models/Bet');
const Vote = require('./models/Vote');

// ── Determinisztikus pszeudo-véletlenszám generátor ───────────────────
// Így minden seed futásnál ugyanazokat az adatokat kapjuk
function createRng(seed) {
    let s = seed >>> 0;
    return () => {
        s = Math.imul(1664525, s) + 1013904223 | 0;
        return (s >>> 0) / 4294967296;
    };
}

// ── Szavazások definíciói ─────────────────────────────────────────────

const BETS = [
    {
        question:     'Ha holnap lennének a parlamenti választások, melyik pártra szavaznál?',
        options:      ['Fidesz-KDNP', 'Tisza Párt', 'Mi Hazánk', 'Demokratikus Koalíció', 'MSZP-Párbeszéd'],
        dbType:       'mongodb',
        questionType: 'choice',
        isActive:     true,
    },
    {
        question:     'Esni fog holnap Londonban?',
        options:      ['Igen', 'Nem'],
        dbType:       'mongodb',
        questionType: 'choice',
        isActive:     true,
    },
    {
        question:     'Mi a véleményed a projektről?',
        options:      [],
        dbType:       'jsonfile',
        questionType: 'text',
        isActive:     true,
    },
];

// ── Régiónkénti eloszlás (KITALÁLT demo adatok) ───────────────────────
// Formátum: [Fidesz-KDNP%, Tisza%, MiHazánk%, DK%, MSZP%]
const REGIONS = {
    'Budapest':                 [22, 42, 12, 16,  8],
    'Pest':                     [38, 36, 13,  8,  5],
    'Fejér':                    [44, 33, 13,  6,  4],
    'Komárom-Esztergom':        [42, 34, 14,  6,  4],
    'Veszprém':                 [46, 32, 13,  5,  4],
    'Győr-Moson-Sopron':        [45, 34, 12,  5,  4],
    'Vas':                      [43, 34, 13,  5,  5],
    'Zala':                     [46, 30, 14,  5,  5],
    'Somogy':                   [48, 29, 14,  5,  4],
    'Tolna':                    [47, 30, 14,  5,  4],
    'Baranya':                  [42, 34, 13,  7,  4],
    'Bács-Kiskun':              [46, 31, 14,  5,  4],
    'Békés':                    [49, 27, 14,  5,  5],
    'Csongrád-Csanád':          [40, 36, 13,  7,  4],
    'Heves':                    [47, 29, 14,  5,  5],
    'Nógrád':                   [47, 28, 16,  5,  4],
    'Borsod-Abaúj-Zemplén':     [50, 26, 15,  5,  4],
    'Szabolcs-Szatmár-Bereg':   [52, 24, 14,  5,  5],
    'Hajdú-Bihar':              [47, 30, 13,  5,  5],
    'Jász-Nagykun-Szolnok':     [48, 29, 13,  5,  5],
};

// ── Seed logika ───────────────────────────────────────────────────────

async function seedBets() {
    const saved = [];
    for (const def of BETS) {
        const existing = await Bet.findOne({ question: def.question });
        if (existing) {
            console.log(`[SKIP] Már létezik: "${existing.question}"`);
            saved.push(existing);
        } else {
            const bet = await Bet.create(def);
            console.log(`[OK]   Létrehozva (${bet.dbType}): "${bet.question}"`);
            saved.push(bet);
        }
    }
    return saved;
}

async function seedHungarianVotes(bet) {
    const parties = bet.options; // ['Fidesz-KDNP', 'Tisza Párt', ...]
    const rng     = createRng(42); // fix seed → reprodukálható eredmény
    let total     = 0;

    for (const [region, weights] of Object.entries(REGIONS)) {
        const votesInRegion = 70 + Math.floor(rng() * 40); // 70-110 szavazat / régió

        for (let i = 0; i < votesInRegion; i++) {
            // Súlyozott véletlenszerű pártválasztás
            const roll = rng() * 100;
            let cum = 0, chosen = parties[parties.length - 1];
            for (let p = 0; p < parties.length; p++) {
                cum += weights[p];
                if (roll < cum) { chosen = parties[p]; break; }
            }

            const visitorId = `seed_${region}_${i}`;

            // Ha már létezik, hagyjuk (seed futtatható többször)
            const exists = await Vote.findOne({ betId: bet._id, visitorId });
            if (!exists) {
                await Vote.create({ betId: bet._id, option: chosen, visitorId, region, votedAt: new Date() });
                total++;
            }
        }
    }
    console.log(`[OK]   Magyar választás: ${total} szavazat beillesztve (${Object.keys(REGIONS).length} régió)`);
}

async function seedJsonfileBets(bets) {
    const dataDir  = path.join(__dirname, 'jsonfile-server', 'data');
    const betsFile = path.join(dataDir, 'bets.json');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const existing = fs.existsSync(betsFile) ? JSON.parse(fs.readFileSync(betsFile, 'utf8')) : [];
    let added = 0;
    for (const bet of bets) {
        if (!existing.find(b => b.id === bet.id)) {
            existing.push({ id: bet.id, question: bet.question, options: bet.options, isActive: bet.isActive });
            added++;
        }
    }
    fs.writeFileSync(betsFile, JSON.stringify(existing, null, 2));
    if (added > 0) console.log(`[OK]   JSON-file bets.json: ${added} új szavazás`);
}

async function seed() {
    await connectDatabase();

    const bets = await seedBets();

    // Magyar választási szavazatok régiónkénti feltöltése
    const hunBet = bets.find(b => b.question.includes('parlamenti'));
    if (hunBet && hunBet.dbType === 'mongodb') {
        const count = await Vote.countDocuments({ betId: hunBet._id });
        if (count === 0) {
            await seedHungarianVotes(hunBet);
        } else {
            console.log(`[SKIP] Magyar választás: már van ${count} szavazat`);
        }
    }

    // JSON-file szerver bets.json szinkronizálása
    const jsonfileBets = bets
        .filter(b => b.dbType === 'jsonfile')
        .map(b => ({ id: b._id.toString(), question: b.question, options: b.options, isActive: b.isActive }));
    if (jsonfileBets.length > 0) await seedJsonfileBets(jsonfileBets);

    console.log('\nAktív szavazások:');
    bets.filter(b => b.isActive).forEach(b => console.log(`  [${b.dbType}] ${b._id} — ${b.question}`));

    await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed sikertelen:', err.message); process.exit(1); });
