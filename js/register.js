// API Base URL
const API_URL = 'http://localhost:5000/api';

// Load bus routes on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadBusRoutes();
});

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
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Load Bus Routes
async function loadBusRoutes() {
    try {
        const response = await fetch(`${API_URL}/buses`);
        const data = await response.json();
        
        if (response.ok) {
            const busSelect = document.getElementById('busRoute');
            busSelect.innerHTML = '<option value="">Choose Route</option>';
            
            data.buses.forEach(bus => {
                const option = document.createElement('option');
                option.value = bus.id;
                option.textContent = `${bus.bus_number} - ${bus.route}`;
                busSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading bus routes:', error);
    }
}

// Registration Form Handler
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const studentId = document.getElementById('studentId').value;
    const busRoute = document.getElementById('busRoute').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showAlert('Passwords do not match!');
        return;
    }
    
    // Validate password strength
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: fullName,
                email,
                phone,
                student_id: studentId,
                bus_id: busRoute,
                password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Registration successful! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showAlert(data.error || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('Connection error. Please check your internet connection.');
    }
});