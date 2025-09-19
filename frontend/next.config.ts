import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CapRoverでのデプロイ時に0.0.0.0でバインドするための設定
  experimental: {
    serverComponentsExternalPackages: [],
  },
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
