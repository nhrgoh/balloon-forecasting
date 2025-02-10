function lerp(start, end, t) {
    return start + (end - start) * t;
}

function lerpLatLng(start, end, t) {
    // Handle crossing the 180/-180 longitude boundary
    let startLon = start.longitude;
    let endLon = end.longitude;

    if (Math.abs(endLon - startLon) > 180) {
        if (endLon > startLon) {
            startLon += 360;
        } else {
            endLon += 360;
        }
    }

    return {
        latitude: lerp(start.latitude, end.latitude, t),
        longitude: lerp(startLon, endLon, t) % 360,
        altitude: lerp(start.altitude, end.altitude, t),
        isForecast: start.isForecast,
        hour: Math.floor(lerp(start.hour, end.hour, t))
    };
}

export function interpolatePath(points, numIntermediatePoints = 5) {
    if (points.length < 2) return points;

    const result = [];

    for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];

        // Add the current point
        result.push(current);

        // Skip interpolation if points are too far apart (possible data gap)
        const latDiff = Math.abs(next.latitude - current.latitude);
        const lonDiff = Math.min(
            Math.abs(next.longitude - current.longitude),
            Math.abs(next.longitude - current.longitude + 360),
            Math.abs(next.longitude - current.longitude - 360)
        );

        if (latDiff > 45 || lonDiff > 45) {
            continue;
        }

        // Add intermediate points
        for (let j = 1; j <= numIntermediatePoints; j++) {
            const t = j / (numIntermediatePoints + 1);
            result.push(lerpLatLng(current, next, t));
        }
    }

    // Add the last point
    result.push(points[points.length - 1]);

    return result;
}

export function smoothPath(points, windowSize = 3) {
    if (points.length < windowSize) return points;

    const result = [];

    // Keep first and last points unchanged
    result.push(points[0]);

    for (let i = 1; i < points.length - 1; i++) {
        // Calculate the window for smoothing
        const start = Math.max(0, i - Math.floor(windowSize / 2));
        const end = Math.min(points.length, i + Math.floor(windowSize / 2) + 1);
        const window = points.slice(start, end);

        // Calculate average position
        const avg = window.reduce((acc, curr) => ({
            latitude: acc.latitude + curr.latitude / window.length,
            longitude: acc.longitude + curr.longitude / window.length,
            altitude: acc.altitude + curr.altitude / window.length,
            isForecast: curr.isForecast,
            hour: curr.hour
        }), { latitude: 0, longitude: 0, altitude: 0, isForecast: points[i].isForecast, hour: points[i].hour });

        result.push(avg);
    }

    result.push(points[points.length - 1]);

    return result;
}