import { parseGpxToLatLng } from '../gpxUtils.js';
import fs from 'node:fs';
import path from 'node:path';

/* Dummy-GPX aus der Powunity-Snippet-Sammlung einlesen */
const sampleGpx = fs.readFileSync(
  path.resolve(__dirname, 'fixtures/shortTrack.gpx'),
  'utf8'
);

describe('GPX-Parsing', () => {
  it('extrahiert Trackpunkte als [lat, lon]', () => {
    const coords = parseGpxToLatLng(sampleGpx);
    expect(coords.length).toBeGreaterThan(0);
    expect(coords[0]).toHaveLength(2);
  });
});
