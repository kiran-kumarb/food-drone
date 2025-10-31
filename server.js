const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db/connection");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/customers", (req, res) => {
  db.query("SELECT CustomerID, Name FROM Customer", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get("/restaurants", (req, res) => {
  db.query("SELECT RestaurantID, Name FROM Restaurant", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get("/menu/:restID", (req, res) => {
  db.query("SELECT ItemID, Name, Price FROM MenuItem WHERE RestaurantID=?", [req.params.restID], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/placeOrder", (req, res) => {
  const { customerID, restaurantID, items } = req.body;
  const orderSql = "INSERT INTO Orders (CustomerID, RestaurantID, Status, TotalAmount) VALUES (?, ?, 'Pending', 0)";
  db.query(orderSql, [customerID, restaurantID], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    const orderID = result.insertId;
    const detailsSql = "INSERT INTO OrderDetails (OrderID, ItemID, Quantity) VALUES ?";
    const values = items.map(i => [orderID, i.itemID, i.qty]);
    db.query(detailsSql, [values], err2 => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: "✅ Order placed successfully!" });
    });
  });
});

app.get("/orders", (req, res) => {
  const sql = `
    SELECT o.OrderID, c.Name AS Customer, r.Name AS Restaurant, o.Status, o.TotalAmount
    FROM Orders o
    JOIN Customer c ON o.CustomerID=c.CustomerID
    JOIN Restaurant r ON o.RestaurantID=r.RestaurantID`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.get("/drones", (req, res) => {
  db.query("SELECT * FROM Drone", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/assignDrone", (req, res) => {
  const { orderID } = req.body;
  db.query("CALL AssignDroneToOrder(?)", [orderID], err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Drone assigned successfully!" });
  });
});

const PORT = 5000;
  
  app.listen(PORT, () => console.log(`🚀 Server running on  https://localhost:${PORT} `));

// ✅ Fetch all deliveries
app.get("/deliveries", (req, res) => {
  const sql = `
    SELECT DeliveryID, OrderID, DroneID, Status, StartTime, EndTime
    FROM Delivery
    ORDER BY DeliveryID DESC;
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ✅ Mark a delivery as completed
app.post("/completeDelivery", (req, res) => {
  const { deliveryID } = req.body;
  const sql = "UPDATE Delivery SET Status='Completed', EndTime=NOW() WHERE DeliveryID=?";
  db.query(sql, [deliveryID], err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✅ Delivery marked as completed!" });
  });
});
