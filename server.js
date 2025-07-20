
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');

const app = express();
const port = 3000;

// Serve static files from the root directory (e.g., index.html, script.js)
app.use(express.static('.'));
app.use(express.json());

const db = new sqlite3.Database('./powunity.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run("CREATE TABLE IF NOT EXISTS trips (id INTEGER PRIMARY KEY AUTOINCREMENT, deviceId INTEGER, startTime TEXT UNIQUE, endTime TEXT, distance REAL)");
        db.run("CREATE TABLE IF NOT EXISTS positions (id INTEGER PRIMARY KEY AUTOINCREMENT, tripId INTEGER, latitude REAL, longitude REAL, altitude REAL, fixTime TEXT, speed REAL, FOREIGN KEY(tripId) REFERENCES trips(id))");
    }
});

// --- API Endpoints ---

// Endpoint to fetch trips for a given date range
app.get('/api/trips', async (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) {
        return res.status(400).send('Please provide a start and end date.');
    }

    try {
        const trips = await dbAll("SELECT * FROM trips WHERE startTime >= ? AND endTime <= ?", [from, to]);
        const tripsWithPositions = [];
        for (const trip of trips) {
            const positions = await dbAll("SELECT * FROM positions WHERE tripId = ? ORDER BY fixTime ASC", [trip.id]);
            tripsWithPositions.push({ ...trip, positions });
        }
        res.json(tripsWithPositions);
    } catch (error) {
        console.error('Error fetching trips from DB:', error);
        res.status(500).send('Error fetching data from database.');
    }
});

// Endpoint to trigger the import process
app.post('/api/import', async (req, res) => {
    const { apiToken, deviceId } = req.body;
    if (!apiToken || !deviceId) {
        return res.status(400).send('API Token and Device ID are required.');
    }

    res.status(202).send('Import process started. This may take a while...'); // Respond immediately

    // Run the import in the background
    importData(apiToken, deviceId).catch(console.error);
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// --- Data Import Logic ---

async function importData(apiToken, deviceId) {
    console.log('Starting data import...');
    const sessionCookie = await getSessionCookie(apiToken);
    if (!sessionCookie) {
        console.error('Failed to get session cookie for import.');
        return;
    }

    let startDate = new Date('2015-01-01T00:00:00Z');
    const endDate = new Date();

    while (startDate < endDate) {
        let nextDate = new Date(startDate);
        nextDate.setMonth(nextDate.getMonth() + 6);
        if (nextDate > endDate) {
            nextDate = endDate;
        }

        console.log(`Fetching trips from ${startDate.toISOString()} to ${nextDate.toISOString()}`);
        const trips = await getTripsFromApi(sessionCookie, deviceId, startDate, nextDate);

        for (const trip of trips) {
            const existingTrip = await dbGet("SELECT id FROM trips WHERE startTime = ? AND endTime = ?", [trip.startTime, trip.endTime]);
            if (existingTrip) {
                console.log(`Trip from ${trip.startTime} already exists. Skipping.`);
                continue;
            }

            const result = await dbRun("INSERT INTO trips (deviceId, startTime, endTime, distance) VALUES (?, ?, ?, ?)", [trip.deviceId, trip.startTime, trip.endTime, trip.distance]);
            const tripId = result.lastID;

            const positions = await getPositionsFromApi(sessionCookie, deviceId, new Date(trip.startTime), new Date(trip.endTime));
            let previousPosition = null;
            for (const position of positions) {
                const speed = calculateSpeed(previousPosition, position);
                await dbRun("INSERT INTO positions (tripId, latitude, longitude, altitude, fixTime, speed) VALUES (?, ?, ?, ?, ?, ?)", [tripId, position.latitude, position.longitude, position.altitude, position.fixTime, speed]);
                previousPosition = position;
            }
        }
        startDate = nextDate;
    }
    console.log('Data import finished.');
}

// --- Helper & Utility Functions ---

async function getSessionCookie(token) {
    const response = await fetch(`https://traccar.powunity.com/api/session?token=${token}`);
    return response.ok ? response.headers.get('set-cookie') : null;
}

async function getTripsFromApi(cookie, deviceId, from, to) {
    const url = `https://traccar.powunity.com/api/reports/trips?deviceId=${deviceId}&from=${from.toISOString()}&to=${to.toISOString()}`;
    const response = await fetch(url, { headers: { 'Cookie': cookie, 'Accept': 'application/json' } });
    return response.ok ? response.json() : [];
}

async function getPositionsFromApi(cookie, deviceId, from, to) {
    const url = `https://traccar.powunity.com/api/positions?deviceId=${deviceId}&from=${from.toISOString()}&to=${to.toISOString()}`;
    const response = await fetch(url, { headers: { 'Cookie': cookie, 'Accept': 'application/json' } });
    return response.ok ? response.json() : [];
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateSpeed(prev, curr) {
    if (!prev) return 0;
    const dist = haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const time = (new Date(curr.fixTime) - new Date(prev.fixTime)) / 1000;
    if (time === 0) return 0;
    return (dist / time) * 3.6;
}

// --- Database Promise Wrappers ---
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});
