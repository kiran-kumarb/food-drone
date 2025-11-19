const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mysql = require('mysql2');

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Create MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Test DB connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to MySQL Database');
    connection.release();
  }
});

// Import routes (NO DUPLICATES)
const customerRoutes = require('./routes/customer');
const restaurantRoutes = require('./routes/restaurant');
const orderRoutes = require('./routes/order');
const deliveryRoutes = require('./routes/delivery');
const notificationRoutes = require('./routes/notification');
const adminRoutes = require("./routes/admin");

// Mount routes
app.use('/customer', customerRoutes(db));
app.use('/restaurant', restaurantRoutes(db));
app.use('/order', orderRoutes(db));
app.use('/delivery', deliveryRoutes(db));
app.use('/notification', notificationRoutes(db));
app.use("/api/admin", adminRoutes(db));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT} : http://localhost:${PORT}/index.html`)
);
