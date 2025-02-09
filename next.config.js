/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  webpack: (config) => {
    // Add support for importing three.js
    config.resolve.alias.three = require.resolve('three');
    return config;
  },
}

module.exports = nextConfig