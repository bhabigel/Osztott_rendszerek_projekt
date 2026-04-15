/**
 * Task 4: Szerver oldal több adatbázis kezelés kulcs alapján
 * A Bet.dbType mező dönti el: 'mongodb' | 'mysql' | 'jsonfile'
 */

const mongoose = require('mongoose');
const Vote     = require('./models/Vote');

let _mysql = null, _jsonfile = null;
function getMysql()    { if (!_mysql)    _mysql    = require('./mysql/queries');          return _mysql; }
function getJsonfile() { if (!_jsonfile) _jsonfile = require('./jsonfile-server/client'); return _jsonfile; }

/** Szavazatszámok: [{ _id, count }] */
async function getVotes(dbType, betId) {
    if (dbType === 'mysql')    return getMysql().getVoteCounts(betId);
    if (dbType === 'jsonfile') return getJsonfile().getVotes(betId);
    return Vote.aggregate([
        { $match: { betId: new mongoose.Types.ObjectId(betId) } },
        { $group: { _id: '$option', count: { $sum: 1 } } },
    ]);
}

/** Aktív szavazás lekérdezése szavazatokkal */
async function getActiveBet(dbType = 'jsonfile') {
    if (dbType === 'mysql')    return getMysql().getActiveBet();
    if (dbType === 'jsonfile') return getJsonfile().getActiveBet();
    
    // MongoDB
    const bet = await Bet.findOne({ isActive: true });
    if (!bet) return null;
    
    const votes = await Vote.aggregate([
        { $match: { betId: bet._id } },
        { $group: { _id: '$option', count: { $sum: 1 } } },
    ]);
    
    return { ...bet.toObject(), votes };
}

module.exports = { getVotes, getRegionalResults, hasVoted, recordVote, getActiveBet };

/** Régiónkénti bontás: [{ region, votes: [{option, count}] }] */
async function getRegionalResults(dbType, betId) {
    if (dbType === 'mysql') return getMysql().getRegionalResults(betId);
    if (dbType !== 'mongodb') return [];

    const raw = await Vote.aggregate([
        { $match: { betId: new mongoose.Types.ObjectId(betId), region: { $ne: null } } },
        { $group: { _id: { region: '$region', option: '$option' }, count: { $sum: 1 } } },
        { $sort: { '_id.region': 1 } },
    ]);

    const byRegion = {};
    for (const r of raw) {
        const { region, option } = r._id;
        if (!byRegion[region]) byRegion[region] = {};
        byRegion[region][option] = r.count;
    }
    return Object.entries(byRegion).map(([region, votes]) => ({
        region,
        votes: Object.entries(votes).map(([option, count]) => ({ option, count })),
    }));
}

/** Ellenőrzés: szavazott-e már — { option } vagy null */
async function hasVoted(dbType, betId, userId, visitorId) {
    if (dbType === 'mysql') {
        const voterId = userId ? `user:${userId}` : `anon:${visitorId}`;
        return getMysql().hasVoted(betId, voterId);
    }
    if (dbType === 'jsonfile') {
        const voterId = userId ? `user:${userId}` : `anon:${visitorId}`;
        return getJsonfile().hasVoted(betId, voterId);
    }
    const vote = await Vote.findOne(userId ? { betId, userId } : { betId, visitorId });
    return vote ? { option: vote.option } : null;
}

/**
 * Szavazat rögzítése — INSERT (nem upsert).
 * Ha a személy már szavazott, duplikált kulcs hibát dob (11000 / ER_DUP_ENTRY).
 */
async function recordVote(dbType, betId, option, userId, visitorId, region, city) {
    if (dbType === 'mysql' || dbType === 'jsonfile') {
        const voterId = userId ? `user:${userId}` : `anon:${visitorId}`;
        if (dbType === 'mysql') return getMysql().recordVote(betId, option, voterId, region, city);
        return getJsonfile().recordVote(betId, option, voterId);
    }

    // MongoDB — Vote.create() dob 11000-t ha már létezik a (betId+userId/visitorId) pár
    await Vote.create({
        betId,
        option,
        ...(userId    ? { userId }    : { visitorId }),
        ...(region    ? { region }    : {}),
        ...(city      ? { city }      : {}),
        votedAt: new Date(),
    });
}

module.exports = { getVotes, getRegionalResults, hasVoted, recordVote };
