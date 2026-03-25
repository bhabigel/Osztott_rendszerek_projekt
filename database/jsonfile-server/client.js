/**
 * Task 10: JSON-file socket szerver kliens modulja
 * A fő szerver ezt használja a jsonfile backend eléréséhez.
 */

const net = require('net');
require('dotenv').config();

const HOST = process.env.JSONFILE_HOST || 'localhost';
const PORT = parseInt(process.env.JSONFILE_PORT) || 5002;

function sendRequest(payload) {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection(PORT, HOST);
        let buffer   = '';

        socket.setTimeout(5000);

        socket.on('connect', () => {
            socket.write(JSON.stringify(payload) + '\n');
        });

        socket.on('data', chunk => {
            buffer += chunk.toString();
            const newlineIdx = buffer.indexOf('\n');
            if (newlineIdx === -1) return;

            socket.destroy();
            try {
                const response = JSON.parse(buffer.slice(0, newlineIdx));
                if (response.error) reject(new Error(response.error));
                else resolve(response.data);
            } catch (err) {
                reject(err);
            }
        });

        socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('JSON-file szerver timeout (fut a szerver?)'));
        });

        socket.on('error', reject);
    });
}

async function getVotes(betId) {
    const data = await sendRequest({ action: 'GET_VOTES', betId });
    return data || [];
}

async function hasVoted(betId, voterId) {
    return sendRequest({ action: 'HAS_VOTED', betId, voterId });
}

async function recordVote(betId, option, voterId) {
    try {
        await sendRequest({ action: 'RECORD_VOTE', betId, option, voterId });
    } catch (err) {
        if (err.message === 'DUPLICATE_VOTE') {
            const dupErr = new Error('Már leadtad a szavazatodat');
            dupErr.code = 11000;
            throw dupErr;
        }
        throw err;
    }
}

module.exports = { getVotes, hasVoted, recordVote };
