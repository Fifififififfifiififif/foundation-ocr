import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "tesseract.js",
    "pdf-parse",
    "pdfjs-dist",
    "sharp",
    "@napi-rs/canvas",
  ],
};

export default nextConfig;
