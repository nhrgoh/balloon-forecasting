import { promises as fs } from 'fs';
import path from 'path';

// Cache file path
const CACHE_FILE = path.join(process.cwd(), 'data-cache.json');

// Validate a single balloon coordinate
function isValidCoordinate(coord) {
    return Array.isArray(coord) &&
        coord.length === 3 &&
        coord.every(num => typeof num === 'number') &&
        !coord.some(num => Number.isNaN(num)) &&
        !(coord[0] === 0 && coord[1] === 0 && coord[2] === 0);
}

// Clean and parse JSON data
function parseData(text) {
    try {
        // Handle empty or invalid input
        if (!text || text.trim() === '') return null;

        // Clean the text
        let cleaned = text
            .replace(/NaN/g, '0')
            .replace(/\]\s*,\s*\]/g, ']]')
            .trim();

        // Ensure proper array brackets
        if (!cleaned.startsWith('[')) cleaned = '[' + cleaned;
        if (!cleaned.endsWith(']')) cleaned = cleaned + ']';

        // Parse and validate
        const data = JSON.parse(cleaned);
        return Array.isArray(data) ? data : null;
    } catch (e) {
        console.error('Parse error:', e);
        return null;
    }
}

async function fetchHourData(hour) {
    try {
        const response = await fetch(
            `https://a.windbornesystems.com/treasure/${hour.toString().padStart(2, '0')}.json`,
            { timeout: 5000 } // 5 second timeout
        );

        if (!response.ok) return null;

        const text = await response.text();
        return parseData(text);
    } catch (e) {
        console.error(`Error fetching hour ${hour}:`, e);
        return null;
    }
}

export default async function handler(req, res) {
    try {
        // Try to read from cache first
        try {
            const cached = await fs.readFile(CACHE_FILE, 'utf8');
            const data = JSON.parse(cached);
            if (data && Array.isArray(data) && data.length === 24) {
                console.log('Serving from cache');
                return res.status(200).json(data);
            }
        } catch (e) {
            console.log('No valid cache found');
        }

        // Fetch all hours in parallel
        const fetchPromises = Array.from({ length: 24 }, (_, i) => fetchHourData(i));
        const hourlyData = await Promise.all(fetchPromises);

        // Process and validate the data
        let lastValidPositions = [];
        const processedData = hourlyData.map((hourData, hourIndex) => {
            if (!hourData || !Array.isArray(hourData)) {
                console.log(`Hour ${hourIndex}: Using last known positions`);
                return [...lastValidPositions];
            }

            // Extend hourData if needed
            while (hourData.length < lastValidPositions.length) {
                hourData.push(lastValidPositions[hourData.length]);
            }

            // Process each balloon position
            const processed = hourData.map((coord, balloonIndex) => {
                if (!Array.isArray(coord)) {
                    return lastValidPositions[balloonIndex] || [0, 0, 0];
                }

                // Clean coordinate
                const cleanCoord = coord.map((val, i) => {
                    const num = Number(val);
                    return Number.isNaN(num) ?
                        (lastValidPositions[balloonIndex]?.[i] || 0) :
                        num;
                });

                if (isValidCoordinate(cleanCoord)) {
                    lastValidPositions[balloonIndex] = cleanCoord;
                    return cleanCoord;
                }

                return lastValidPositions[balloonIndex] || [0, 0, 0];
            });

            lastValidPositions = [...processed];
            return processed;
        });

        // Cache the result
        try {
            await fs.writeFile(CACHE_FILE, JSON.stringify(processedData));
        } catch (e) {
            console.error('Cache write error:', e);
        }

        res.status(200).json(processedData);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
}