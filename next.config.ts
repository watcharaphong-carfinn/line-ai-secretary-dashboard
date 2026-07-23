import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      // JWKS มาตรฐาน — แอปอื่นดึง public key จาก path นี้
      { source: "/.well-known/jwks.json", destination: "/api/auth/jwks" },
    ];
  },
};

export default nextConfig;
