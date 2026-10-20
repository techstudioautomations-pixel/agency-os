import type { NextConfig } from "next";

const basePath = process.env.GITHUB_PAGES === "true" ? "/agency-os" : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  // pdf.js can use the Node "canvas" package. The browser does not need it.
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
