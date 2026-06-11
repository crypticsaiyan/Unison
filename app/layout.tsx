import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import "@progress/kendo-theme-default/dist/all.css"
import "./kendo-theme.css"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: "--font-heading"
})

export const metadata: Metadata = {
  title: "Unison | Real-Time Conference Dubbing",
  description:
    "Conference inclusion infrastructure. Real-time multilingual dubbing so every attendee follows every talk in their own language.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${spaceGrotesk.variable} min-h-screen flex flex-col`}>
          <Header />
            {children}
          <Footer />
        <Analytics />
      </body>
    </html>
  )
}
