import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Resume redaction: load mupdf from node_modules at runtime instead of bundling its
  // WebAssembly, which it locates relative to its own file.
  serverExternalPackages: ["mupdf"],
  experimental: {
    // Resume PDFs (at most 4 MB) are uploaded through server actions; the default limit is
    // 1 MB. The extra room covers multipart overhead, so the 4 MB check in
    // `uploadResume` runs and shows its own message instead of the framework rejecting the body.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
