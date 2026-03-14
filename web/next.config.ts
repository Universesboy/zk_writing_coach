import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Move it to the root level instead of experimental to fix the unrecognised key warning
  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
    '*.lhr.life' // Explicit wildcard string match for next 15+
  ]
}

export default nextConfig
