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
    const [currentHour, setCurrentHour] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const TOTAL_HOURS = 48; // 24 past hours + 24 forecast hours
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
                        hour: 23 - hour,
                        color: '#00ff00'
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

    // Fetch forecast paths when reaching current time or if they're not available
    useEffect(() => {
        const fetchForecasts = async () => {
            if ((currentHour === 23 || (currentHour > 23 && forecastPaths.length === 0)) && allBalloonData.length > 0) {
                console.log('Fetching forecasts for current positions...');
                const currentPositions = allBalloonData[23];

                const forecasts = await Promise.all(
                    currentPositions.map(async (balloon, index) => {
                        const path = await getForecastPath(
                            balloon.latitude,
                            balloon.longitude,
                            balloon.altitude
                        );
                        if (!path) {
                            console.warn(`Failed to get forecast path for balloon ${index}`);
                            return null;
                        }
                        return path;
                    })
                );

                const validForecasts = forecasts.filter(Boolean);
                setForecastPaths(validForecasts);
            }
        };

        fetchForecasts();
    }, [currentHour, allBalloonData, forecastPaths.length]);

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
        displayedHour = (currentUTCHour - (23 - currentHour) + 24) % 24;
    } else {
        displayedHour = (currentUTCHour + (currentHour - 23)) % 24;
    }

    let currentBalloons = [];
    let balloonPaths = [];

    // Handle display of historical data (hours 0 to 23)
    if (currentHour <= 23) {
        currentBalloons = allBalloonData[currentHour] || [];
        currentBalloons = currentBalloons.map(balloon => ({
            ...balloon,
            color: '#00ff00',
            isForecast: false
        }));

        balloonPaths = currentBalloons.map((balloon, index) => {
            const historicalPath = allBalloonData
                .slice(0, currentHour + 1)
                .map(hourData => ({
                    ...hourData[index],
                    isForecast: false
                }));

            if (currentHour === 23 && forecastPaths[index]) {
                return [...historicalPath, forecastPaths[index][0]];
            }
            return historicalPath;
        });
    }
    // Handle display of forecast data (hours 24 to 47)
    else {
        const forecastHour = currentHour - 24;

        if (forecastPaths.length === 0) {
            console.log('No forecast paths available, using last known positions');
            currentBalloons = allBalloonData[23].map(balloon => ({
                ...balloon,
                color: '#ff0000',
                isForecast: true
            }));

            balloonPaths = allBalloonData[23].map((_, index) => {
                return allBalloonData.map(hourData => ({
                    ...hourData[index],
                    isForecast: false
                }));
            });

            const currentPositions = allBalloonData[23];
            currentPositions.forEach(async (balloon, index) => {
                const path = await getForecastPath(
                    balloon.latitude,
                    balloon.longitude,
                    balloon.altitude
                );
                if (path) {
                    setForecastPaths(prev => {
                        const newPaths = [...prev];
                        newPaths[index] = path;
                        return newPaths;
                    });
                }
            });
        } else {
            balloonPaths = allBalloonData[23].map((_, index) => {
                const historicalPath = allBalloonData.map(hourData => ({
                    ...hourData[index],
                    isForecast: false
                }));

                const forecastPath = forecastPaths[index] || [];
                const currentForecast = forecastPath.slice(0, forecastHour + 1).map(pos => ({
                    ...pos,
                    isForecast: true
                }));

                return [...historicalPath, ...currentForecast];
            });

            currentBalloons = forecastPaths.map((path, index) => {
                if (!path || !path[forecastHour]) {
                    return null;
                }

                const pos = path[forecastHour];

                return {
                    id: index,
                    latitude: pos.latitude,
                    longitude: pos.longitude,
                    altitude: pos.altitude,
                    color: '#ff0000',
                    isForecast: true
                };
            }).filter(Boolean);
        }
    }

    return (
        <div className="relative w-full h-screen">
            {/* Title and Description */}
            <div className="absolute top-4 left-0 right-0 z-10 text-center text-white">
                <h1 className="text-3xl font-bold mb-2">Global Balloon Tracker</h1>
                <p className="text-lg text-gray-300">Real-time tracking and forecasting of high-altitude balloons</p>
            </div>
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

            {/* Footnotes Box */}
            <div className="absolute bottom-4 right-4 text-white z-10">
                <div className="flex flex-col gap-2 bg-gray-800 bg-opacity-80 p-4 rounded-lg max-w-xs">
                    <div className="text-xs">
                        <p>• Limited to 50 balloons because of weather API limits</p>
                        <p>• Forecasts use OpenWeather wind data for trajectory prediction</p>
                        <p>• Green paths: historical data</p>
                        <p>• Red paths: forecasted positions</p>
                        <p>• Heights are not to scale</p>
                        <p>See more: <a href="https://github.com/nhrgoh/balloon-forecasting"
                                        className="text-blue-600 underline hover:text-blue-800">Balloon Forecasting</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BalloonGlobe;