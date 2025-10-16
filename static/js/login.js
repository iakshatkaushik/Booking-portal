document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        try {
            const response = await fetch('http://127.0.0.1:5000/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.status === 200) {
                const data = await response.json();

                // ✅ Store login info
                localStorage.setItem('isAdminLoggedIn', 'true');
                localStorage.setItem('adminToken', data.token);
                localStorage.setItem('adminUsername', data.user.username);

                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else if (response.status === 401) {
                loginError.classList.remove('hidden'); // Show login error
            } else {
                console.error('Unexpected response:', response);
                loginError.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Error during login:', err);
            loginError.classList.remove('hidden');
        }
    });
});
