// services/weatherForecast.js

function calculateNewPosition(lat, lon, windSpeed, windDeg) {
    // Convert wind speed from m/s to degrees of movement per hour
    // This is a simplified model where 1 m/s wind = ~0.036 degrees movement per hour at equator
    // Adjust this factor based on actual balloon behavior
    const moveSpeed = windSpeed * 0.0036;

    // Convert wind direction from meteorological (where wind comes from)
    // to mathematical (where wind goes to)
    const windRadians = ((windDeg + 180) % 360) * (Math.PI / 180);

    // Calculate movement components
    const latChange = moveSpeed * Math.cos(windRadians);
    const lonChange = moveSpeed * Math.sin(windRadians);

    return {
        latitude: lat + latChange,
        longitude: lon + lonChange
    };
}

export async function getForecastPath(lat, lon, altitude) {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_WEATHER_API_BASE_URL}/forecast?` +
            `lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHERMAP_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }

        const data = await response.json();

        // Get current time
        const now = Math.floor(Date.now() / 1000);

        // Filter and sort the next 5 hours of forecasts
        const forecasts = data.list
            .filter(item => item.dt > now)
            .sort((a, b) => a.dt - b.dt)
            .slice(0, 5);

        if (forecasts.length === 0) {
            console.error('No forecast data available');
            return null;
        }

        // Calculate predicted positions
        let currentLat = lat;
        let currentLon = lon;
        const forecastPath = [{
            latitude: lat,
            longitude: lon,
            altitude,
            hour: 0,
            isForecast: false // Current position
        }];

        for (let i = 0; i < forecasts.length; i++) {
            const forecast = forecasts[i];
            const { wind } = forecast;

            console.log(`Wind forecast for hour ${i + 1}:`, {
                speed: wind.speed,
                degree: wind.deg,
                timestamp: new Date(forecast.dt * 1000).toISOString()
            });

            const newPosition = calculateNewPosition(
                currentLat,
                currentLon,
                wind.speed,
                wind.deg
            );

            newPosition.altitude = altitude;
            newPosition.hour = i + 1;
            newPosition.isForecast = true;

            forecastPath.push(newPosition);
            currentLat = newPosition.latitude;
            currentLon = newPosition.longitude;
        }

        console.log('Generated forecast path:', forecastPath);
        return forecastPath;

    } catch (error) {
        console.error('Error fetching weather forecast:', error);
        return null;
    }
}