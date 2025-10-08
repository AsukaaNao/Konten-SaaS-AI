import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
// Import the ToastProvider
import { ToastProvider } from "@/components/Toast"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RICE AI Consulting",
  description: "AI-Powered Solutions for Businesses — by RICE AI Consulting.",
  icons: {
    icon: [
      {
        url: "https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=64,h=64,fit=crop,q=95/AGB2yyJJKXfD527r/rice-ai-consulting-2-AoPWxvnWOju2GwOz.png",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "RICE AI Consulting",
    description: "AI-Powered Solutions for Businesses — by RICE AI Consulting.",
    images: [
      "https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=1200,h=630,fit=crop,q=95/AGB2yyJJKXfD527r/rice-ai-consulting-2-AoPWxvnWOju2GwOz.png",
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RICE AI Consulting",
    description: "AI-Powered Solutions for Businesses — by RICE AI Consulting.",
    images: [
      "https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=600,h=315,fit=crop,q=95/AGB2yyJJKXfD527r/rice-ai-consulting-2-AoPWxvnWOju2GwOz.png",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Wrap both providers around the children */}
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
