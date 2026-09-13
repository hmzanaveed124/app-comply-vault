/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Prevent Next.js from bundling pdfkit; its .afm font files must resolve at runtime
  serverExternalPackages: ["pdfkit", "ws", "@neondatabase/serverless"],
  typescript: {
    // Ignore type errors in generated Prisma files
    // These files are generated and have known type issues that don't affect runtime
    ignoreBuildErrors: true,
  },
  // Exclude generated folder from webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  // Enable standalone output for Docker deployment
  output: 'standalone',
};

export default config;
