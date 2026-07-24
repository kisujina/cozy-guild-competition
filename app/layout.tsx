import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '경진당(경쟁전에 진심인 당신)',
  description: '꽃키우기게임 길드 경쟁전 관리 앱',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '길드앱',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* 모바일 화면 확대/축소 방지 및 크기 고정 뷰포트 메타 태그 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto w-full overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}