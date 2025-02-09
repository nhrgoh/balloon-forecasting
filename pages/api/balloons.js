const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Try to fix and parse malformed JSON
function tryParseJSON(text) {
    try {
        // First try direct parse
        let parsed = JSON.parse(text);
        // Replace any NaN values with 0
        if (Array.isArray(parsed)) {
            parsed = parsed.map(coord => {
                if (Array.isArray(coord)) {
                    return coord.map(val => (Number.isNaN(val) ? 0 : val));
                }
                return coord;
            });
        }
        return parsed;
    } catch (e) {
        try {
            // Clean up the text and try to fix common issues
            let cleaned = text.trim()
                // Replace NaN with 0 in the raw text
                .replace(/NaN/g, '0');

            // If it ends with a comma, remove it and add closing bracket
            if (cleaned.endsWith(',')) {
                cleaned = cleaned.slice(0, -1) + ']';
            }

            // If it's missing the outer brackets, add them
            if (!cleaned.startsWith('[')) cleaned = '[' + cleaned;
            if (!cleaned.endsWith(']')) cleaned = cleaned + ']';

            // Try to parse the cleaned version
            return JSON.parse(cleaned);
        } catch (e2) {
            console.error('Failed to parse even after cleaning:', e2);
            return null;
        }
    }
}

// Validate a single balloon coordinate
function isValidCoordinate(coord) {
    return Array.isArray(coord) &&
        coord.length === 3 &&
        coord.every(num => typeof num === 'number') &&
        // Check if it's not [0,0,0] which indicates a missing balloon
        !(coord[0] === 0 && coord[1] === 0 && coord[2] === 0) &&
        // Check for NaN values
        !coord.some(num => Number.isNaN(num));
}

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url);
            if (response.status === 404) {
                console.log(`404 error for ${url}, treating as empty data`);
                return [];
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            const data = tryParseJSON(text);

            if (!data) {
                throw new Error('Failed to parse JSON');
            }

            return data;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === retries - 1) throw error;
            await delay(1000 * (i + 1));
        }
    }
}

export default async function handler(req, res) {
    try {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const results = [];
        let lastValidBalloonPositions = [];  // Keep track of last known positions

        for (const hour of hours) {
            const paddedHour = hour.toString().padStart(2, '0');
            try {
                console.log(`Fetching hour ${paddedHour}...`);
                let hourData = await fetchWithRetry(
                    `https://a.windbornesystems.com/treasure/${paddedHour}.json`
                );

                // If this is the first hour with data, use it to initialize lastValidBalloonPositions
                if (lastValidBalloonPositions.length === 0 && Array.isArray(hourData) && hourData.length > 0) {
                    lastValidBalloonPositions = hourData.map(coord => {
                        if (isValidCoordinate(coord)) return coord;
                        // Replace any NaN values with 0
                        return coord.map(val => Number.isNaN(val) ? 0 : val);
                    });
                }

                // Process each balloon position
                if (Array.isArray(hourData)) {
                    // If we have fewer balloons than before, extend with last known positions
                    while (hourData.length < lastValidBalloonPositions.length) {
                        hourData.push(lastValidBalloonPositions[hourData.length]);
                    }

                    // Update positions, keeping last known good position for invalid ones
                    hourData = hourData.map((coord, index) => {
                        // First, replace any NaN values with corresponding values from last known position
                        const processedCoord = coord.map((val, i) =>
                            Number.isNaN(val) ?
                                (lastValidBalloonPositions[index] ? lastValidBalloonPositions[index][i] : 0) :
                                val
                        );

                        if (isValidCoordinate(processedCoord)) {
                            lastValidBalloonPositions[index] = processedCoord;
                            return processedCoord;
                        }
                        return lastValidBalloonPositions[index] || [0, 0, 0];
                    });

                    results.push(hourData);
                    console.log(`Successfully processed hour ${paddedHour} with ${hourData.length} balloons`);
                } else {
                    // If hourData isn't an array, use last known positions
                    results.push([...lastValidBalloonPositions]);
                    console.log(`Using last known positions for hour ${paddedHour}`);
                }
            } catch (error) {
                console.error(`Error processing hour ${paddedHour}:`, error);
                // Use last known positions for this hour
                results.push([...lastValidBalloonPositions]);
            }
            await delay(100);
        }

        if (results.length === 0) {
            throw new Error('No valid data could be retrieved');
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
}