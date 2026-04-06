import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'better_pulse — stay on top of your deadlines',
  description: 'Track all your Conestoga assignments, quizzes, and exams in one clean dashboard',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'better_pulse',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0e0e11',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
