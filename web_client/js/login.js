// Task 14 - Bejelentkezés felület

document.addEventListener('DOMContentLoaded', () => {
    // Already logged in — skip to home
    if (getToken()) {
        window.location.href = '/index.html';
        return;
    }

    const form      = document.getElementById('login-form');
    const alertEl   = document.getElementById('login-alert');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertEl.className = 'alert';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        submitBtn.disabled    = true;
        submitBtn.textContent = 'Bejelentkezés...';

        try {
            const data = await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
            setAuth(data.token, data.user);
            window.location.href = '/index.html';
        } catch (err) {
            alertEl.className   = 'alert alert-error show';
            alertEl.textContent = err.message;
            submitBtn.disabled    = false;
            submitBtn.textContent = 'Bejelentkezés';
        }
    });
});
