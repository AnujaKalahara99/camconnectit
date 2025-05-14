/** @type {import('next').NextConfig} */
const nextConfig = {
  // reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable HTTPS in development
  // server: {
  //   https: true,
  // },
};

export default nextConfig;
