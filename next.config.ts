import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // react-force-graph ships ESM-only deps that must be transpiled for the server bundle.
    optimizePackageImports: ["react-force-graph-2d"],
  },
};

export default nextConfig;
