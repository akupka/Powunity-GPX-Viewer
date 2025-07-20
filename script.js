document.addEventListener('DOMContentLoaded', () => {
    const apiTokenInput = document.getElementById('apiToken');
    const deviceIdInput = document.getElementById('deviceId');
    const importButton = document.getElementById('importButton');
    const importStatus = document.getElementById('importStatus');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const showRoutesButton = document.getElementById('showRoutesButton');
    const map = L.map('map').setView([51.505, -0.09], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let trackLayer = null;

    // --- Event Listeners ---

    importButton.addEventListener('click', async () => {
        const apiToken = apiTokenInput.value;
        const deviceId = deviceIdInput.value;

        if (!apiToken || !deviceId) {
            alert('Please provide both an API Token and a Device ID to import data.');
            return;
        }

        importStatus.textContent = 'Import process started. This may take some time. You can check the server console for progress.';
        importStatus.style.color = 'blue';

        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiToken, deviceId }),
            });

            if (response.status === 202) {
                importStatus.textContent = 'Import started successfully. Check the server console for progress.';
            } else {
                const errorText = await response.text();
                throw new Error(errorText);
            }
        } catch (error) {
            console.error('Error starting import:', error);
            importStatus.textContent = `Error: ${error.message}`;
            importStatus.style.color = 'red';
        }
    });

    showRoutesButton.addEventListener('click', async () => {
        const from = startDateInput.value;
        const to = endDateInput.value;

        if (!from || !to) {
            alert('Please select a start and end date.');
            return;
        }

        try {
            const response = await fetch(`/api/trips?from=${from}&to=${to}`);
            if (!response.ok) {
                throw new Error('Failed to fetch trips from the server.');
            }
            const trips = await response.json();
            drawTracks(trips);
        } catch (error) {
            console.error('Error fetching trips:', error);
            alert(error.message);
        }
    });

    // --- Map Drawing ---

    function clearMap() {
        if (trackLayer) {
            map.removeLayer(trackLayer);
        }
        trackLayer = null;
    }

    function drawTracks(trips) {
        clearMap();
        if (!trips || trips.length === 0) {
            alert('No tracks found for the selected period.');
            return;
        }

        const allPolylines = [];
        trips.forEach(trip => {
            if (trip.positions && trip.positions.length > 1) {
                for (let i = 0; i < trip.positions.length - 1; i++) {
                    const startPoint = trip.positions[i];
                    const endPoint = trip.positions[i + 1];
                    const speed = endPoint.speed;

                    const color = getSpeedColor(speed);
                    const line = L.polyline([
                        [startPoint.latitude, startPoint.longitude],
                        [endPoint.latitude, endPoint.longitude]
                    ], { color: color, weight: 5 });
                    allPolylines.push(line);
                }
            }
        });

        if (allPolylines.length > 0) {
            trackLayer = L.featureGroup(allPolylines).addTo(map);
            map.fitBounds(trackLayer.getBounds());
        } else {
            alert('No position data found for the tracks in this period.');
        }
    }

    function getSpeedColor(speed) {
        const maxSpeed = 40; // km/h
        const normalizedSpeed = Math.min(speed, maxSpeed) / maxSpeed;

        if (normalizedSpeed < 0.5) {
            const green = normalizedSpeed * 2 * 255;
            const blue = 255 - (normalizedSpeed * 2 * 255);
            return `rgb(0, ${Math.round(green)}, ${Math.round(blue)})`;
        } else {
            const red = (normalizedSpeed - 0.5) * 2 * 255;
            const green = 255 - ((normalizedSpeed - 0.5) * 2 * 255);
            return `rgb(${Math.round(red)}, ${Math.round(green)}, 0)`;
        }
    }
});