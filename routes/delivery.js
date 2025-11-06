const express = require('express');
const router = express.Router();

module.exports = (db) => {
router.post('/assign', (req, res) => {
  const { OrderID } = req.body;
  db.query('CALL AssignDrone(?)', [OrderID], (err, result) => {
    if (err) {
      console.error('Error assigning drone:', err);
      return res.status(400).json({ error: err.sqlMessage });
    }
    res.json({ message: `Drone assigned successfully for order ${OrderID}` });
  });
});

  router.post('/complete', (req, res) => {
    const { OrderID } = req.body;
    db.query('CALL CompleteDelivery(?)', [OrderID], (err) => {
      if (err) return res.status(400).json({ error: err.sqlMessage });
      res.json({ message: 'Delivery marked as completed' });
    });
  });

  return router;
};
