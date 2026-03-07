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
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
      }
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb'
    },
    authInterrupts: true,
  },
  cacheComponents: true,
};

export default nextConfig;
