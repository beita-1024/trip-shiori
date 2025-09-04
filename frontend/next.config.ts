import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        // poll: 300, // Windowsファイルシステム
        poll: false, // Linuxファイルシステム
        aggregateTimeout: 100,
        ignored: /node_modules|\.git/,
      };
    }
    return config;
  }
};

export default nextConfig;
