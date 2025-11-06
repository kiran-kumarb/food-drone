const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Register new restaurant
  router.post('/register', (req, res) => {
    const { Name, Location, Contact, Username, Password } = req.body;
    db.query(
      'CALL RegisterRestaurant(?, ?, ?, ?, ?)',
      [Name, Location, Contact, Username, Password],
      (err, result) => {
        if (err) return res.status(400).json({ error: err.sqlMessage });
        res.json({ message: 'Restaurant registered successfully' });
      }
    );
  });

  // Restaurant login
  router.post('/login', (req, res) => {
    const { Username, Password } = req.body;
    db.query('CALL LoginRestaurant(?, ?)', [Username, Password], (err, result) => {
      if (err) return res.status(400).json({ error: err.sqlMessage });
      res.json(result[0][0]);
    });
  });

  // List all restaurants
  router.get('/list', (req, res) => {
    db.query('SELECT * FROM Restaurant', (err, result) => {
      if (err) return res.status(500).json({ error: err.sqlMessage });
      res.json(result);
    });
  });

  // Get menu items for a restaurant
  router.get('/menu/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT * FROM MenuItem WHERE RestaurantID = ?', [id], (err, result) => {
      if (err) return res.status(500).json({ error: err.sqlMessage });
      res.json(result);
    });
  });

  return router;
};
