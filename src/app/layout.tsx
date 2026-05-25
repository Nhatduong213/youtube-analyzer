import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import Script from "next/script";
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "YouTube BA Analyzer",
  description: "Advanced YouTube Tracking & Blacklist Logic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans flex h-screen overflow-hidden antialiased bg-background`}>
        <Script src="https://js.puter.com/v2/" strategy="afterInteractive" />
        {/* Background ambient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
          <div className="absolute -top-48 -left-24 w-[500px] h-[500px] rounded-full bg-violet-600/[0.12] blur-3xl" />
          <div className="absolute top-1/2 -translate-y-1/2 -right-24 w-96 h-96 rounded-full bg-indigo-500/[0.09] blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-purple-700/[0.09] blur-3xl" />
        </div>
        
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
        <SpeedInsights />
      </body>
    </html>
  );
}
