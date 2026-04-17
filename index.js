const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
app.use(express.json());

// Database Connection
// Database Connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'test', // <--- Update this line right here
    port: process.env.DB_PORT || 4000,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
}).promise();

// --- API 1: Add School ---
// --- API 1: Add School (Enhanced Validation) ---
app.post('/addSchool', async (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    // Data type and range validation
    if (!name || !address || typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ error: "Invalid or missing required fields" });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: "Latitude or Longitude out of range" });
    }

    try {
        const [result] = await db.execute(
            "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)",
            [name, address, latitude, longitude]
        );
        res.status(201).json({ message: "School added successfully!", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: "Database error: " + err.message });
    }
});

// --- API 2: List Schools (Sorted by Proximity) ---
app.get('/listSchools', async (req, res) => {
    const { latitude, longitude } = req.query;
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLon)) {
        return res.status(400).json({ error: "Invalid user coordinates" });
    }

    try {
        const [schools] = await db.execute("SELECT * FROM schools");

        // Simple Distance Calculation (Pythagorean)
        const sortedSchools = schools.map(school => {
            const distance = Math.sqrt(
                Math.pow(school.latitude - userLat, 2) + 
                Math.pow(school.longitude - userLon, 2)
            );
            return { ...school, distance };
        }).sort((a, b) => a.distance - b.distance);

        res.json(sortedSchools);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));