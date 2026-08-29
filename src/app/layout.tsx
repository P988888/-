import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "阿黔 · 每个团都有一位记得你的 AI 副导",
  description:
    "真人导游给团里每位游客配一个「阿黔」——记住本团行程、按各自语言和兴趣陪讲，遇到需要真人的事再交回导游。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1a3b4c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
