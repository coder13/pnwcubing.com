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
      {
        source: "/uploads/1/9/8/7/19877007/editor/pnwcubing-transparent-01.png",
        destination: "/images/full_white.png",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
