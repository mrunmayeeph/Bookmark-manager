import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // allows images from any https source (useful for Google profile pics)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig