// routes/admin.js
const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  // Helper to run queries with promise interface
  const q = (...args) => db.promise().query(...args);

  // ---------------------------
  // Admin login (calls stored proc AdminLogin)
  // ---------------------------
  router.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const [rows] = await q("CALL AdminLogin(?, ?)", [username, password]);
      // MySQL returns nested arrays for CALL, first element is resultset
      const result = rows[0];
      if (!result) return res.status(401).json({ error: "Invalid credentials" });
      res.json(result);
    } catch (err) {
      console.error("Admin login error:", err.message);
      res.status(401).json({ error: err.message });
    }
  });

  // ---------------------------
  // Restaurants
  // ---------------------------
  router.post("/restaurants/add", async (req, res) => {
    try {
      const { name, location, contact } = req.body;
      await q("CALL RegisterRestaurant(?, ?, ?)", [name, location, contact]);
      res.json({ message: "Restaurant added" });
    } catch (err) {
      console.error("Add restaurant:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  router.get("/restaurants", async (req, res) => {
    try {
      const [rows] = await q("SELECT * FROM Restaurant ORDER BY RestaurantID DESC");
      res.json(rows);
    } catch (err) {
      console.error("Get restaurants:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete("/restaurants/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await q("DELETE FROM Restaurant WHERE RestaurantID = ?", [id]);
      res.json({ message: "Restaurant deleted" });
    } catch (err) {
      console.error("Delete restaurant:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------
  // Menu items
  // ---------------------------
  router.post("/menu/add", async (req, res) => {
    try {
      const { restaurantID, name, description, price, weightKg } = req.body;
      await q("CALL AddMenuItem(?, ?, ?, ?, ?)", [
        restaurantID,
        name,
        description,
        price,
        weightKg,
      ]);
      res.json({ message: "Menu item added" });
    } catch (err) {
      console.error("Add menu item:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  router.get("/menu", async (req, res) => {
  try {
    const [rows] = await q(`
      SELECT 
        m.ItemID, 
        m.Name AS ItemName, 
        m.Description, 
        m.Price, 
        m.WeightKg,
        m.Status,
        r.RestaurantID, 
        r.Name AS RestaurantName
      FROM MenuItem m
      LEFT JOIN Restaurant r ON m.RestaurantID = r.RestaurantID
      ORDER BY m.ItemID DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Get menu:", err.message);
    res.status(500).json({ error: err.message });
  }
});

  router.put("/menu/update", async (req, res) => {
    try {
      const { itemID, newPrice, newDescription } = req.body;
      await q("CALL UpdateMenuItem(?, ?, ?)", [itemID, newPrice, newDescription]);
      res.json({ message: "Menu item updated" });
    } catch (err) {
      console.error("Update menu item:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  router.delete("/menu/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await q("CALL DeleteMenuItemSoft(?)", [id]);
    res.json({ message: "Menu item marked as Removed" });
  } catch (err) {
    console.error("Delete menu item:", err.message);
    res.status(500).json({ error: err.message });
  }
});


  // ---------------------------
  // Drones
  // ---------------------------
  router.get("/drones", async (req, res) => {
    try {
      const [rows] = await q("SELECT * FROM Drone ORDER BY DroneID DESC");
      res.json(rows);
    } catch (err) {
      console.error("Get drones:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/drones/add", async (req, res) => {
    try {
      const { model, capacity, maxHeight, rangeKm, status } = req.body;
      await q(
        "INSERT INTO Drone (Model, Capacity, MaxHeight, RangeKm, Status) VALUES (?, ?, ?, ?, ?)",
        [model, capacity, maxHeight, rangeKm, status || "Available"]
      );
      res.json({ message: "Drone added" });
    } catch (err) {
      console.error("Add drone:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  router.put("/drones/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const { model, capacity, maxHeight, rangeKm, status } = req.body;
      await q(
        "UPDATE Drone SET Model = ?, Capacity = ?, MaxHeight = ?, RangeKm = ?, Status = ? WHERE DroneID = ?",
        [model, capacity, maxHeight, rangeKm, status, id]
      );
      res.json({ message: "Drone updated" });
    } catch (err) {
      console.error("Update drone:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // ---------------------------
  // Orders / Admin view
  // ---------------------------
  router.get("/orders", async (req, res) => {
    try {
      const [rows] = await q(
        `SELECT o.OrderID, o.OrderDate, o.TotalAmount, o.TotalWeightKg, o.Status,
                c.CustomerID, c.Name AS CustomerName, r.RestaurantID, r.Name AS RestaurantName,
                dl.BuildingName, dl.FloorNumber
         FROM OrderTable o
         LEFT JOIN Customer c ON o.CustomerID = c.CustomerID
         LEFT JOIN Restaurant r ON o.RestaurantID = r.RestaurantID
         LEFT JOIN DeliveryLocation dl ON o.LocationID = dl.LocationID
         ORDER BY o.OrderDate DESC`
      );
      res.json(rows);
    } catch (err) {
      console.error("Get orders:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  router.put("/orders/complete/:orderID", async (req, res) => {
    try {
      const orderID = req.params.orderID;
      await q("CALL CompleteDelivery(?)", [orderID]);
      res.json({ message: "Order delivery marked complete" });
    } catch (err) {
      console.error("Complete delivery:", err.message);
      res.status(400).json({ error: err.message });
    }
  });
// SOFT DELETE drone (mark as Retired)
router.delete("/drones/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await q("CALL DeleteDrone(?)", [id]);
    res.json({ message: "Drone marked as Retired" });
  } catch (err) {
    console.error("Delete drone:", err.message);
    res.status(500).json({ error: err.message });
  }
});



  return router;
};
