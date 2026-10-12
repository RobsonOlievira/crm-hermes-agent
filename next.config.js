const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '.prisma/client', '@prisma/adapter-pg', 'pg'],
  },
};

module.exports = nextConfig;
