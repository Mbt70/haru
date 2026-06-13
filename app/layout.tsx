import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "하루",
  description: "태스크, 목표, AI 사용까지 — 나를 위한 하루 운영 시스템",
  applicationName: "하루",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "하루",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // 노치/제스처바 영역까지 그려서 env(safe-area-inset-*)가 실제 값을 갖게 함
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// FOUC 없이 시스템 다크모드를 따라가도록 페인트 전에 .dark 클래스를 적용.
// 시스템 테마가 바뀌면(예: 일몰 후 자동 전환) 즉시 반영.
const themeScript = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');var a=function(e){document.documentElement.classList.toggle('dark',e.matches);};a(m);m.addEventListener('change',a);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${notoSansKr.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
