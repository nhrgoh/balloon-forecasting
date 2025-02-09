import React, { useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { SphereGeometry, MeshBasicMaterial, TextureLoader, MeshPhongMaterial, BufferGeometry, LineBasicMaterial, Float32BufferAttribute } from 'three';
import { Line } from '@react-three/drei';

function BalloonPath({ path }) {
    const segments = useMemo(() => {
        const historical = [];
        const forecast = [];
        let currentSegment = historical;

        path.forEach((pos) => {
            const lat = pos.latitude * (Math.PI / 180);
            const lng = pos.longitude * (Math.PI / 180);
            const radius = 1 + (pos.altitude * 0.02);

            const point = [
                radius * Math.cos(lat) * Math.cos(lng),
                radius * Math.sin(lat),
                radius * Math.cos(lat) * Math.sin(lng)
            ];

            if (pos.isForecast && currentSegment === historical) {
                // First forecast point - add it to both segments to connect them
                historical.push(point);
                currentSegment = forecast;
            }

            currentSegment.push(point);
        });

        return { historical, forecast };
    }, [path]);

    return (
        <>
            {segments.historical.length > 1 && (
                <Line
                    points={segments.historical}
                    color="#00ff00"
                    lineWidth={1}
                    opacity={0.5}
                    transparent
                />
            )}
            {segments.forecast.length > 1 && (
                <Line
                    points={segments.forecast}
                    color="#ff0000"
                    lineWidth={1}
                    opacity={0.5}
                    transparent
                />
            )}
        </>
    );
}

function Balloon({ latitude, longitude, altitude, color }) {
    const geometry = useMemo(() => new SphereGeometry(0.01, 16, 16), []);
    const material = useMemo(() => new MeshBasicMaterial({ color }), [color]);

    const lat = latitude * (Math.PI / 180);
    const lng = longitude * (Math.PI / 180);
    const radius = 1 + (altitude * 0.02);
    const x = radius * Math.cos(lat) * Math.cos(lng);
    const y = radius * Math.sin(lat);
    const z = radius * Math.cos(lat) * Math.sin(lng);

    return (
        <mesh
            geometry={geometry}
            material={material}
            position={[x, y, z]}
        />
    );
}

function Earth() {
    const [colorMap, bumpMap, specularMap] = useLoader(TextureLoader, [
        '/earth-texture.jpg',
        '/earth-bump.jpg',
        '/earth-specular.jpg'
    ]);

    return (
        <mesh>
            <sphereGeometry args={[1, 64, 64]} />
            <meshPhongMaterial
                map={colorMap}
                bumpMap={bumpMap}
                bumpScale={0.05}
                specularMap={specularMap}
                shininess={5}
            />
        </mesh>
    );
}

function Scene({ balloonData, balloonPaths, forecastPaths = [], isAutoRotating }) {
    return (
        <Canvas camera={{ position: [0, 0, 2.5], fov: 45 }}>
            <color attach="background" args={['#111827']} />

            <ambientLight intensity={0.1} />
            <pointLight position={[100, 100, 100]} intensity={2.5} />
            <pointLight position={[-100, -100, -100]} intensity={1.5} />

            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />

            <Earth />

            {balloonPaths.map((path, index) => (
                <BalloonPath
                    key={`path-${index}`}
                    path={path}
                    defaultColor="#00ff00"
                />
            ))}

            {balloonData.map((balloon) => (
                <Balloon
                    key={`balloon-${balloon.id}`}
                    latitude={balloon.latitude}
                    longitude={balloon.longitude}
                    altitude={balloon.altitude}
                    color={balloon.color}
                />
            ))}

            <OrbitControls
                enablePan={false}
                enableZoom={true}
                minDistance={1.5}
                maxDistance={4}
                autoRotate={isAutoRotating}
                autoRotateSpeed={0.5}
            />
        </Canvas>
    );
}

export default Scene;