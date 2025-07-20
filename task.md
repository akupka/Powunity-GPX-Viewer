# Task: Erweiterung zur Speicherung aller GPX-Daten

Dieses Dokument beschreibt die Planung für die Erweiterung des Projekts, um einen einmaligen Export und die lokale Speicherung aller GPX-Routen zu ermöglichen.

## 1. Speichermethode für GPX-Daten

Um alle GPX-Daten seit 2015 zu speichern, muss eine geeignete Methode gewählt werden. Hier sind zwei Optionen mit einer klaren Empfehlung:

### Option A: Flat Files (Empfohlen)

Bei diesem Ansatz wird für jede einzelne Route eine separate `.gpx`-Datei auf dem lokalen Rechner gespeichert.

*   **Vorteile:**
    *   **Einfache Umsetzung:** Die bestehende `generateGpx`-Funktion kann wiederverwendet werden. Es ist keine neue Server-Infrastruktur nötig.
    *   **Keine Abhängigkeiten:** Das Projekt bleibt eine reine Frontend-Anwendung (HTML/CSS/JS). Es wird keine Datenbank-Software benötigt.
    *   **Portabilität:** Die `.gpx`-Dateien sind ein Standardformat und können einfach geteilt, gesichert oder in anderen GIS-Anwendungen geöffnet werden.
    *   **Geringer Aufwand:** Dies ist die schnellste und einfachste Methode, um das Ziel zu erreichen.

*   **Nachteile:**
    *   **Massen-Analyse:** Das Analysieren von Daten über tausende von Dateien hinweg (z.B. "Gesamtdistanz im Jahr 2018") wäre langsam, da jede Datei einzeln gelesen und verarbeitet werden müsste.

### Option B: Datenbank (z.B. SQLite)

Bei diesem Ansatz werden alle Punkte (Koordinaten, Zeitstempel etc.) in einer Datenbank-Tabelle gespeichert.

*   **Vorteile:**
    *   **Effiziente Abfragen:** Komplexe Abfragen und Aggregationen (z.B. "alle Routen im Winter", "längste Route") sind sehr schnell möglich.
    *   **Skalierbarkeit:** Eignet sich gut für sehr große Datenmengen.

*   **Nachteile:**
    *   **Hohe Komplexität:** Benötigt eine Backend-Komponente (z.B. mit Node.js oder Python), die als Server fungiert und die Datenbank verwaltet. Dies würde die Architektur des Projekts grundlegend verändern.
    *   **Zusätzliche Abhängigkeiten:** Erfordert die Einrichtung und Wartung einer Datenbank.

**Empfehlung:** Für den aktuellen Anwendungsfall ist die Speicherung als **Flat Files (`.gpx`)** die mit Abstand beste Lösung. Sie passt zur bestehenden Architektur und erfüllt die Anforderung mit minimalem Aufwand.

## 2. Vorgehensweise für den Massen-Download

Da die API nur Abfragen von maximal 6 Monaten erlaubt, muss der Download-Prozess in Schleifen erfolgen.

1.  **Start- und Enddatum festlegen:** Das Startdatum wäre z.B. der 01.01.2015, das Enddatum wäre das heutige Datum.
2.  **Schleife implementieren:** Eine Schleife iteriert in 6-Monats-Schritten vom Start- bis zum Enddatum.
3.  **Routen abrufen:** In jedem Schleifendurchlauf wird der API-Endpunkt `/api/reports/trips` für den jeweiligen 6-Monats-Zeitraum aufgerufen, um alle Routen (Trips) zu erhalten.
4.  **Positionsdaten abrufen:** Für jede einzelne Route wird der API-Endpunkt `/api/positions` mit der exakten Start- und Endzeit der Route aufgerufen.
5.  **GPX generieren und speichern:**
    *   Die erhaltenen Positionsdaten werden mit der `generateGpx`-Funktion in das GPX-Format umgewandelt.
    *   Da ein direkter Zugriff auf das Dateisystem aus dem Browser nicht möglich ist, wird für jede generierte Route ein **automatischer Download** ausgelöst. Der Benutzer muss die Dateien dann in einem lokalen Ordner speichern.
    *   Der Dateiname könnte sich aus Datum und Uhrzeit der Route zusammensetzen, um Eindeutigkeit zu gewährleisten (z.B. `Route_2023-10-26_14-30-00.gpx`).

## 3. Inhalt der GPX-Dateien

Basierend auf der Funktion `generateGpx` in `script.js` enthalten die generierten GPX-Dateien die folgenden Informationen:

*   **Pro Track (`<trk>`):**
    *   `<name>`: Ein generierter Name für die Route, der Start- und Enddatum sowie die Uhrzeit enthält.
        *   Beispiel: `Route 1 (26.10.2023 14:30:00 - 26.10.2023 15:45:00)`

*   **Pro Track-Punkt (`<trkpt>`):**
    *   `lat`: Die geografische Breite (Latitude).
    *   `lon`: Die geografische Länge (Longitude).
    *   `<ele>`: Die Höhe (Elevation/Altitude), falls in den Positionsdaten vorhanden.
    *   `<time>`: Der exakte Zeitstempel des Punkts (`fixTime` aus der API).

Andere mögliche, aber aktuell **nicht** genutzte Informationen aus der API oder dem GPX-Standard (wie z.B. Geschwindigkeit, Genauigkeit, Satellitenanzahl) werden nicht in die Datei geschrieben.
