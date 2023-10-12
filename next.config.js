/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["avatars.worldcubeassociation.org"],
    minimumCacheTTL: 600,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.worldcubeassociation.org",
      },
    ],
  },
};

module.exports = nextConfig;
