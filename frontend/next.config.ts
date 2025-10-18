import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";
/** @type {import('next').NextConfig} */

const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
      },
    ],
  },
};

export default nextConfig;
