        document.addEventListener('DOMContentLoaded', () => {
            const loginForm = document.getElementById('loginForm');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const loginError = document.getElementById('loginError');

            // Temporary Admin Credentials
            const ADMIN_USERNAME = 'admin';
            const ADMIN_PASSWORD = 'admin123';

            loginForm.addEventListener('submit', (e) => {
                e.preventDefault(); // Prevent default form submission

                const username = usernameInput.value.trim();
                const password = passwordInput.value.trim();

                if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
                    // Successful login
                    localStorage.setItem('isAdminLoggedIn', 'true'); // Store login state
                    window.location.href = 'dashboard.html'; // Redirect to admin dashboard
                } else {
                    // Failed login
                    loginError.classList.remove('hidden');
                }
            });
        });