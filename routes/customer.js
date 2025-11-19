// routes/customer.js
const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  const q = (...args) => db.promise().query(...args);

  // ======================================================
  // REGISTER CUSTOMER
  // ======================================================
  router.post('/register', async (req, res) => {
    try {
      const { name, phone, email, address, username, password } = req.body;

      await q("CALL RegisterCustomer(?, ?, ?, ?, ?, ?)", [
        name,
        phone,
        email,
        address,
        username,
        password,
      ]);

      res.json({ message: "Customer registered successfully" });

    } catch (err) {
      console.error("Register error:", err.message);
      res.status(400).json({ error: err.sqlMessage || err.message });
    }
  });

  // ======================================================
  // LOGIN CUSTOMER
  // ======================================================
  router.post('/login', async (req, res) => {
    try {
      // Accept BOTH formats: Username / username
      const Username = req.body.Username || req.body.username;
      const Password = req.body.Password || req.body.password;

      if (!Username || !Password) {
        return res.status(400).json({ error: "Username and Password required" });
      }

      const [rows] = await q("CALL LoginCustomer(?, ?)", [
        Username,
        Password
      ]);

      // MySQL CALL returns nested array: rows[0][0]
      const result = rows[0][0];

      if (!result) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      res.json(result);

    } catch (err) {
      console.error("Customer login error:", err.message);
      res.status(400).json({ error: err.sqlMessage || err.message });
    }
  });

  return router;
};
