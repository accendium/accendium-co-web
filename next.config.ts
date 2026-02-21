import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev', 'http://10.1.38.112:3000'],
}

export default nextConfig;
