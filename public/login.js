const loginForm = document.getElementById('loginForm');
const customerTab = document.getElementById('customerTab');
const adminTab = document.getElementById('adminTab');
const registerLink = document.getElementById('registerLink');
const errorBox = document.getElementById('error');

let loginType = 'customer'; // default

// ===============================
// CUSTOMER LOGIN TAB
// ===============================
customerTab.onclick = () => {
  loginType = 'customer';
  customerTab.classList.add('active');
  adminTab.classList.remove('active');

  registerLink.innerHTML =
    'New user? <a href="customer_register.html">Register as Customer</a>';
  errorBox.textContent = "";
};

// ===============================
// ADMIN LOGIN TAB
// ===============================
adminTab.onclick = () => {
  loginType = 'admin';
  adminTab.classList.add('active');
  customerTab.classList.remove('active');

  registerLink.innerHTML = 'Admin access only';
  errorBox.textContent = "";
};

// ===============================
// FORM SUBMIT LOGIN
// ===============================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const Username = document.getElementById('username').value.trim();
  const Password = document.getElementById('password').value.trim();

  if (!Username || !Password) {
    errorBox.textContent = 'Please enter both username and password.';
    return;
  }

  // Choose correct backend route
  const endpoint =
    loginType === 'customer'
      ? 'http://localhost:5000/customer/login'
      : 'http://localhost:5000/api/admin/login';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },

      // MUST MATCH BACKEND EXACTLY
      body: JSON.stringify({
        Username: Username,
        Password: Password
      })
    });

    // Parse JSON safely
    const data = await res.json().catch(() => {
      throw new Error("Invalid server response");
    });

    if (!res.ok) {
      errorBox.textContent = data.error || 'Invalid username or password.';
      return;
    }

    // ===============================
    // SUCCESS – STORE SESSION
    // ===============================
    if (loginType === 'customer') {
      localStorage.setItem('customer', JSON.stringify(data));
      window.location.href = 'customer_dashboard.html';
    } else {
      localStorage.setItem('admin', JSON.stringify(data));
      window.location.href = 'admin_dashboard.html';
    }

  } catch (err) {
    console.error('Login failed:', err);
    errorBox.textContent = 'Server error. Please try again.';
  }
});
