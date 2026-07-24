import type { Metadata, Viewport } from 'next/metadata';
import './globals.css';

export const metadata: Metadata = {
  title: '길드 관리 앱',
  description: '메이플랜드 길드 관리',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '길드앱',
  },
};

// 👈 뷰포트 설정을 통해 모바일 화면 확대/축소 고정
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false, // 사용자가 손가락으로 화면을 확대/축소하는 것 방지
  viewportFit: 'cover',
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
      </head>
      {/* 👈 모바일 화면 고정을 위해 w-full과 max-w-md, overflow-x-hidden 조합 적용 */}
      <body className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto w-full overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}