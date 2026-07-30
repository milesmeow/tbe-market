import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only. Next blocks cross-origin requests to /_next/* dev resources, so
  // browsing the dev server by LAN IP (e.g. testing on a phone) gets its HMR
  // socket 403'd and silently serves a stale bundle. Matching is per dot-
  // segment, so this covers the whole home subnet and survives a DHCP
  // reassignment. Add another entry if you develop on a different network.
  allowedDevOrigins: ["192.168.1.*"],

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
