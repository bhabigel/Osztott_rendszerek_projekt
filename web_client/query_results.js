// Task:12. query_results.js

// Function to fetch active bet from the JSON file socket server.
function fetchActiveBet() {
    fetch('http://localhost:3000/active-bet') 
        .then(response => response.json())
        .then(data => {
            displayResults(data);
        })
        .catch(error => console.error('Error fetching active bet:', error));
}

// Function to display the fetched results
function displayResults(data) {
    const tbody = document.getElementById('results-body');
    tbody.innerHTML = '';

    if (!data) {
        tbody.innerHTML = '<tr><td colspan="5">No active bet</td></tr>';
        return;
    }

    const votesMap = {};
    (data.votes || []).forEach(v => {
        votesMap[v._id] = v.count;
    });

    (data.options || []).forEach(option => {
        const count = votesMap[option] || 0;

        const row = `<tr>
            <td>${data.id}</td>
            <td>${option}</td>
            <td>${count}</td>
            <td>-</td>
            <td>${data.isActive ? 'Active' : 'Closed'}</td>
        </tr>`;

        tbody.innerHTML += row;
    });
}
// Refresh results every 5 seconds
setInterval(fetchActiveBet, 5000);

// Initial fetch on page load
fetchActiveBet();