// Task:12. query_results.js

// Function to fetch active bet from the JSON file socket server.
function fetchActiveBet() {
    fetch('http://localhost:3000/activeBet') // Change to your socket server URL
        .then(response => response.json())
        .then(data => {
            displayResults(data);
        })
        .catch(error => console.error('Error fetching active bet:', error));
}

// Function to display the fetched results
function displayResults(data) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = ''; // Clear previous results
    // Assuming data contains required fields. Adjust according to your data structure.
    const resultsHtml = `<p>Active Bet: ${data.bet}</p><p>Odds: ${data.odds}</p>`;
    resultsContainer.innerHTML = resultsHtml;
}

// Refresh results every 5 seconds
setInterval(fetchActiveBet, 5000);

// Initial fetch on page load
fetchActiveBet();