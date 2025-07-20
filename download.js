const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('powunity.db');

const API_TOKEN = process.argv[2];
const DEVICE_ID = process.argv[3];

if (!API_TOKEN || !DEVICE_ID) {
    console.error('Usage: node download.js <API_TOKEN> <DEVICE_ID>');
    process.exit(1);
}

// Promisify db methods
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

async function setupDatabase() {
    await dbRun("CREATE TABLE IF NOT EXISTS trips (id INTEGER PRIMARY KEY AUTOINCREMENT, deviceId INTEGER, startTime TEXT, endTime TEXT, distance REAL)");
    await dbRun("CREATE TABLE IF NOT EXISTS positions (id INTEGER PRIMARY KEY AUTOINCREMENT, tripId INTEGER, latitude REAL, longitude REAL, altitude REAL, fixTime TEXT, speed REAL, FOREIGN KEY(tripId) REFERENCES trips(id))");
    console.log('Database tables checked/created.');
    console.log('Clearing existing data from tables...');
    await dbRun("DELETE FROM positions");
    await dbRun("DELETE FROM trips");
    console.log('Tables cleared.');
}

async function main() {
    await setupDatabase();

    const sessionCookie = await getSessionCookie(API_TOKEN);
    if (!sessionCookie) {
        console.error('Failed to get session cookie.');
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

        const trips = await getTrips(sessionCookie, DEVICE_ID, startDate, nextDate);
        for (const trip of trips) {
            const result = await dbRun("INSERT INTO trips (deviceId, startTime, endTime, distance) VALUES (?, ?, ?, ?)", [trip.deviceId, trip.startTime, trip.endTime, trip.distance]);
            const tripId = result.lastID;

            const positions = await getPositions(sessionCookie, DEVICE_ID, new Date(trip.startTime), new Date(trip.endTime));

            let previousPosition = null;
            for (const position of positions) {
                const speed = calculateSpeed(previousPosition, position);
                await dbRun("INSERT INTO positions (tripId, latitude, longitude, altitude, fixTime, speed) VALUES (?, ?, ?, ?, ?, ?)", [tripId, position.latitude, position.longitude, position.altitude, position.fixTime, speed]);
                previousPosition = position;
            }
        }
        startDate = nextDate;
    }

    console.log('All data downloaded. Exporting to data.json...');
    await exportDataToJson();

    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
    });
}

async function getSessionCookie(token) {
    const response = await fetch(`https://traccar.powunity.com/api/session?token=${token}`);
    if (!response.ok) {
        return null;
    }
    return response.headers.get('set-cookie');
}

async function getTrips(sessionCookie, deviceId, from, to) {
    const url = `https://traccar.powunity.com/api/reports/trips?deviceId=${deviceId}&from=${from.toISOString()}&to=${to.toISOString()}`;
    const response = await fetch(url, {
        headers: {
            'Cookie': sessionCookie,
            'Accept': 'application/json'
        }
    });
    if (!response.ok) {
        console.error(`Error fetching trips: ${response.status} ${response.statusText}`);
        return [];
    }
    try {
        return await response.json();
    } catch (err) {
        const text = await response.text();
        console.error('Failed to parse JSON response for trips. Server response:', text);
        return [];
    }
}

async function getPositions(sessionCookie, deviceId, from, to) {
    const url = `https://traccar.powunity.com/api/positions?deviceId=${deviceId}&from=${from.toISOString()}&to=${to.toISOString()}`;
    const response = await fetch(url, {
        headers: {
            'Cookie': sessionCookie,
            'Accept': 'application/json'
        }
    });
    if (!response.ok) {
        console.error(`Error fetching positions: ${response.status} ${response.statusText}`);
        return [];
    }
    try {
        return await response.json();
    } catch (err) {
        const text = await response.text();
        console.error('Failed to parse JSON response for positions. Server response:', text);
        return [];
    }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

function calculateSpeed(prevPosition, currentPosition) {
    if (!prevPosition) {
        return 0; // Speed is 0 for the first point
    }

    const distance = haversineDistance(prevPosition.latitude, prevPosition.longitude, currentPosition.latitude, currentPosition.longitude);
    const timeDiff = (new Date(currentPosition.fixTime) - new Date(prevPosition.fixTime)) / 1000; // in seconds

    if (timeDiff === 0) {
        return 0; // Avoid division by zero
    }

    const speedMps = distance / timeDiff; // meters per second
    return speedMps * 3.6; // km/h
}

async function exportDataToJson() {
    const trips = await dbAll("SELECT * FROM trips");
    const allTripsData = [];

    for (const trip of trips) {
        const positions = await dbAll("SELECT * FROM positions WHERE tripId = ?", [trip.id]);
        allTripsData.push({ ...trip, positions });
    }

    fs.writeFileSync('data.json', JSON.stringify(allTripsData, null, 2));
    console.log('Successfully exported all data to data.json');
}

main();