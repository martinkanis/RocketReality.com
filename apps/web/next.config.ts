import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@rocket/shared',
    '@rocket/config',
    '@rocket/db',
    '@rocket/core',
    '@rocket/auth',
    '@rocket/emails',
  ],
  output: 'standalone',
  images: {
    // MinIO v lokálním dockeru — v produkci nahradí S3-kompatibilní storage.
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9100',
      },
    ],
  },
}

export default nextConfig
