# Powunity GPX Viewer

## Project Description

This project is a web application for fetching, storing, and visualizing GPX tracking data from the Powunity API. It uses a Node.js backend to import all historical track data into a local SQLite database. The frontend then displays these tracks on an interactive OpenStreetMap, color-coding the route based on the recorded speed.

## Features

-   **Local Data Persistence:** Imports all track data from the Powunity API into a local SQLite database, ensuring you have a permanent, local copy of your data.
-   **Incremental Imports:** The import process checks for existing trips and only fetches new data, preventing duplicates.
-   **Client-Server Architecture:** A Node.js and Express backend serves the data and the frontend application.
-   **Date Range Selection:** Users can select a date range to view specific tracks from the local database.
-   **Speed-Based Visualization:** Routes on the map are color-coded based on speed, with a legend indicating slow (blue) to fast (red) segments.

## Tech Stack

-   **Backend:**
    -   Node.js
    -   Express.js
    -   node-fetch
    -   SQLite3 (for the database)
-   **Frontend:**
    -   HTML, CSS, JavaScript
    -   Leaflet.js
-   **Database:**
    -   SQLite

## How to Use This Application

Follow these steps to get the application running and view your tracks.

### Step 1: Initial Setup

First, you need to get the application running on your local machine.

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd Powunity-GPX-Viewer
    ```

2.  **Install Dependencies:**
    This project uses Node.js for its backend. You must have Node.js and npm installed. Run the following command in the project root to install the necessary packages:
    ```bash
    npm install
    ```

3.  **Run the Backend Server:**
    Start the local server from your terminal:
    ```bash
    node server.js
    ```

4.  **Open the Application:**
    Navigate to `http://localhost:3000` in your web browser. The server will automatically serve the `index.html` page.

### Step 2: Import Your Tracking Data

Before you can see any tracks, you must import them from the Powunity API into your local database.

1.  **Get Your Credentials:**
    You will need your **API Token** and **Device ID** from your Powunity account. You can find these in the Powunity App under `Settings -> Advanced`.

2.  **Start the Import:**
    *   On the webpage, enter your token and ID into the corresponding input fields.
    *   Click the **"Daten importieren / aktualisieren"** (Import/Update Data) button.

3.  **Wait for the Import to Finish:**
    *   The import process will begin in the background. You can monitor the progress in the terminal where the server is running.
    *   **Note:** The very first import may take a long time, as it fetches all your data since 2015. Subsequent imports will be much faster because the application will only fetch new, previously un-imported tracks.

### Step 3: View Your Tracks

Once the import is complete, you can view your tracks on the map.

1.  **Select a Date Range:**
    *   Choose a **Start Datum** (Start Date) and **End Datum** (End Date) for the period you want to view.

2.  **Display Routes:**
    *   Click the **"Routen anzeigen"** (Show Routes) button.
    *   The tracks for the selected period will be fetched from your local database and displayed on the map, with the path colored according to speed.

---

## How Speed is Calculated

The speed for each track segment is not provided by the Powunity API. It is calculated by the application during the import process. Here’s how it works:

For any two consecutive points in a track:

1.  **Calculate Distance:** The script uses the **Haversine formula** to calculate the great-circle distance (the shortest distance over the earth’s surface) between the two points' latitude and longitude coordinates.
2.  **Calculate Time:** It finds the time difference in seconds between the timestamps of the two points.
3.  **Calculate Speed:** Speed is calculated by dividing the distance (in meters) by the time difference (in seconds). The result is then converted from meters per second to kilometers per hour (km/h) and stored in the database alongside the position data.

This speed value is then used to color the track on the map, providing a visual representation of your speed at different points along the route.
