import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Listing photos are uploaded through Server Actions. Raise the default
      // 1 MB cap; images are also compressed client-side (see lib/image.ts), so
      // this is generous headroom. Note: Vercel serverless still caps request
      // bodies at ~4.5 MB, which this value stays under.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
