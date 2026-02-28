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
    useCache: true,
    serverActions: {
      bodySizeLimit: '5mb'
    }
  },
};

export default nextConfig;
