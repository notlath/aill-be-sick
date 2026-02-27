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
    ],
  },
  experimental: {
    useCache: true
  }
};

export default nextConfig;
