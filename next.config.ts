import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Move turbopack config to stable location (experimental.turbo is deprecated)
  turbopack: {
    resolveAlias: {
      // Workaround for Turbopack font loading issue if using --turbopack flag
      '@vercel/turbopack-next/internal/font/google/font': '',
    },
  },
  
  // Configure API route timeouts (for serverless functions)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  
  // Note: For local development, the timeout is typically unlimited
  // For production deployments (Vercel, etc.), you may need to configure separately
};

export default nextConfig;
