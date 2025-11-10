const express = require("express");
const router = express.Router();

module.exports = (db) => {
  // ✅ Fetch all notifications for a customer
  router.get("/:CustomerID", (req, res) => {
    const { CustomerID } = req.params;

    const sql = `
      SELECT NotificationID, CustomerID, OrderID, Message, CreatedAt, IsRead
      FROM notification
      WHERE CustomerID = ?
      ORDER BY CreatedAt DESC
      LIMIT 20
    `;

    db.query(sql, [CustomerID], (err, results) => {
      if (err) {
        console.error("Error fetching notifications:", err);
        return res.status(500).json({ error: "Database error fetching notifications" });
      }
      res.json(results);
    });
  });

  // ✅ Fetch notifications for a specific order AND customer
router.get("/order/:OrderID/:CustomerID", (req, res) => {
  const { OrderID, CustomerID } = req.params;

  const sql = `
    SELECT NotificationID, CustomerID, OrderID, Message, CreatedAt, IsRead
    FROM notification
    WHERE OrderID = ? AND CustomerID = ?
    ORDER BY CreatedAt DESC
  `;

  db.query(sql, [OrderID, CustomerID], (err, results) => {
    if (err) {
      console.error("Error fetching order notifications:", err);
      return res.status(500).json({ error: "Database error fetching order notifications" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No notifications found for this order." });
    }

    res.json(results);
  });
});

  // ✅ Mark single notification as read
  router.post("/read/:NotificationID", (req, res) => {
    const { NotificationID } = req.params;
    const sql = `UPDATE notification SET IsRead = 1 WHERE NotificationID = ?`;

    db.query(sql, [NotificationID], (err) => {
      if (err) {
        console.error("Error marking notification as read:", err);
        return res.status(500).json({ error: "Error updating notification" });
      }
      res.json({ success: true, message: "Notification marked as read" });
    });
  });

  return router;
};
