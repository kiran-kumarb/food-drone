const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.post('/place', (req, res) => {
    const { CustomerID, RestaurantID, LocationID } = req.body;
    db.query(
      'CALL PlaceOrder(?, ?, ?)',
      [CustomerID, RestaurantID, LocationID],
      (err) => {
        if (err) return res.status(400).json({ error: err.sqlMessage });
        res.json({ message: 'Order placed successfully' });
      }
    );
  });

  router.post('/add-item', (req, res) => {
    const { OrderID, ItemID, Quantity } = req.body;
    db.query(
      'CALL AddOrderItem(?, ?, ?)',
      [OrderID, ItemID, Quantity],
      (err) => {
        if (err) return res.status(400).json({ error: err.sqlMessage });
        res.json({ message: 'Item added to order' });
      }
    );
  });

  router.post('/pay', (req, res) => {
    const { OrderID, Method } = req.body;
    db.query('CALL MakePayment(?, ?)', [OrderID, Method], (err) => {
      if (err) return res.status(400).json({ error: err.sqlMessage });
      res.json({ message: 'Payment successful' });
    });
  });
// Get latest order by customer
router.get('/latest/:customerID', (req, res) => {
  const id = req.params.customerID;
  db.query(
    'SELECT * FROM OrderTable WHERE CustomerID = ? ORDER BY OrderID DESC LIMIT 1',
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.sqlMessage });
      res.json(result[0]);
    }
  );
});

  return router;
};
