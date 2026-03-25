// Task 14 - Regisztráció felület

document.addEventListener('DOMContentLoaded', () => {
    // Already logged in — skip to home
    if (getToken()) {
        window.location.href = '/index.html';
        return;
    }

    const form      = document.getElementById('register-form');
    const alertEl   = document.getElementById('register-alert');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertEl.className = 'alert';

        const username        = document.getElementById('username').value.trim();
        const email           = document.getElementById('email').value.trim();
        const password        = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            alertEl.className   = 'alert alert-error show';
            alertEl.textContent = 'A jelszavak nem egyeznek';
            return;
        }

        submitBtn.disabled    = true;
        submitBtn.textContent = 'Regisztráció...';

        try {
            const data = await apiFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password }),
            });
            setAuth(data.token, data.user);
            window.location.href = '/index.html';
        } catch (err) {
            alertEl.className   = 'alert alert-error show';
            alertEl.textContent = err.message;
            submitBtn.disabled    = false;
            submitBtn.textContent = 'Regisztráció';
        }
    });
});
