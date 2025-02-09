import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Three.js components with no SSR
const ThreeComponents = dynamic(() =>
        import('./ThreeComponents').then((mod) => mod.default),
    { ssr: false }
);

const BalloonGlobe = () => {
  const [balloonData, setBalloonData] = useState([]);
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBalloonData = async () => {
      try {
        setIsLoading(true);
        // Fetch from your API endpoint
        const response = await fetch('/api/balloons');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const hourlyData = await response.json();

        console.log("Loaded hourly data:", hourlyData.length, "hours");

        // Get the first hour with valid data
        const firstHourData = hourlyData.find(hour =>
            Array.isArray(hour) && hour.length > 0 &&
            hour.some(coord => coord[0] !== 0 || coord[1] !== 0 || coord[2] !== 0)
        ) || hourlyData[0];

        console.log("First hour balloon count:", firstHourData?.length || 0);

        // Format the data for display, filtering out invalid coordinates
        const formattedData = firstHourData.filter(balloon =>
            Array.isArray(balloon) && balloon.length === 3 &&
            (balloon[0] !== 0 || balloon[1] !== 0 || balloon[2] !== 0)
        ).map((balloon, index) => ({
          id: index,
          latitude: balloon[0],
          longitude: balloon[1],
          altitude: balloon[2],
          color: `hsl(${(index * 30) % 360}, 70%, 50%)`
        }));

        console.log("Formatted balloon data:", formattedData.length);
        setBalloonData(formattedData);
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

  return (
      <div className="relative w-full h-screen">
        <div className="absolute w-full h-full">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
              <div className="text-xl">Loading Globe...</div>
            </div>
          }>
            <ThreeComponents balloonData={balloonData} />
          </Suspense>
        </div>

        <div className="absolute bottom-4 left-4 text-white z-10">
          <div className="text-sm mb-2">
            Hour: {currentHour.toString().padStart(2, '0')}:00 UTC |
            Tracking {balloonData.length} balloons
          </div>
          <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>
  );
};

export default BalloonGlobe;