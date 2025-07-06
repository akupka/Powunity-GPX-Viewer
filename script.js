document.addEventListener('DOMContentLoaded', () => {
    const apiTokenInput = document.getElementById('apiToken');
    const deviceIdInput = document.getElementById('deviceId');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const loadRouteButton = document.getElementById('loadRoute');
    const routeSelect = document.getElementById('routeSelect');
    const batteryLevelSpan = document.getElementById('batteryLevel');
    const totalDistanceSpan = document.getElementById('totalDistance');
    const routeSummaryDiv = document.getElementById('routeSummary');
    const mapElement = document.getElementById('map');

    // Initialize Leaflet Map
    const map = L.map('map').setView([51.505, -0.09], 13); // Default view, will be adjusted

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let gpxLayer = null;
    let devices = []; // Declare devices globally within this scope

    const loginButton = document.getElementById('loginButton');

    loginButton.addEventListener('click', async () => {
        const apiToken = apiTokenInput.value;

        if (!apiToken) {
            alert('Bitte geben Sie Ihren API Token ein.');
            return;
        }

        try {
            const sessionResponse = await fetch(`https://traccar.powunity.com/api/session?token=${apiToken}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!sessionResponse.ok) {
                const errorText = await sessionResponse.text();
                throw new Error(`Session-Fehler: ${sessionResponse.status} ${sessionResponse.statusText} - ${errorText}`);
            }
            const userData = await sessionResponse.json();
            console.log('Session erfolgreich etabliert.', userData);

            document.getElementById('userName').textContent = userData.name || 'N/A';
            document.getElementById('userEmail').textContent = userData.email || 'N/A';
            document.getElementById('userInfo').style.display = 'block';

            const devicesResponse = await fetch(`https://traccar.powunity.com/api/devices`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!devicesResponse.ok) {
                const errorText = await devicesResponse.text();
                throw new Error(`Geräte-Fehler: ${devicesResponse.status} ${devicesResponse.statusText} - ${errorText}`);
            }
            devices = await devicesResponse.json(); // Assign to the global devices variable
            console.log('Geräte erfolgreich geladen.', devices);

            deviceIdInput.innerHTML = '<option value="">Gerät auswählen</option>';
            let firstDeviceId = null;
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = `${device.name} (ID: ${device.id})`;
                deviceIdInput.appendChild(option);
                if (!firstDeviceId) {
                    firstDeviceId = device.id;
                }
            });
            deviceIdInput.disabled = false;
            loadRouteButton.disabled = true; // Keep disabled until route is selected

            // Display battery level for the first device or selected device
            const initialSelectedDevice = devices.find(d => d.id == deviceIdInput.value) || devices[0];
            if (initialSelectedDevice && initialSelectedDevice.attributes && initialSelectedDevice.attributes.batteryLevel !== undefined) {
                batteryLevelSpan.textContent = `${initialSelectedDevice.attributes.batteryLevel}%`;
            } else {
                batteryLevelSpan.textContent = 'N/A';
            }

            // Trigger initial fetch for trips and summary
            fetchTripsAndPopulateDropdown();
            fetchRouteSummaryAndDisplay();

        } catch (error) {
            console.error('Fehler beim Login oder Laden der Geräte:', error);
            alert('Fehler beim Login oder Laden der Geräte: ' + error.message);
            deviceIdInput.disabled = true;
            loadRouteButton.disabled = true;
            batteryLevelSpan.textContent = 'N/A';
            totalDistanceSpan.textContent = 'N/A';
            routeSummaryDiv.style.display = 'none';
        }
    });

    // Event listener for fetching trips and populating the route dropdown
    deviceIdInput.addEventListener('change', () => {
        fetchTripsAndPopulateDropdown();
        fetchRouteSummaryAndDisplay();
        // Update battery level when device changes
        const selectedDevice = devices.find(d => d.id == deviceIdInput.value);
        if (selectedDevice && selectedDevice.attributes && selectedDevice.attributes.batteryLevel !== undefined) {
            batteryLevelSpan.textContent = `${selectedDevice.attributes.batteryLevel}%`;
        } else {
            batteryLevelSpan.textContent = 'N/A';
        }
    });
    startDateInput.addEventListener('change', () => {
        fetchTripsAndPopulateDropdown();
        fetchRouteSummaryAndDisplay();
    });
    endDateInput.addEventListener('change', () => {
        fetchTripsAndPopulateDropdown();
        fetchRouteSummaryAndDisplay();
    });

    async function fetchTripsAndPopulateDropdown() {
        const deviceId = deviceIdInput.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!deviceId || !startDate || !endDate) {
            routeSelect.innerHTML = '<option value="">Bitte zuerst Gerät und Datum auswählen</option>';
            routeSelect.disabled = true;
            loadRouteButton.disabled = true;
            showAllRoutesButton.disabled = true;
            totalDistanceSpan.textContent = 'N/A';
            routeSummaryDiv.style.display = 'none';
            return;
        }

        const fromDate = new Date(startDate).toISOString();
        const toDate = new Date(endDate).toISOString();

        try {
            const tripsUrl = `https://traccar.powunity.com/api/reports/trips?deviceId=${deviceId}&from=${fromDate}&to=${toDate}`;
            const tripsResponse = await fetch(tripsUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!tripsResponse.ok) {
                const errorText = await tripsResponse.text();
                throw new Error(`Fahrten-Fehler: ${tripsResponse.status} ${tripsResponse.statusText} - ${errorText}`);
            }

            const trips = await tripsResponse.json();
            console.log('Fahrten erfolgreich geladen.', trips);

            routeSelect.innerHTML = '<option value="">Route auswählen</option>';
            if (trips.length === 0) {
                routeSelect.innerHTML = '<option value="">Keine Routen gefunden</option>';
                routeSelect.disabled = true;
                loadRouteButton.disabled = true;
                showAllRoutesButton.disabled = true;
                totalDistanceSpan.textContent = 'N/A';
                routeSummaryDiv.style.display = 'none';
                return;
            }

            trips.forEach((trip, index) => {
                const option = document.createElement('option');
                // Store trip data as a JSON string in the value attribute
                option.value = JSON.stringify({ start: trip.startTime, end: trip.endTime });
                const startDate = new Date(trip.startTime).toLocaleDateString();
                const startTime = new Date(trip.startTime).toLocaleTimeString();
                const endDate = new Date(trip.endTime).toLocaleDateString();
                const endTime = new Date(trip.endTime).toLocaleTimeString();
                option.textContent = `Route ${index + 1} (${startDate} ${startTime} - ${endDate} ${endTime})`;
                routeSelect.appendChild(option);
            });
            routeSelect.disabled = false;
            loadRouteButton.disabled = true; // Disable until a route is selected
            showAllRoutesButton.disabled = false; // Enable show all routes button

        } catch (error) {
            console.error('Fehler beim Laden der Fahrten:', error);
            alert('Fehler beim Laden der Fahrten: ' + error.message);
            routeSelect.innerHTML = '<option value="">Fehler beim Laden der Routen</option>';
            routeSelect.disabled = true;
            loadRouteButton.disabled = true;
            showAllRoutesButton.disabled = true;
            totalDistanceSpan.textContent = 'N/A';
            routeSummaryDiv.style.display = 'none';
        }
    }

    async function fetchRouteSummaryAndDisplay() {
        const deviceId = deviceIdInput.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!deviceId || !startDate || !endDate) {
            totalDistanceSpan.textContent = 'N/A';
            routeSummaryDiv.style.display = 'none';
            return;
        }

        const fromDate = new Date(startDate).toISOString();
        const toDate = new Date(endDate).toISOString();

        try {
            const summaryUrl = `https://traccar.powunity.com/api/reports/summary?deviceId=${deviceId}&from=${fromDate}&to=${toDate}`;
            const summaryResponse = await fetch(summaryUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!summaryResponse.ok) {
                const errorText = await summaryResponse.text();
                throw new Error(`Zusammenfassungs-Fehler: ${summaryResponse.status} ${summaryResponse.statusText} - ${errorText}`);
            }

            const summaryData = await summaryResponse.json();
            console.log('Received summary data:', summaryData);

            if (summaryData.length > 0 && summaryData[0].distance !== undefined) {
                // Distance is typically in meters, convert to km
                const distanceKm = (summaryData[0].distance / 1000).toFixed(2);
                totalDistanceSpan.textContent = distanceKm;
                routeSummaryDiv.style.display = 'block';
            } else {
                totalDistanceSpan.textContent = 'N/A';
                routeSummaryDiv.style.display = 'none';
            }

        } catch (error) {
            console.error('Fehler beim Laden der Routenzusammenfassung:', error);
            totalDistanceSpan.textContent = 'N/A';
            routeSummaryDiv.style.display = 'none';
        }
    }

    routeSelect.addEventListener('change', () => {
        if (routeSelect.value) {
            loadRouteButton.disabled = false;
        } else {
            loadRouteButton.disabled = true;
        }
    });

    loadRouteButton.addEventListener('click', async () => {
        const selectedRouteValue = routeSelect.value;
        if (!selectedRouteValue) {
            alert('Bitte wählen Sie eine Route aus.');
            return;
        }

        const { start, end } = JSON.parse(selectedRouteValue);
        const deviceId = deviceIdInput.value;

        console.log('DEBUG: deviceIdInput.value at loadRoute click:', deviceId);

        // Ensure dates are in ISO 8601 format with 'Z' (UTC)
        const fromDate = new Date(start).toISOString();
        const toDate = new Date(end).toISOString();

        try {
            const gpxUrl = `https://traccar.powunity.com/api/positions?deviceId=${deviceId}&from=${fromDate}&to=${toDate}`;
            console.log('Fetching GPX data from URL:', gpxUrl);
            const gpxResponse = await fetch(gpxUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!gpxResponse.ok) {
                const errorText = await gpxResponse.text();
                console.error('GPX API Response Error:', errorText);
                throw new Error(`GPX Daten-Fehler: ${gpxResponse.status} ${gpxResponse.statusText} - ${errorText}`);
            }

            const positions = await gpxResponse.json();
            console.log('Received positions data:', positions);

            if (positions.length === 0) {
                alert('Keine Positionsdaten für die ausgewählte Route gefunden.');
                if (gpxLayer) {
                    map.removeLayer(gpxLayer);
                }
                return;
            }

            const gpxData = generateGpx([positions]); // Pass as array of arrays for single track

            if (gpxLayer) {
                map.removeLayer(gpxLayer);
            }

            gpxLayer = new L.GPX(gpxData, {
                async: true,
                marker_options: {
                    startIconUrl: 'images/pin-icon-start.png',
                    endIconUrl: 'images/pin-icon-end.png',
                    shadowUrl: 'images/pin-shadow.png'
                }
            }).on('loaded', function(e) {
                map.fitBounds(e.target.getBounds());
            }).addTo(map);

            console.log('GPX-Route erfolgreich geladen und auf der Karte angezeigt.');

        } catch (error) {
            console.error('Fehler beim Laden der Route:', error);
            alert('Fehler beim Laden der Route: ' + error.message);
        }
    });

    showAllRoutesButton.addEventListener('click', async () => {
        const deviceId = deviceIdInput.value;
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!deviceId || !startDate || !endDate) {
            alert('Bitte wählen Sie ein Gerät aus und füllen Sie Start- und Enddatum aus, um alle Routen anzuzeigen.');
            return;
        }

        const fromDate = new Date(startDate).toISOString();
        const toDate = new Date(endDate).toISOString();

        try {
            // First, fetch all trips for the selected period
            const tripsUrl = `https://traccar.powunity.com/api/reports/trips?deviceId=${deviceId}&from=${fromDate}&to=${toDate}`;
            const tripsResponse = await fetch(tripsUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!tripsResponse.ok) {
                const errorText = await tripsResponse.text();
                throw new Error(`Fahrten-Fehler (Alle Routen): ${tripsResponse.status} ${tripsResponse.statusText} - ${errorText}`);
            }

            const trips = await tripsResponse.json();
            console.log('Alle Fahrten erfolgreich geladen:', trips);

            if (trips.length === 0) {
                alert('Keine Routen für den ausgewählten Zeitraum gefunden.');
                if (gpxLayer) {
                    map.removeLayer(gpxLayer);
                }
                return;
            }

            // Now, fetch positions for each trip
            const positionPromises = trips.map(trip => {
                const tripFromDate = new Date(trip.startTime).toISOString();
                const tripToDate = new Date(trip.endTime).toISOString();
                const positionsUrl = `https://traccar.powunity.com/api/positions?deviceId=${deviceId}&from=${tripFromDate}&to=${tripToDate}`;
                console.log('Fetching positions for trip from URL:', positionsUrl);
                return fetch(positionsUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    credentials: 'include'
                }).then(response => {
                    if (!response.ok) {
                        return response.text().then(errorText => {
                            throw new Error(`Positions-Fehler für Route (${tripFromDate} - ${tripToDate}): ${response.status} ${response.statusText} - ${errorText}`);
                        });
                    }
                    return response.json();
                }).then(positions => ({
                    ...trip, // Keep original trip data
                    positions: positions // Add fetched positions to the trip object
                }));
            });

            const tripsWithPositions = await Promise.all(positionPromises);
            console.log('Alle Fahrten mit Positionsdaten:', tripsWithPositions);

            // Filter out trips that returned no positions
            const validTripsWithPositions = tripsWithPositions.filter(trip => trip.positions && trip.positions.length > 0);

            if (validTripsWithPositions.length === 0) {
                alert('Keine Positionsdaten für die ausgewählten Routen gefunden.');
                if (gpxLayer) {
                    map.removeLayer(gpxLayer);
                }
                return;
            }

            // Generate multi-track GPX
            const gpxData = generateGpx(validTripsWithPositions);

            if (gpxLayer) {
                map.removeLayer(gpxLayer);
            }

            gpxLayer = new L.GPX(gpxData, {
                async: true,
                marker_options: {
                    startIconUrl: 'images/pin-icon-start.png',
                    endIconUrl: 'images/pin-icon-end.png',
                    shadowUrl: 'images/pin-shadow.png'
                }
            }).on('loaded', function(e) {
                map.fitBounds(e.target.getBounds());
            }).addTo(map);

            console.log('Alle GPX-Routen erfolgreich geladen und auf der Karte angezeigt.');

        } catch (error) {
            console.error('Fehler beim Laden aller Routen:', error);
            alert('Fehler beim Laden aller Routen: ' + error.message);
        }
    });

    function generateGpx(tripsWithPositions) {
        let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Powunity GPX Viewer"\n    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n    xmlns="http://www.topografix.com/GPX/1/1"\n    xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">`;

        tripsWithPositions.forEach((trip, tripIndex) => {
            gpx += `\n    <trk>\n        <name>Route ${tripIndex + 1} (${new Date(trip.startTime).toLocaleDateString()} ${new Date(trip.startTime).toLocaleTimeString()} - ${new Date(trip.endTime).toLocaleDateString()} ${new Date(trip.endTime).toLocaleTimeString()})</name>\n        <trkseg>`;

            trip.positions.forEach(pos => {
                gpx += `\n            <trkpt lat="${pos.latitude}" lon="${pos.longitude}">`;
                if (pos.altitude !== undefined && pos.altitude !== null) {
                    gpx += `\n                <ele>${pos.altitude}</ele>`;
                }
                if (pos.fixTime) {
                    gpx += `\n                <time>${pos.fixTime}</time>`;
                }
                gpx += `\n            </trkpt>`;
            });

            gpx += `\n        </trkseg>\n    </trk>`;
        });

        gpx += `\n</gpx>`;
        return gpx;
    }
});