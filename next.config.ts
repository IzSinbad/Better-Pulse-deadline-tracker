import type { NextConfig } from 'next'

// note: next-pwa doesn't have great TS types so we cast it
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // only enable service worker in production — dev mode with SW is a headache
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      // cache the dashboard page for offline
      urlPattern: /^https:\/\/.*\/dashboard/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'dashboard-cache',
        expiration: { maxEntries: 5, maxAgeSeconds: 86400 },
      },
    },
    {
      // cache static assets
      urlPattern: /\.(js|css|png|jpg|svg|ico|woff2?)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 86400 },
      },
    },
  ],
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // allow images from Microsoft profile pictures
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'graph.microsoft.com' },
      { protocol: 'https', hostname: '*.githubusercontent.com' },
    ],
  },
}

export default withPWA(nextConfig)
