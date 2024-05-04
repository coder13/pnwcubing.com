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
  async redirects() {
    return [
      {
        source: "/feedback",
        destination:
          "https://docs.google.com/forms/d/13OjyKJWGZP3UmTrPcfF5vbJGboGigyphanHj7oN8eWg",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
