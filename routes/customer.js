const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Register new customer
  router.post('/register', (req, res) => {
    const { Name, Phone, Email, Address, Username, Password } = req.body;
    db.query(
      'CALL RegisterCustomer(?, ?, ?, ?, ?, ?)',
      [Name, Phone, Email, Address, Username, Password],
      (err, result) => {
        if (err) return res.status(400).json({ error: err.sqlMessage });
        res.json({ message: 'Customer registered successfully' });
      }
    );
  });

  // Login customer
  router.post('/login', (req, res) => {
    const { Username, Password } = req.body;
    db.query('CALL LoginCustomer(?, ?)', [Username, Password], (err, result) => {
      if (err) return res.status(400).json({ error: err.sqlMessage });
      res.json(result[0][0]);
    });
  });

  return router;
};
