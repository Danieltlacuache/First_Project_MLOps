import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // El driver de MySQL y el SDK de MinIO no deben pasar por el bundler del servidor
  serverExternalPackages: ['mysql2', 'minio'],
  experimental: {
    serverActions: {
      // Subida de imágenes vía Server Action / multipart
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
