// server.js - ĐÃ SỬA HOÀN CHỈNH
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Cấu hình kết nối database từ biến môi trường
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Endpoint kiểm tra sức khỏe (health check) cho ALB
app.get('/', (req, res) => {
  res.status(200).send('API is healthy!');
});

// Endpoint lấy danh sách các dịch vụ
app.get('/api/services', (req, res) => {
    const services = [
        "Cloud Migration",
        "DevOps Automation", 
        "AI/ML Solutions",
        "Cybersecurity Audit",
        "Serverless Architecture",
        "Data Analytics",
        "Mobile App Development"
    ];
    res.json(services);
});

// Endpoint lấy tất cả các yêu cầu báo giá
app.get('/api/quotes', (req, res) => {
  pool.query('SELECT * FROM quotes ORDER BY created_at DESC', (error, results) => {
    if (error) {
      console.error("Database query error:", error);
      return res.status(500).json({ error: 'Database query failed' });
    }
    res.json(results);
  });
});

// Endpoint tạo một yêu cầu báo giá mới
app.post('/api/quotes', (req, res) => {
  const { customer_name, email, service_needed, details } = req.body;
  if (!customer_name || !email || !service_needed) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = 'INSERT INTO quotes (customer_name, email, service_needed, details) VALUES (?,?,?,?)';
  pool.query(query, [customer_name, email, service_needed, details], (error, results) => {
    if (error) {
      console.error("Database insert error:", error);
      return res.status(500).json({ error: 'Failed to create quote' });
    }
    res.status(201).json({ id: results.insertId, message: 'Quote created successfully' });
  });
});

// Khởi tạo bảng trong DB nếu chưa có – KHÔNG DÙNG process.exit(1)
const initDb = () => {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS quotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        service_needed VARCHAR(255) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;
    pool.query(createTableQuery, (error) => {
        if (error) {
            console.error("Failed to create table:", error);
            // KHÔNG DÙNG process.exit(1) → FARGATE SẼ HỦY TASK
            console.log("Continuing without table creation. Check DB connection or SG.");
        } else {
            console.log("Table 'quotes' is ready.");
        }
    });
};

app.listen(port, () => {
  console.log(`TechStart API listening at http://localhost:${port}`);
  initDb();
});