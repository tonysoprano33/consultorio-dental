import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
