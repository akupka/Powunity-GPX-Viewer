# Powunity GPX Viewer

## Project Description

This project aims to create a web application that retrieves GPX tracking data from the Powunity API. The retrieved routes are then visualized on an interactive OpenStreetMap, allowing users to view their recorded bike tracks.

## Features

-   **Session Login:** Users authenticate with an API token to establish a session.
-   **User & Device Information:** Displays authenticated user's email and name, along with a list of available devices.
-   **Battery Level Display:** Shows the battery level of the selected device (if available in API data).
-   **Route Retrieval:** The application fetches available routes (trips) for a selected device and date range.
-   **Interactive Map:** Integrates Leaflet.js to display OpenStreetMap.
-   **Single Route Visualization:** Allows selecting and displaying a single GPX route on the map.
-   **Multiple Routes Visualization:** Allows displaying all available GPX routes for a selected period on the map.
-   **Total Distance Display:** Shows the aggregated distance for all routes within the selected date range.
-   **GPX Data Parsing:** Converts JSON position data from the API into GPX XML format for map display.
-   **Error Handling:** Basic error handling for API requests and data processing.

## Tech Stack

-   **Languages:** HTML, CSS, JavaScript
-   **Libraries:**
    -   **Leaflet.js:** For interactive OpenStreetMap display.
    -   **Leaflet-GPX:** A Leaflet plugin for parsing and displaying GPX data.
    -   **Fetch API (Native Browser):** For communication with the Powunity API.
-   **Tools:** A simple local web server (e.g., `npx http-server` for development).

## Setup Instructions

To set up and run this application locally, follow these steps:

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd powunity-gpx-viewer # Or whatever your project directory is named
    ```

2.  **Install a Local Web Server (if you don't have one):**
    This application requires a web server to run due to browser security restrictions (e.g., fetching local files and making API requests). If you have Node.js installed, `http-server` is a simple option:
    ```bash
    npm install -g http-server
    # Or using npx without global installation:
    # npx http-server
    ```

3.  **Run the Application:**
    Navigate to your project directory in the terminal and start the web server:
    ```bash
    npx http-server
    ```
    The server will usually start on `http://localhost:8080`. Open this URL in your web browser.

## Usage

1.  **Obtain API Token and Device ID:**
    You will need an API token and your device ID from your Powunity account. This application uses the `/session?token={your_token}` endpoint for authentication and relies on session cookies for subsequent API calls.
    You will find this in the Powunity App Settings->Advanced

2.  **Login:**
    *   Enter your **API Token** into the "API Token" input field.
    *   Click the **"Login"** button.
    *   Upon successful login, your user information (Name, Email) and the battery level of your device (if available) will be displayed. The "Device ID" dropdown will be populated with your available devices, and the "Route Laden" and "Alle Routen anzeigen" buttons will become active.

3.  **Select Device and Date Range:**
    *   Choose your **Device ID** from the dropdown menu.
    *   Select a **Start Datum** (Start Date) and **End Datum** (End Date) for the period you want to view routes.

4.  **Load Single Route:**
    *   After selecting a device and date range, the "Route auswählen" (Select Route) dropdown will be populated with individual trips found for that period.
    *   Select a specific **Route** from the dropdown.
    *   Click the **"Route Laden"** (Load Route) button to display that single route on the map.

5.  **Load All Routes:**
    *   After selecting a device and date range, click the **"Alle Routen anzeigen"** (Show All Routes) button.
    *   This will fetch and display all available routes for the selected period on the map as multiple tracks.

6.  **View Route Summary:**
    *   The "Routenübersicht" (Route Summary) section will display the "Gesamtstrecke" (Total Distance) in kilometers for the selected device and date range.

## Important Notes

*   **API Authentication:** The application uses a session token for authentication. Ensure your token has the necessary permissions to access device and position data.
*   **Browser Cache:** If you make changes to the code and they don't appear in your browser, perform a hard refresh (`Ctrl + F5` or `Cmd + Shift + R`) or clear your browser's cache.
*   **Placeholder Images:** The map markers use simple SVG placeholder images (`images/pin-icon-start.png`, `images/pin-icon-end.png`, `images/pin-shadow.png`). You can replace these with custom images if desired.
