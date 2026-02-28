/** @type {import('next').NextConfig} */

const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb'
    }
  },
  cacheComponents: true,
};

export default nextConfig;
