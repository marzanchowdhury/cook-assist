import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tzeeiaxubjgizagskaco.supabase.co",
        pathname: "/storage/v1/object/public/recipe-images/**",
      },
    ],
  },
};

export default nextConfig;