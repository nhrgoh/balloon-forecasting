import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';

const ThreeComponents = dynamic(() =>
        import('./ThreeComponents').then((mod) => mod.default),
    { ssr: false }
);

const BalloonGlobe = () => {
    const [allBalloonData, setAllBalloonData] = useState([]);
    const [currentHour, setCurrentHour] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isAutoRotating, setIsAutoRotating] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadBalloonData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/balloons');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const hourlyData = await response.json();

                const formattedData = hourlyData.map((hourData, hour) =>
                    hourData.map((balloon, index) => ({
                        id: index,
                        latitude: balloon[0],
                        longitude: balloon[1],
                        altitude: balloon[2],
                        hour: hour,
                        color: `hsl(${(index * 30) % 360}, 70%, 50%)`
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
            setCurrentHour((prev) => (prev + 1) % 24);
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying]);

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

    const currentBalloons = allBalloonData[currentHour] || [];
    const balloonPaths = currentBalloons.map((balloon, index) => {
        return allBalloonData
            .slice(0, currentHour + 1)
            .map(hourData => hourData[index]);
    });

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
                        isAutoRotating={isAutoRotating}
                    />
                </Suspense>
            </div>

            <div className="absolute bottom-4 left-4 text-white z-10">
                <div className="flex flex-col gap-4 bg-gray-800 p-4 rounded-lg">
                    <div className="text-sm">
                        Hour: {currentHour.toString().padStart(2, '0')}:00 UTC |
                        Tracking {currentBalloons.length} balloons
                    </div>

                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0"
                            max="23"
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