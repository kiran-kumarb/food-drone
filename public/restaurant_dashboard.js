const restaurant = JSON.parse(localStorage.getItem("restaurant"));

if (!restaurant) {
  window.location.href = "restaurant_login.html"; // Redirect if not logged in
}

document.getElementById("welcomeMsg").textContent = `Welcome, ${restaurant.Name}! 🍽️`;

// Load menu items on page load
async function loadMenu() {
  try {
    const res = await fetch(`http://localhost:5000/restaurant/menu/${restaurant.RestaurantID}`);
    const data = await res.json();

    const menuBody = document.getElementById("menuBody");
    menuBody.innerHTML = "";

    data.forEach((item) => {
      const row = `
        <tr>
          <td>${item.ItemID}</td>
          <td>${item.Name}</td>
          <td>${item.Description}</td>
          <td>₹${item.Price}</td>
          <td>${item.WeightKg}</td>
        </tr>
      `;
      menuBody.innerHTML += row;
    });
  } catch (err) {
    console.error("Error loading menu:", err);
  }
}

// Handle Add Item
document.getElementById("addItemForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const Name = document.getElementById("itemName").value;
  const Description = document.getElementById("itemDesc").value;
  const Price = parseFloat(document.getElementById("itemPrice").value);
  const WeightKg = parseFloat(document.getElementById("itemWeight").value);

  try {
    const res = await fetch("http://localhost:5000/restaurant/add-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ RestaurantID: restaurant.RestaurantID, Name, Description, Price, WeightKg }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Item added successfully!");
      document.getElementById("addItemForm").reset();
      loadMenu(); // Refresh menu
    } else {
      alert("Error: " + data.error);
    }
  } catch (err) {
    console.error("Error adding item:", err);
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("restaurant");
  window.location.href = "restaurant_login.html";
});

// Initial load
loadMenu();
