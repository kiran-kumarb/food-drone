// routes/restaurant.js
const express = require("express");

module.exports = (db) => {
  const router = express.Router();
  const q = (...args) => db.promise().query(...args);

  /* ============================================================
     1. GET ALL RESTAURANTS
     ============================================================ */
  router.get("/list", async (req, res) => {
    try {
      const [rows] = await q("SELECT * FROM Restaurant ORDER BY RestaurantID DESC");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /* ============================================================
     2. GET MENU FOR RESTAURANT  (!!! MUST BE ABOVE /:id !!!)
     ============================================================ */
  router.get("/menu/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const [rows] = await q(
        `SELECT 
            m.ItemID,
            m.Name,
            m.Description,
            m.Price,
            m.WeightKg,
            m.Status
         FROM MenuItem m
         WHERE m.RestaurantID = ?
           AND m.Status = 'Active'
         ORDER BY m.ItemID DESC`,
        [id]
      );

      res.json(rows);
    } catch (err) {
      console.error("Menu fetch error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /* ============================================================
     3. GET SINGLE RESTAURANT (placed AFTER /menu/:id)
     ============================================================ */
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await q("SELECT * FROM Restaurant WHERE RestaurantID = ?", [id]);

      if (rows.length === 0)
        return res.status(404).json({ error: "Restaurant not found" });

      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
