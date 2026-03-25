// Anonim látogató azonosítója — böngészőben generált UUID, localStorage-ban tárolva
function getVisitorId() {
    let id = localStorage.getItem('visitorId');
    if (!id) {
        id = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
        localStorage.setItem('visitorId', id);
    }
    return id;
}

// Shared API fetch wrapper — adds Authorization + X-Visitor-Id headers automatically
async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    headers['X-Visitor-Id'] = getVisitorId();

    const res = await fetch(path, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
        throw Object.assign(new Error(data.error || 'Ismeretlen hiba történt'), { status: res.status });
    }
    return data;
}
