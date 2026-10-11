import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Resume PDFs (at most 5 MB) are uploaded through server actions; the default limit is
    // 1 MB. The extra megabyte covers multipart overhead, so the 5 MB check in
    // `uploadResume` runs and shows its own message instead of the framework rejecting the body.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
