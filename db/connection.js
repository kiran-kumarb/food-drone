const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "kirankumarb7@K",
  database: "food_drone"
});

db.connect(err => {
  if (err) console.error("❌ DB Connection failed:", err);
  else console.log("✅ Connected to MySQL Database");
});

module.exports = db;
