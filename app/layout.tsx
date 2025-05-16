import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SVG to PowerPoint - 在线转换工具",
  description: "一个将SVG图形快速转换为PowerPoint幻灯片的在线工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} bg-gray-50 min-h-screen`} suppressHydrationWarning={true}>
        <Header />
        <main className="pt-4">
          {children}
        </main>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}