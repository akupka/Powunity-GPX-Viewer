# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start the server (serves on http://localhost:3000)
node server.js
```

There is no test suite configured (`npm test` exits with an error).

## Architecture

This is a single-file Node.js backend ([server.js](server.js)) with a vanilla JS frontend ([script.js](script.js) + [index.html](index.html)).

**Data flow:**
1. User provides an API token and Device ID from Powunity (BikeTrax tracker)
2. `POST /api/import` triggers `importData()` in the background — it authenticates via `GET https://iot.powunity.com/api/session?token=<token>` to get a session cookie, then iterates in 6-month windows from 2015 to today, fetching trips from `/api/reports/trips` and positions from `/api/positions`
3. Positions are stored in SQLite (`powunity.db`) with a calculated `speed` field (Haversine formula, stored in km/h — the Powunity API does not provide speed directly)
4. `GET /api/trips?from=<date>&to=<date>` reads trips + their positions from SQLite and returns them to the frontend
5. Frontend draws each segment as a Leaflet polyline color-coded by speed (blue = slow → green → red = fast, max scale 40 km/h)

**Database schema** (auto-created on startup):
- `trips`: `id, deviceId, startTime (UNIQUE), endTime, distance`
- `positions`: `id, tripId, latitude, longitude, altitude, fixTime, speed`

**Deduplication:** import skips a trip if a row with the same `startTime` AND `endTime` already exists.

**Static files:** Express serves the project root directly (`app.use(express.static('.'))`), so `index.html`, `script.js`, and `style.css` are all served from `/`.

## External API

The upstream API is documented in [swagger.txt](swagger.txt) — it's the Powunity/Traccar API at `https://iot.powunity.com/api`. The relevant endpoints used are:
- `GET /session?token=<token>` — returns a `set-cookie` session header
- `GET /reports/trips?deviceId=&from=&to=` — returns trip summaries
- `GET /positions?deviceId=&from=&to=` — returns raw position data

All date parameters use ISO 8601 format.
