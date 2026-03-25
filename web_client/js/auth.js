// Auth state helpers
function getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
}

function getToken() {
    return localStorage.getItem('token');
}

function setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Update nav to reflect login state — call this on every page
function updateNav() {
    const user = getUser();
    const navLogin    = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navUser     = document.getElementById('nav-user');
    const navUsername = document.getElementById('nav-username');
    const navLogout   = document.getElementById('nav-logout');

    if (user) {
        if (navLogin)    navLogin.style.display    = 'none';
        if (navRegister) navRegister.style.display = 'none';
        if (navUser)     navUser.style.display     = 'flex';
        if (navUsername) navUsername.textContent   = user.username;
    } else {
        if (navLogin)    navLogin.style.display    = '';
        if (navRegister) navRegister.style.display = '';
        if (navUser)     navUser.style.display     = 'none';
    }

    if (navLogout) {
        navLogout.addEventListener('click', () => {
            clearAuth();
            window.location.href = '/index.html';
        });
    }
}

document.addEventListener('DOMContentLoaded', updateNav);
