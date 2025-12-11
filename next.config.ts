import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Set explicit turbopack root to avoid lockfile warning
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
