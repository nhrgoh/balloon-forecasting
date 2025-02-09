import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { getForecastPath } from '../services/weatherForecast';

const ThreeComponents = dynamic(() =>
        import('./ThreeComponents').then((mod) => mod.default),
    { ssr: false }
);

// Maximum number of balloons to display
const MAX_BALLOONS = 50;

const BalloonGlobe = () => {
    const [allBalloonData, setAllBalloonData] = useState([]);
    const [currentHour, setCurrentHour] = useState(0); // Start at oldest data point (23.json)
    const [isPlaying, setIsPlaying] = useState(true);
    const TOTAL_HOURS = 29; // 24 past hours + 5 forecast hours
    const [isAutoRotating, setIsAutoRotating] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [forecastPaths, setForecastPaths] = useState([]);

    useEffect(() => {
        const loadBalloonData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/balloons');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const hourlyData = await response.json();

                // Process data to ensure correct ordering (23.json first, 00.json last)
                const formattedData = [...hourlyData].reverse().map((hourData, hour) =>
                    hourData.slice(0, MAX_BALLOONS).map((balloon, index) => ({
                        id: index,
                        latitude: balloon[0],
                        longitude: balloon[1],
                        altitude: balloon[2],
                        hour: 23 - hour, // Reverse the hour count
                        color: '#00ff00' // Fixed green color for all balloons
                    }))
                );

                setAllBalloonData(formattedData);
                setError(null);
            } catch (error) {
                console.error('Error loading balloon data:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        loadBalloonData();
    }, []);

    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setCurrentHour((prev) => (prev + 1) % TOTAL_HOURS);
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying]);

    // Fetch forecast paths when current hour changes
    useEffect(() => {
        const fetchForecasts = async () => {
            if (currentHour === 23 && allBalloonData.length > 0) {
                const currentPositions = allBalloonData[23]; // Get positions from 00.json (last in array)
                const forecasts = await Promise.all(
                    currentPositions.map(balloon =>
                        getForecastPath(
                            balloon.latitude,
                            balloon.longitude,
                            balloon.altitude
                        )
                    )
                );
                setForecastPaths(forecasts.filter(Boolean));
            }
        };

        fetchForecasts();
    }, [currentHour, allBalloonData]);

    if (error) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-center">
                    <div className="text-xl mb-4">Error Loading Data</div>
                    <div className="text-sm text-red-400">{error}</div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
                <div className="text-xl">Loading Balloon Data...</div>
            </div>
        );
    }

    // Get current time in UTC
    const now = new Date();
    const currentUTCHour = now.getUTCHours();

    // Calculate the displayed hour based on slider position
    let displayedHour;
    if (currentHour <= 23) {
        // For historical data
        displayedHour = (currentUTCHour - (23 - currentHour) + 24) % 24;
    } else {
        // For forecast data
        displayedHour = (currentUTCHour + (currentHour - 23)) % 24;
    }

    let currentBalloons = [];
    let balloonPaths = [];

    // Handle display of historical data (hours 0 to 23)
    if (currentHour <= 23) {
        currentBalloons = allBalloonData[currentHour] || [];
        currentBalloons = currentBalloons.map(balloon => ({
            ...balloon,
            color: '#00ff00', // Green for historical data
            isForecast: false
        }));

        // Get historical paths up to current hour
        balloonPaths = currentBalloons.map((balloon, index) => {
            const historicalPath = allBalloonData
                .slice(0, currentHour + 1)  // Take data from start up to current hour
                .map(hourData => ({
                    ...hourData[index],
                    isForecast: false
                }));

            if (currentHour === 23 && forecastPaths[index]) {
                // Add forecast path only when we're at current time (hour 23 is now 00.json)
                return [...historicalPath, ...forecastPaths[index].slice(1)];
            }
            return historicalPath;
        });
    }
    // Handle display of forecast data (hours 24 to 28)
    else {
        const forecastHour = currentHour - 24;

        // Get the entire historical path plus forecast up to current forecast hour
        balloonPaths = allBalloonData[23].map((_, index) => {
            const historicalPath = allBalloonData.map(hourData => ({
                ...hourData[index],
                isForecast: false
            }));

            const forecastPath = (forecastPaths[index] || [])
                .slice(0, forecastHour + 1)
                .map(pos => ({
                    ...pos,
                    isForecast: true
                }));

            return [...historicalPath, ...forecastPath.slice(1)];
        });

        // Current position should be from the forecast data
        currentBalloons = forecastPaths.map((path, index) => {
            const pos = path[forecastHour];
            return pos ? {
                id: index,
                latitude: pos.latitude,
                longitude: pos.longitude,
                altitude: pos.altitude,
                color: '#ff0000', // Red for forecast position
                isForecast: true
            } : null;
        }).filter(Boolean);
    }

    return (
        <div className="relative w-full h-screen">
            <div className="absolute w-full h-full">
                <Suspense fallback={
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
                        <div className="text-xl">Loading Globe...</div>
                    </div>
                }>
                    <ThreeComponents
                        balloonData={currentBalloons}
                        balloonPaths={balloonPaths}
                        forecastPaths={forecastPaths}
                        isAutoRotating={isAutoRotating}
                    />
                </Suspense>
            </div>

            <div className="absolute bottom-4 left-4 text-white z-10">
                <div className="flex flex-col gap-4 bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm">
                        Time: {displayedHour.toString().padStart(2, '0')}:00 UTC {currentHour > 23 ? '(Forecast)' : ''} |
                        Tracking {currentBalloons.length} balloons
                    </div>

                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0"
                            max={TOTAL_HOURS - 1}
                            value={currentHour}
                            onChange={(e) => {
                                setCurrentHour(parseInt(e.target.value));
                                setIsPlaying(false);
                            }}
                            className="w-48"
                        />
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm min-w-[60px]"
                        >
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsAutoRotating(!isAutoRotating)}
                            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                        >
                            {isAutoRotating ? 'Disable Rotation' : 'Enable Rotation'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BalloonGlobe;