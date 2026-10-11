import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Resume PDFs are uploaded through server actions; the default limit is 1 MB.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
