/*
FRONTEND IMPLEMENTATION NOTES:
==============================

1. API BASE URL:
   - Use relative paths (e.g., '/api/bet') NOT absolute URLs
   - Nginx handles routing to the correct backend instance
   - This makes the frontend portable across environments

2. FOR PRODUCTION:
   - Add error handling and loading states
   - Implement vote submission (POST /api/vote)
   - Add WebSocket connection for real-time updates
   - Consider state management (Redux, Vuex, etc.)

3. LOAD BALANCING TRANSPARENCY:
   - Notice the _debug.port field changes when ip_hash is disabled
   - With ip_hash enabled, same port every time (sticky session)
   - Frontend code doesn't need to change either way
*/

const output = document.getElementById('output');

// Helper to display response
function display(data) {
    output.textContent = JSON.stringify(data, null, 2);
}

// Fetch current bet
document.getElementById('fetchBet').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/bet');
        const data = await response.json();
        display(data);
    } catch (error) {
        display({ error: error.message });
    }
});

// Check health endpoint
document.getElementById('checkHealth').addEventListener('click', async () => {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        display(data);
    } catch (error) {
        display({ error: error.message });
    }
});

// Fetch multiple times to demonstrate load balancing
document.getElementById('fetchMultiple').addEventListener('click', async () => {
    try {
        const results = [];
        for (let i = 0; i < 5; i++) {
            const response = await fetch('/health');
            const data = await response.json();
            results.push(`Request ${i + 1}: port ${data.port}, pid ${data.pid}`);
        }
        display({
            note: "With ip_hash: same port each time. Without: rotating ports.",
            results: results
        });
    } catch (error) {
        display({ error: error.message });
    }
});

// Vote handlers
async function vote(option) {
    try {
        const response = await fetch('/api/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ option })
        });
        const data = await response.json();
        display(data);
    } catch (error) {
        display({ error: error.message });
    }
}

document.getElementById('voteYes').addEventListener('click', () => vote('Yes'));
document.getElementById('voteNo').addEventListener('click', () => vote('No'));
