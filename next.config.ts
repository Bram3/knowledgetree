import type { NextConfig } from "next";

// SDWorx Ignite fonts (stylesheet + woff2) loaded from src/app/layout.tsx.
const FONT_CDN = "https://cdn.sdworx.com";
const isDev = process.env.NODE_ENV === "development";

// No nonces: the app is mostly statically rendered. PDFs are previewed in a same-origin iframe, hence frame-src/frame-ancestors 'self'.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline' ${FONT_CDN}`,
  "img-src 'self' blob: data:",
  `font-src 'self' data: ${FONT_CDN}`,
  "connect-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Uploads go through server actions; keep this above MAX_UPLOAD_BYTES (src/lib/upload-rules.ts).
    serverActions: { bodySizeLimit: "11mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
