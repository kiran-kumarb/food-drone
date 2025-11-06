const customer = JSON.parse(localStorage.getItem('customer'));
document.getElementById('custName').textContent = customer?.Name || 'Customer';

const restaurantSelect = document.getElementById('restaurantSelect');
const menuContainer = document.getElementById('menuContainer');
const placeOrderBtn = document.getElementById('placeOrderBtn');
const statusBox = document.getElementById('status');

let selectedRestaurantID = null;
let currentOrderID = null;

// Load restaurants
async function loadRestaurants() {
  const res = await fetch('/restaurant/list');
  const data = await res.json();
  restaurantSelect.innerHTML = '<option value="">Select Restaurant</option>';
  data.forEach(r => {
    restaurantSelect.innerHTML += `<option value="${r.RestaurantID}">${r.Name}</option>`;
  });
}

restaurantSelect.addEventListener('change', async (e) => {
  selectedRestaurantID = e.target.value;
  const res = await fetch(`/restaurant/menu/${selectedRestaurantID}`);
  const data = await res.json();

  menuContainer.innerHTML = '<h4>Menu Items</h4>';
  data.forEach(item => {
    menuContainer.innerHTML += `
      <div>
        <input type="checkbox" value="${item.ItemID}" data-price="${item.Price}">
        ${item.Name} - ₹${item.Price}
      </div>`;
  });
});

placeOrderBtn.addEventListener('click', async () => {
  const checked = document.querySelectorAll('input[type="checkbox"]:checked');
  if (!selectedRestaurantID || checked.length === 0) {
    return (statusBox.textContent = 'Please select restaurant and items.');
  }

  // 1️⃣ Place Order
  const orderRes = await fetch('/order/place', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CustomerID: customer.CustomerID,
      RestaurantID: selectedRestaurantID,
      LocationID: 1
    })
  });

  if (!orderRes.ok) return (statusBox.textContent = 'Error placing order.');

  // For simplicity, just fetch latest order from that customer
  const orderList = await (await fetch(`/order/latest/${customer.CustomerID}`)).json();
  currentOrderID = orderList.OrderID;
  statusBox.textContent = `Order #${currentOrderID} placed. Please proceed to payment.`;

  // 2️⃣ Add items
  for (let c of checked) {
    await fetch('/order/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ OrderID: currentOrderID, ItemID: c.value, Quantity: 1 })
    });
  }

  // 3️⃣ Show Payment Button
  const payBtn = document.createElement('button');
  payBtn.textContent = '💳 Pay Now';
  payBtn.onclick = handlePayment;
  statusBox.insertAdjacentElement('afterend', payBtn);
});

async function handlePayment() {
  if (!currentOrderID) return;
  statusBox.textContent = 'Processing payment...';

  await fetch('/order/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ OrderID: currentOrderID, Method: 'UPI' })
  });

  statusBox.textContent = '✅ Payment successful! Drone will be assigned shortly...';

  // 4️⃣ Assign Drone after payment confirmation
  await fetch('/delivery/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ OrderID: currentOrderID })
  });

  statusBox.textContent = '🚁 Drone assigned! Your food is on the way.';
}

loadRestaurants();
