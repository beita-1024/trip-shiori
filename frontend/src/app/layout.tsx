// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeToggle from "@/components/ThemeToggle";

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
  title: "AI旅のしおりアプリ",
  description: "AI旅のしおりアプリ",
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
          {/* ヘッダ（固定 or レイアウト内） */}
          <header className="w-full border-b border-ui bg-surface/70 backdrop-blur-sm mb-4">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="text-lg font-medium accent">{String(metadata.title ?? "デフォルトタイトル")}</div>
              {/* ThemeToggle を右上に表示 */}
              <div>
                <ThemeToggle />
              </div>
            </div>
          </header>
          
          {/* ページ本体 */}
          <main className="min-h-screen"> {/* ヘッダーとページ本体の間隔を開けるためにmt-4を追加 */}
            {children}
          </main>
        </ThemeProviderClient>
      </body>
    </html>
  );
}
