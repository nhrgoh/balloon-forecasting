# Global Balloon Tracker

A real-time 3D visualization system for tracking high-altitude weather balloons from WindBorne Systems and predicting their trajectories using OpenWeather weather forecast data. This project aims to improve weather prediction models by correlating actual balloon paths with forecasted wind patterns.

## Purpose

This application serves multiple purposes:

* Visualize current positions of weather balloons in real-time through an intuitive interface that allows operators to monitor multiple launches simultaneously
* Project future balloon trajectories based on weather forecast data to enable better flight planning and recovery operations
* Compare actual vs. predicted paths to refine weather models and improve future prediction accuracy
* Provide insights into atmospheric conditions and wind patterns at various altitudes

## Features

* Interactive 3D globe visualization using Three.js with smooth performance and realistic rendering
* Real-time tracking of multiple balloons (up to 50 simultaneous tracks) with minimal latency
* Historical path visualization (24-hour history) showing complete flight paths and altitude changes
* Trajectory prediction (24-hour forecast) based on current weather models and historical data
* Color-coded paths (green for historical, red for forecasted) for clear visual distinction
* Time-based playback controls for reviewing historical data and predicted paths
* Automatic globe rotation with toggle for enhanced visualization
* Responsive design with mobile support for field operations

## Technical Stack

* Next.js for the framework
* React Three Fiber for 3D rendering
* TailwindCSS for styling
* OpenWeatherMap API for weather forecasts (optional)
* Server-side caching for performance
