import React, { useState, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker
} from "react-simple-maps";

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

const BalloonGlobe = () => {
  const [balloonPaths, setBalloonPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/balloons');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch data');
        }
        const allData = await response.json();

        // Validate data structure
        if (!Array.isArray(allData) || allData.length !== 24) {
          throw new Error('Invalid data format: expected 24 hours of data');
        }

        // Process the data to create balloon paths
        const paths = [];
        const firstHourData = allData[0];

        if (!Array.isArray(firstHourData)) {
          throw new Error('Invalid data format: expected array of balloon positions');
        }

        for (let balloonIndex = 0; balloonIndex < firstHourData.length; balloonIndex++) {
          try {
            const path = allData.map((hourData, hourIndex) => {
              const position = hourData[balloonIndex];
              if (!Array.isArray(position) || position.length !== 3) {
                throw new Error(`Invalid position data for balloon ${balloonIndex} at hour ${hourIndex}`);
              }
              return {
                coordinates: [position[1], position[0]], // [lng, lat]
                altitude: position[2],
                hour: hourIndex
              };
            });
            paths.push(path);
          } catch (error) {
            console.error(`Error processing balloon ${balloonIndex}:`, error);
            // Skip this balloon
            continue;
          }
        }

        if (paths.length === 0) {
          throw new Error('No valid balloon paths could be created');
        }

        setBalloonPaths(paths);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentHour((prev) => (prev + 1) % 24);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  if (loading) {
    return (
        <div className="w-full h-screen bg-gray-900 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="text-xl mb-4">Loading balloon data...</div>
            <div className="text-sm text-gray-400">This may take a few moments</div>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="w-full h-screen bg-gray-900 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="text-xl mb-4">Error loading data</div>
            <div className="text-sm text-gray-400">{error}</div>
            <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
    );
  }

  return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div style={{ width: "1200px", height: "800px" }}>
          <ComposableMap
              projection="geoEqualEarth"
              projectionConfig={{
                scale: 300,
                center: [0, 0]
              }}
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#1a365d"
              }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                  geographies.map((geo) => (
                      <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill="#2d3748"
                          stroke="#4a5568"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none" },
                            hover: { outline: "none" },
                            pressed: { outline: "none" },
                          }}
                      />
                  ))
              }
            </Geographies>

            {balloonPaths.map((path, balloonIndex) => (
                <React.Fragment key={balloonIndex}>
                  <Line
                      coordinates={path.map(p => p.coordinates)}
                      stroke={`hsla(${(balloonIndex * 30) % 360}, 70%, 50%, 0.3)`}
                      strokeWidth={2}
                  />
                  <Marker coordinates={path[currentHour].coordinates}>
                    <circle
                        r={5}
                        fill={`hsla(${(balloonIndex * 30) % 360}, 70%, 50%, 0.8)`}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                  </Marker>
                </React.Fragment>
            ))}
          </ComposableMap>
        </div>
        <div className="absolute bottom-4 left-4 text-white">
          <div className="text-sm mb-2">
            Hour: {currentHour.toString().padStart(2, '0')}:00 UTC |
            Tracking {balloonPaths.length} balloons
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