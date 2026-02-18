import type { Metadata } from 'next'
import { Courier_Prime, Space_Mono } from 'next/font/google'
import './globals.css'

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-courier',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space',
})

export const metadata: Metadata = {
  title: 'Stack Mark – Save Every Link That Matters',
  description: 'Your private, real-time bookmark manager. Sign in with Google and save links instantly.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${courierPrime.variable} ${spaceMono.variable} bg-[#111417] text-[#e2eaf2] font-[family-name:var(--font-courier)] antialiased`}>
        {children}
      </body>
    </html>
  )
}