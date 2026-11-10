import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  serverExternalPackages: ["mermaid-isomorphic"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
