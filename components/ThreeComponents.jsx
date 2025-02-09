import React, { useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { SphereGeometry, MeshBasicMaterial, TextureLoader, MeshPhongMaterial, BufferGeometry, LineBasicMaterial, Float32BufferAttribute } from 'three';
import { Line } from '@react-three/drei';

function BalloonPath({ path, color }) {
    const points = useMemo(() => {
        return path.map(pos => {
            const lat = pos.latitude * (Math.PI / 180);
            const lng = pos.longitude * (Math.PI / 180);
            const radius = 1 + (pos.altitude * 0.02); // Match balloon altitude scaling

            return [
                radius * Math.cos(lat) * Math.cos(lng),
                radius * Math.sin(lat),
                radius * Math.cos(lat) * Math.sin(lng)
            ];
        });
    }, [path]);

    return (
        <Line
            points={points}
            color={color}
            lineWidth={1}
            opacity={0.5}
            transparent
        />
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

function Scene({ balloonData, balloonPaths, isAutoRotating }) {
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
                    color={path[0]?.color}
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