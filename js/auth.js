// API Base URL - Update this with your backend URL
const API_URL = 'http://localhost:5000/api';

// Show Alert Function
function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Login Form Handler
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Store token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect based on role
            switch(role) {
                case 'student':
                    window.location.href = 'student-dashboard.html';
                    break;
                case 'incharge':
                    window.location.href = 'bus-incharge.html';
                    break;
                case 'admin':
                    window.location.href = 'admin-dashboard.html';
                    break;
            }
        } else {
            showAlert(data.error || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Connection error. Please check your internet connection.');
    }
});

// Check if user is already logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user) {
        // Redirect to appropriate dashboard
        const currentPage = window.location.pathname.split('/').pop();
        
        if (currentPage === 'index.html' || currentPage === '') {
            switch(user.role) {
                case 'student':
                    window.location.href = 'student-dashboard.html';
                    break;
                case 'incharge':
                    window.location.href = 'bus-incharge.html';
                    break;
                case 'admin':
                    window.location.href = 'admin-dashboard.html';
                    break;
            }
        }
    }
}

// Logout Function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Attach logout to button
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});

// Check auth on page load
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    checkAuth();
}

// Protect dashboard pages
function protectPage(requiredRole) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) {
        window.location.href = 'index.html';
        return false;
    }
    
    if (requiredRole && user.role !== requiredRole) {
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// API Request Helper with Auth
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, mergedOptions);
        const data = await response.json();
        
        // Check for unauthorized
        if (response.status === 401) {
            logout();
            return null;
        }
        
        return { ok: response.ok, data, status: response.status };
    } catch (error) {
        console.error('API Request Error:', error);
        return { ok: false, error: error.message };
    }
}
