const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
app.use(express.json());

// Database Connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'test',
    port: process.env.DB_PORT || 4000,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
}).promise();

// --- Home Route with Interactive UI & Instructions ---
app.get('/', (req, res) => { 
    res.send(`
        <div style="font-family: sans-serif; max-width: 800px; margin: auto; padding: 50px; line-height: 1.6; text-align: center;">
            <h1 style="color: #2c3e50;">🏫 School Management API</h1>
            <p>The API is officially live and connected to <strong>TiDB Cloud!</strong></p>
            
            <div style="margin: 30px 0;">
                <a href="/listSchools?latitude=18.52&longitude=73.85" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                   🚀 View Nearby Schools (Test GET)
                </a>
            </div>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">

            <div style="text-align: left;">
                <h3>🛠️ How to Add a School (POST)</h3>
                <p>To add a new school to the database, send a <strong>POST</strong> request to <code>/addSchool</code> using Postman with this JSON body like this :</p>
                <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #ddd; overflow-x: auto;">
{
  "name": "Sinhgad College of Engineering",
  "address": "Vadgaon Budruk, Pune",
  "latitude": 18.4636,
  "longitude": 73.8340
}
                </pre>
            </div>
        </div>
    `);
});

// --- API 1: Add School ---
app.post('/addSchool', async (req, res) => {
    const { name, address, latitude, longitude } = req.body;

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