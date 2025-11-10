// =========================
// CUSTOMER DASHBOARD JS (multi-restaurant cart that persists across switches)
// =========================

const customer = JSON.parse(localStorage.getItem('customer'));
document.getElementById('custName').textContent = customer?.Name || 'Customer';

const restaurantList = document.getElementById('restaurantList');
const menuContainer = document.getElementById('menuContainer');
const placeOrderBtn = document.getElementById('placeOrderBtn');
const statusBox = document.getElementById('status');
const cartItemsDiv = document.getElementById('cartItems');
const totalPriceEl = document.getElementById('totalPrice');

let restaurants = [];
// cart shape: { [restaurantID]: [{ id: "ItemID", name, price: number, restaurantName }] }
let cart = {};
let activeRestaurantID = null;   // which menu is currently visible
let menuCache = {};              // cache menus per restaurantID

// =========================
// LOAD RESTAURANTS
// =========================
async function loadRestaurants() {
  const res = await fetch('/restaurant/list');
  restaurants = await res.json();

  restaurantList.innerHTML = '';
  menuContainer.innerHTML = `
    <h4>📋 Menu Items</h4>
    <p>Select a restaurant to view available dishes.</p>
  `;

  if (!restaurants.length) {
    restaurantList.innerHTML = '<p style="color:#777;">No restaurants found.</p>';
    return;
  }

  restaurants.forEach(r => {
    const card = document.createElement('div');
    card.className = 'restaurant-card';
    card.innerHTML = `
      <img src="${r.ImageURL || `https://source.unsplash.com/400x300/?restaurant,${encodeURIComponent(r.Name)}`}" alt="${r.Name}">
      <div class="restaurant-info">
        <h4>${r.Name}</h4>
        <p>⭐ ${r.Rating || '4.5'} • ${r.Cuisine || 'Multi-cuisine'} • ${r.EstimatedTime || '30 mins'}</p>
        <span class="badge ${r.IsOpen ? 'open' : 'closed'}">${r.IsOpen ? 'Open Now' : 'Closed'}</span>
      </div>
    `;
    card.addEventListener('click', () => handleRestaurantClick(r));
    restaurantList.appendChild(card);
  });
}

// =========================
// HANDLE RESTAURANT CLICK
// =========================
async function handleRestaurantClick(restaurant) {
  // Toggle: clicking the same restaurant collapses the menu
  if (activeRestaurantID === restaurant.RestaurantID) {
    menuContainer.innerHTML = `
      <h4>📋 Menu Items</h4>
      <p>Select a restaurant to view available dishes.</p>
    `;
    activeRestaurantID = null;
    return;
  }

  activeRestaurantID = restaurant.RestaurantID;

  if (menuCache[restaurant.RestaurantID]) {
    renderMenu(restaurant, menuCache[restaurant.RestaurantID]);
  } else {
    await loadMenu(restaurant);
  }
}

// =========================
async function loadMenu(restaurant) {
  menuContainer.innerHTML = `<p style="color:#777;">Loading ${restaurant.Name} menu...</p>`;

  const res = await fetch(`/restaurant/menu/${restaurant.RestaurantID}`);
  const data = await res.json();

  if (!data.length) {
    menuContainer.innerHTML = `<p style="color:#777;">No menu available for ${restaurant.Name}</p>`;
    return;
  }

  menuCache[restaurant.RestaurantID] = data;
  renderMenu(restaurant, data);
}

// =========================
// RENDER MENU (keeps checkboxes in sync with in-memory cart)
// =========================
function renderMenu(restaurant, data) {
  menuContainer.innerHTML = `
    <h4>📋 ${restaurant.Name} — Menu</h4>
    <p style="color:#777; font-size:14px;">Select dishes to add them to your cart.</p>
  `;

  data.forEach(item => {
    const div = document.createElement('div');
    div.className = 'menu-item';
    const id = `item-${restaurant.RestaurantID}-${item.ItemID}`;
    const price = parseFloat(item.Price);

    div.innerHTML = `
      <input type="checkbox" id="${id}"
             data-restaurant-id="${restaurant.RestaurantID}"
             data-restaurant-name="${restaurant.Name}"
             data-price="${price}"
             data-name="${item.Name}"
             value="${item.ItemID}">
      <label for="${id}">${item.Name} - ₹${price}</label>
    `;

    const checkbox = div.querySelector('input');

    // Restore checked state from cart (not from DOM)
    if (
      cart[restaurant.RestaurantID] &&
      cart[restaurant.RestaurantID].some(i => String(i.id) === String(item.ItemID))
    ) {
      checkbox.checked = true;
    }

    // On change, update in-memory cart directly (do NOT rebuild from DOM)
    checkbox.addEventListener('change', (e) => toggleCartForCheckbox(e.target));
    menuContainer.appendChild(div);
  });
}

// =========================
// CART MUTATORS (no DOM scanning)
// =========================
function toggleCartForCheckbox(cb) {
  const restID = String(cb.dataset.restaurantId);
  const restName = cb.dataset.restaurantName;
  const price = parseFloat(cb.dataset.price);
  const name = cb.dataset.name;
  const itemId = String(cb.value);

  if (!cart[restID]) cart[restID] = [];

  if (cb.checked) {
    // add if not already present
    if (!cart[restID].some(i => i.id === itemId)) {
      cart[restID].push({ id: itemId, name, price, restaurantName: restName });
    }
  } else {
    // remove if present
    cart[restID] = cart[restID].filter(i => i.id !== itemId);
    if (cart[restID].length === 0) delete cart[restID];
  }

  renderCart();
}

function clearCartAndUISelections() {
  // clear in-memory cart
  cart = {};
  // uncheck any menu currently on screen
  menuContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  renderCart();
}

// =========================
// RENDER CART
// =========================
function renderCart() {
  let total = 0;
  if (Object.keys(cart).length === 0) {
    cartItemsDiv.innerHTML = 'No items selected.';
    totalPriceEl.textContent = 'Total: ₹0';
    return;
  }

  let html = '';
  for (const [restID, items] of Object.entries(cart)) {
    if (!items.length) continue;
    html += `<div style="margin-bottom:10px;"><strong>${items[0].restaurantName}</strong><ul>`;
    items.forEach(i => {
      html += `<li>${i.name} - ₹${i.price}</li>`;
      total += Number(i.price) || 0;
    });
    html += '</ul></div>';
  }

  cartItemsDiv.innerHTML = html || 'No items selected.';
  totalPriceEl.textContent = `Total: ₹${total}`;
}

// =========================
// PLACE ORDER (one order per restaurant)
// =========================
placeOrderBtn.addEventListener('click', async () => {
  if (Object.keys(cart).length === 0) {
    statusBox.textContent = 'Please select at least one item.';
    return;
  }

  statusBox.textContent = '🛍️ Placing your order...';
  
  // Place order
  const orderRes = await fetch('/order/place', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CustomerID: customer.CustomerID,
      RestaurantID: activeRestaurantID,
      LocationID: 1
    })
  });

  if (!orderRes.ok) {
    statusBox.textContent = '❌ Error placing order.';
    return;
  }

  // Fetch latest order
  const orderList = await (await fetch(`/order/latest/${customer.CustomerID}`)).json();
  const orderID = orderList?.OrderID;

  if (!orderID) {
    statusBox.textContent = '⚠️ Order placed, but could not retrieve Order ID.';
    return;
  }

  // ✅ Show order ID clearly
// ✅ Only show success if orderID is valid
if (orderID) {
  statusBox.textContent = `✅ Order #${orderID} placed successfully! Please proceed to payment.`;
} else {
  statusBox.textContent = `⚠️ Order placement uncertain — please try again.`;
}

  // Create or reuse pay button
  let payBtn = document.getElementById('payNowBtnDynamic');
  if (!payBtn) {
    payBtn = document.createElement('button');
    payBtn.id = 'payNowBtnDynamic';
    payBtn.className = 'btn-primary';
    payBtn.style.background = '#1a73e8';
    payBtn.style.marginTop = '10px';
    payBtn.textContent = '💳 Pay Now';
    statusBox.insertAdjacentElement('afterend', payBtn);
  }

  // Enable pay button when new order is placed
  payBtn.disabled = false;
  payBtn.style.opacity = '1';
  payBtn.style.cursor = 'pointer';

  // Pay logic
  payBtn.onclick = async () => {
    payBtn.disabled = true; // prevent spam clicks
    payBtn.style.opacity = '0.5';
    payBtn.style.cursor = 'not-allowed';
    statusBox.textContent = `💳 Processing payment for Order #${orderID}...`;

    // Step 1 — Payment
    await fetch('/order/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ OrderID: orderID, Method: 'UPI' })
    });

    // Step 2 — Assign Drone
    await fetch('/delivery/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ OrderID: orderID })
    });

    // Step 3 — Update UI
    statusBox.textContent = `✅ Payment successful! Drone assigned for Order #${orderID}.`;

    // Disable Pay button after success
    payBtn.disabled = true;
    payBtn.style.opacity = '0.5';
    payBtn.style.cursor = 'not-allowed';
  };
});





// =========================
// ORDER HISTORY MODAL (unchanged logic)
// =========================
const modal = document.getElementById('orderHistoryModal');
const viewBtn = document.getElementById('viewOrdersBtn');
const closeBtn = document.getElementById('closeModal');
const historyContainer = document.getElementById('orderHistoryContent');

viewBtn.addEventListener('click', async () => {
  modal.style.display = 'flex';
  await loadOrderHistory();
});

closeBtn.onclick = () => (modal.style.display = 'none');
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

async function loadOrderHistory() {
  historyContainer.innerHTML = '<p style="color:#777;">Loading your orders...</p>';

  try {
    const res = await fetch(`/order/history/${customer.CustomerID}`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();

    if (!data.length) {
      historyContainer.innerHTML = '<p style="color:#777;">No past orders yet.</p>';
      return;
    }

    historyContainer.innerHTML = data.map(o => `
      <div class="order-card">
        <h4>Order #${o.OrderID} — ${o.RestaurantName}</h4>
        <p><strong>Status:</strong> ${o.Status}</p>
        <p><strong>Items:</strong> ${o.Items || '—'}</p>
        <p><strong>Total:</strong> ₹${o.TotalAmount}</p>
        <p><strong>Date:</strong> ${new Date(o.OrderDate).toLocaleString()}</p>
      </div>
    `).join('');
  } catch (err) {
    historyContainer.innerHTML = '<p style="color:red;">⚠️ Error loading order history.</p>';
  }
}// =========================
// 🚁 ORDER TRACKING + NOTIFICATIONS (Improved)
// =========================

const notificationBox = document.getElementById('notificationBox');
const trackBtn = document.getElementById('trackOrderBtn');
// const placeOrderBtn = document.getElementById('placeOrderBtn');
let trackInterval = null;

trackBtn.addEventListener('click', async () => {
  // Ask user for order ID
  const orderID = prompt("Enter your Order ID to track:");
  if (!orderID || isNaN(orderID)) {
    alert("Please enter a valid numeric Order ID.");
    return;
  }

  // Clear any existing interval
  if (trackInterval) clearInterval(trackInterval);

  notificationBox.innerHTML = `<p>Tracking order #${orderID}...</p>`;
  document.getElementById('status').textContent = "Fetching order updates...";

  try {
    // Start immediate update
    await updateOrderStatus(orderID);
    await loadNotifications(orderID);

    // Keep checking every 10 seconds
    trackInterval = setInterval(async () => {
      await updateOrderStatus(orderID);
      await loadNotifications(orderID);
    }, 10000);
  }catch (err) {
  console.error('Tracking error:', err);
  document.getElementById('status').textContent = "⚠️ Unable to track this order.";
  notificationBox.innerHTML = `<p style="color:red;">⚠️ Could not load notifications.</p>`;

  // ✅ Re-enable the Place Order button so user can place new orders
  const placeOrderBtn = document.getElementById('placeOrderBtn');
  if (placeOrderBtn) {
    placeOrderBtn.disabled = false;
    placeOrderBtn.style.opacity = "1";
    placeOrderBtn.style.cursor = "pointer";
  }
}

});

async function updateOrderStatus(orderID) {
  try {
    const res = await fetch(`/order/status/${orderID}`);
    if (!res.ok) throw new Error('Invalid order');
    const data = await res.json();

    if (!data?.Status) {
      document.getElementById('status').textContent = `⚠️ No status found for order #${orderID}`;
      return;
    }

    const statusText = {
      'Placed': '🛍️ Order placed successfully!',
      'Paid': '💳 Payment confirmed.',
      'InTransit': '🚁 Drone is on the way!',
      'Delivered': '✅ Order delivered successfully!'
    }[data.Status] || `📦 Current status: ${data.Status}`;

    // Update status visually
    document.getElementById('status').innerHTML = statusText;

    // If delivered, disable Place Order button (until new cart)
    if (data.Status === 'Delivered') {
      placeOrderBtn.disabled = true;
      placeOrderBtn.style.opacity = '0.6';
      placeOrderBtn.style.cursor = 'not-allowed';
    }
  } catch (err) {
    console.error('Status fetch failed:', err);
    document.getElementById('status').textContent = '⚠️ Could not fetch order status.';
  }
}

async function loadNotifications(orderID) {
  try {
    // ✅ Fetch only notifications for this order + customer
    const res = await fetch(`/notification/order/${orderID}/${customer.CustomerID}`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    const data = await res.json();

    // ✅ Filter again client-side just in case
    const filtered = data.filter(n => n.CustomerID === customer.CustomerID);

    if (!filtered.length) {
      notificationBox.innerHTML = `<p style="color:#777;">No updates yet for order #${orderID}.</p>`;
      return;
    }

    notificationBox.innerHTML = filtered
      .slice(0, 5)
      .map(n => `
        <div style="border-bottom:1px solid #eee; padding:4px 0;">
          <p style="margin:0;">${n.Message}</p>
          <small style="color:#777;">${new Date(n.CreatedAt).toLocaleString()}</small>
        </div>
      `)
      .join('');
  } catch (err) {
    console.error('Notification fetch failed:', err);
    notificationBox.innerHTML = '<p style="color:red;">⚠️ Could not load notifications.</p>';
    document.getElementById('status').textContent = '⚠️ Unable to retrieve tracking info. Please check your Order ID.';
  }
}


// =========================
// INIT
// =========================
loadRestaurants();