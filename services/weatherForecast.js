// services/weatherForecast.js

// Cache object to store forecast data
const forecastCache = new Map();

function calculateNewPosition(lat, lon, windSpeed, windDeg) {
    // Convert wind speed from m/s to degrees of movement per hour
    const moveSpeed = windSpeed * 0.036; // Increased factor for more visible movement

    // Convert wind direction from meteorological to mathematical
    const windRadians = ((windDeg + 180) % 360) * (Math.PI / 180);

    // Calculate movement components
    const latChange = moveSpeed * Math.cos(windRadians);
    const lonChange = moveSpeed * Math.sin(windRadians) / Math.cos(lat * Math.PI / 180);

    return {
        latitude: lat + latChange,
        longitude: lon + lonChange
    };
}

function getCacheKey(lat, lon) {
    return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

async function mockWeatherForecast(lat, lon) {
    console.log('Generating mock weather data for 24 hours');
    const forecasts = [];

    // Generate smoother wind patterns
    let currentSpeed = 5 + Math.random() * 10;
    let currentDeg = Math.random() * 360;

    for (let i = 0; i < 24; i++) {
        // Gradually change wind speed and direction
        currentSpeed += (Math.random() - 0.5) * 2; // Speed changes by ±1 m/s
        currentSpeed = Math.max(2, Math.min(20, currentSpeed)); // Keep between 2-20 m/s

        currentDeg += (Math.random() - 0.5) * 20; // Direction changes by ±10 degrees
        currentDeg = currentDeg % 360;

        forecasts.push({
            dt: Math.floor(Date.now() / 1000) + (i * 3600),
            wind: {
                speed: currentSpeed,
                deg: currentDeg
            }
        });
    }

    console.log('Generated mock forecasts:', forecasts.length);
    return { list: forecasts };
}

export async function getForecastPath(lat, lon, altitude) {
    try {
        console.log('Starting getForecastPath:', { lat, lon, altitude });

        // Check cache first
        const cacheKey = getCacheKey(lat, lon);
        if (forecastCache.has(cacheKey)) {
            console.log('Using cached forecast for:', cacheKey);
            return forecastCache.get(cacheKey);
        }

        let weatherData;
        if (process.env.NEXT_PUBLIC_USE_MOCK_WEATHER === 'true') {
            console.log('Using mock weather data');
            weatherData = await mockWeatherForecast(lat, lon);
        } else {
            const apiKey = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;
            const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&cnt=40`;

            console.log('Fetching from OpenWeatherMap API:', apiUrl);
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            weatherData = await response.json();
        }

        console.log('Weather data received:', {
            dataPoints: weatherData.list.length,
            firstPoint: weatherData.list[0],
            lastPoint: weatherData.list[weatherData.list.length - 1]
        });

        // Calculate forecast positions
        let currentLat = lat;
        let currentLon = lon;
        const forecastPath = [];

        // Add initial position
        forecastPath.push({
            latitude: currentLat,
            longitude: currentLon,
            altitude: altitude,
            hour: 0,
            isForecast: true
        });

        // Process each hour
        for (let hour = 0; hour < 24; hour++) {
            const forecast = weatherData.list[hour] || weatherData.list[weatherData.list.length - 1];
            const wind = forecast.wind;

            console.log(`Hour ${hour} wind data:`, {
                speed: wind.speed,
                direction: wind.deg,
                currentPosition: { lat: currentLat, lon: currentLon }
            });

            const newPosition = calculateNewPosition(currentLat, currentLon, wind.speed, wind.deg);
            currentLat = newPosition.latitude;
            currentLon = newPosition.longitude;

            forecastPath.push({
                latitude: currentLat,
                longitude: currentLon,
                altitude: altitude,
                hour: hour + 1,
                isForecast: true
            });
        }

        console.log('Generated forecast path:', {
            points: forecastPath.length,
            start: forecastPath[0],
            end: forecastPath[forecastPath.length - 1]
        });

        // Cache the result
        forecastCache.set(cacheKey, forecastPath);
        return forecastPath;

    } catch (error) {
        console.error('Error in getForecastPath:', error);
        return null;
    }
}