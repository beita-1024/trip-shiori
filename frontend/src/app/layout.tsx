// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeToggle from "@/components/ThemeToggle";
import AuthButtons from "@/components/AuthButtons";
import TutorialButton from "@/components/TutorialButton";
import { Logo } from "@/components/Logo";
import ConditionalAuthButtons from "@/components/ConditionalAuthButtons";

// INFO: components.jsonで以下の設定をしない代わりに、ここで読む
// "tailwind": {
//   "config": "tailwind.config.ts",

import "./globals.css";
import "tailwindcss";

import ThemeProviderClient from "@/components/ThemeProviderClient";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI旅のしおり",
  description: "AIが生成する旅のしおりアプリ",
  manifest: "/site.webmanifest",
  themeColor: "#0ea5e9",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [
      { rel: "mask-icon", url: "/mask-icon.svg", color: "#0ea5e9" },
    ],
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="jp" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-app text-body`}>
        <ThemeProviderClient>
          {/* ヘッダ（固定位置） */}
          <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-ui bg-surface/70 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <Logo />
              {/* 認証ボタンとテーマトグルを右側に配置 */}
              <div className="flex items-center gap-3">
                <TutorialButton />
                <ConditionalAuthButtons />
                <ThemeToggle />
              </div>
            </div>
          </header>
          
          {/* ページ本体 */}
          <main className="min-h-screen pt-16"> {/* 固定ヘッダーの高さ分のパディングを追加 */}
            {children}
          </main>
        </ThemeProviderClient>
      </body>
    </html>
  );
}
