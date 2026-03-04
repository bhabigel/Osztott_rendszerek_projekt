const pollIdInput = document.getElementById('pollId');
const searchBtn = document.getElementById('searchBtn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const resultsContainer = document.getElementById('resultsContainer');
const questionTitle = document.getElementById('questionTitle');
const pollStatus = document.getElementById('pollStatus');
const totalVotes = document.getElementById('totalVotes');
const resultsBody = document.getElementById('resultsBody');

// Event Listeners

searchBtn.addEventListener('click', fetchResults);
pollIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchResults();
    }
});

//Fo fuggveny: Adatok lekerese

async function fetchResults(){
    const pollId=pollIdInput.value.trim();
    if(!pollId){
        showError("Please enter a Poll ID.");
        return;
    }
    hideResults();
    showLoading();
    clearError();
    try{
        // SZIMBOLIKUS API ENDPOINT
        const apiUrl=`/api/results?poll_id=${pollId}`;
        console.log("Lekeres :", apiUrl);
        const response = await fetch(apiUrl);
        if(!response.ok){
            throw new Error(`Error fetching results: ${response.status} ${response.statusText}`);
        }
        //JSON parse
        const data =await response.json();
        console.log("Adatok:", data);

        displayResults(data);
    }catch(error){
        console.error("Hiba:", error);
        showError(`Nem sikerult lekerdezni az eredmenyeket: ${error.message}`);

    }finally{
        hideLoading();
    }
}

// Megjelenites
function displayResults(data){
    questionTitle.textContent = data.question;
    pollStatus.textContent = `Allapot: ${data.status==='open' ? 'Nyitott' : 'Zart'}`;
    totalVotes.textContent = `Osszes szavazas: ${data.total_votes}`;
    resultsBody.innerHTML = '';

    //Sorokat feltoltjuk az eredmenyekkel
    data.results.forEach(result=>{
        const row = document.createElement('tr');

        const barWidth = result.percentage;
        const barHtml = `<div class="progress-bar" style="width: ${barWidth}%">${result.percentage.toFixed(1)}%</div>`;

        row.innerHTML = `
            <td><strong>${result.option}</strong></td>
            <td>${result.votes}</td>
            <td>${result.percentage.toFixed(1)}%</td>
            <td>${barHtml}</td>
        `;

        resultsBody.appendChild(row);
    });

    //Megjelenitjuk az eredmenyek kontenert
    resultsContainer.classList.remove('hidden');
}

//Seged fuggvenyek
function showLoading(){
    loadingDiv.classList.remove('hidden');
}

function hideLoading(){
    loadingDiv.classList.add('hidden');
}

function showError(message){
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function clearError(){
    errorDiv.textContent='';
    errorDiv.classList.add('hidden');
}

function hideResults(){
    resultsContainer.classList.add('hidden');
}

// ===== TESZTELÉSHEZ: MOCK ADATOK =====
// Ha nincs szerver, ezt az oldalt így tesztelhetjük:
/*
function mockFetch(pollId) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                ok: true,
                json: () => Promise.resolve({
                    poll_id: pollId,
                    question: "Mi a kedvenc programozási nyelveid?",
                    question_type: "multiple_choice",
                    total_votes: 42,
                    results: [
                        { option: "JavaScript", votes: 18, percentage: 42.8 },
                        { option: "Python", votes: 15, percentage: 35.7 },
                        { option: "Java", votes: 6, percentage: 14.2 },
                        { option: "C++", votes: 3, percentage: 7.1 }
                    ],
                    status: "open"
                })
            });
        }, 500);
    });
}
*/
