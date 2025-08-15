import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false

  // async redirects() {
  //   return [
  //     {
  //     source: '/(.*)',
  //     destination: 'https://accendium.carrd.co/',
  //     permanent: true
  //     }
  //   ]
  // }
}

export default nextConfig;
