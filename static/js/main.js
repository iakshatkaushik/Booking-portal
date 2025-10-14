document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginError = document.getElementById("loginError");

    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        // Demo hardcoded admin credentials
        const ADMIN_USERNAME = "admin";
        const ADMIN_PASSWORD = "password123";

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            try {
                localStorage.setItem('isAdminLoggedIn', 'true');
            } catch (err) {
                console.warn('Could not access localStorage to set login state:', err);
            }
            window.location.href = "dashboard.html";
        } else {
            loginError.classList.remove("hidden");
        }
    });
});
