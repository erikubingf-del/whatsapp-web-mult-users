import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type checking during build (already done separately)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Use standalone output for Docker deployments
  output: 'standalone',
};

export default nextConfig;
