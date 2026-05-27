import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { CookieConsent } from "@/components/CookieConsent";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "YouTube BA Analyzer",
  description: "Advanced YouTube Tracking & Analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.turso.io https://www.googleapis.com;"
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans flex h-screen overflow-hidden antialiased bg-background`}>
        {/* Background ambient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
          <div className="absolute -top-48 -left-24 w-[500px] h-[500px] rounded-full bg-violet-600/[0.12] blur-3xl" />
          <div className="absolute top-1/2 -translate-y-1/2 -right-24 w-96 h-96 rounded-full bg-indigo-500/[0.09] blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-purple-700/[0.09] blur-3xl" />
        </div>
        
        <LayoutWrapper>
          {children}
        </LayoutWrapper>

        <CookieConsent />
      </body>
    </html>
  );
}
