const loginForm = document.getElementById('loginForm');
const customerTab = document.getElementById('customerTab');
const restaurantTab = document.getElementById('restaurantTab');
const registerLink = document.getElementById('registerLink');
const errorBox = document.getElementById('error');

let loginType = 'customer'; // default login type

// Switch between customer and restaurant tabs
customerTab.onclick = () => {
  loginType = 'customer';
  customerTab.classList.add('active');
  restaurantTab.classList.remove('active');
  registerLink.innerHTML = 'New user? <a href="customer_register.html">Register as Customer</a>';
};

restaurantTab.onclick = () => {
  loginType = 'restaurant';
  restaurantTab.classList.add('active');
  customerTab.classList.remove('active');
  registerLink.innerHTML = 'New user? <a href="restaurant_register.html">Register as Restaurant</a>';
};

// Handle login form submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    errorBox.textContent = 'Please enter both username and password.';
    return;
  }

  const endpoint = loginType === 'customer' ? '/customer/login' : '/restaurant/login';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Username: username, Password: password })
    });

    const data = await res.json();

    if (!res.ok || !data) {
      errorBox.textContent = data.error || 'Invalid username or password.';
      return;
    }

    if (loginType === 'customer') {
      localStorage.setItem('customer', JSON.stringify(data));
      window.location.href = 'customer_dashboard.html';
    } else {
      localStorage.setItem('restaurant', JSON.stringify(data));
      window.location.href = 'restaurant_dashboard.html';
    }
  } catch (err) {
    console.error('Login failed:', err);
    errorBox.textContent = 'Server error. Please try again.';
  }
});
