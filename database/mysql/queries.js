// Task 9: MySQL szavazat lekérdezések
// Task 3: Web RPC — szavazat beírása adatbázisba
const pool = require('./pool');

async function getVoteCounts(betId) {
    const [rows] = await pool.query(
        `SELECT option_val AS \`_id\`, COUNT(*) AS count
         FROM votes WHERE bet_id = ? GROUP BY option_val`,
        [betId]
    );
    return rows.map(r => ({ _id: r._id, count: Number(r.count) }));
}

async function getRegionalResults(betId) {
    const [rows] = await pool.query(
        `SELECT region, option_val AS option, COUNT(*) AS count
         FROM votes WHERE bet_id = ? AND region IS NOT NULL
         GROUP BY region, option_val ORDER BY region`,
        [betId]
    );
    const byRegion = {};
    for (const r of rows) {
        if (!byRegion[r.region]) byRegion[r.region] = [];
        byRegion[r.region].push({ option: r.option, count: Number(r.count) });
    }
    return Object.entries(byRegion).map(([region, votes]) => ({ region, votes }));
}

async function hasVoted(betId, voterId) {
    const [rows] = await pool.query(
        `SELECT option_val FROM votes WHERE bet_id = ? AND voter_id = ? LIMIT 1`,
        [betId, voterId]
    );
    return rows.length ? { option: rows[0].option_val } : null;
}

async function recordVote(betId, option, voterId, region, city) {
    await pool.query(
        `INSERT INTO votes (bet_id, option_val, voter_id, region, city) VALUES (?, ?, ?, ?, ?)`,
        [betId, option, voterId, region || null, city || null]
    );
}

module.exports = { getVoteCounts, getRegionalResults, hasVoted, recordVote };
