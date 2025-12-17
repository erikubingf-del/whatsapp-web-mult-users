import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type checking during build (already done separately)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Use standalone output for Docker deployments
  output: 'standalone',
  // Disable strict mode to prevent double rendering issues
  reactStrictMode: false,
};

export default nextConfig;
