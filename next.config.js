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
    // O Prisma com engineType "client" carrega o query compiler em runtime
    // (fs.readFile com caminho dinâmico). Sem isto o tracer do Next não copia
    // o .wasm para o bundle do Worker.
    outputFileTracingIncludes: {
      '/**/*': ['./node_modules/.prisma/client/query_compiler_bg.wasm'],
    },
  },
};

module.exports = nextConfig;
