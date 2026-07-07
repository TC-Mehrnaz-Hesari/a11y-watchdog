import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow importing JSON scan files from outside src at build time.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
