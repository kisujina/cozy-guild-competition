'use client';
import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Flower2, Users, Bell, Share2 } from 'lucide-react';

export default function PeekabooLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // 공유하기 기능
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '까꿍 길드 꽃 & 임무 관리',
        text: '더코지 까꿍 길드 전용 관리 웹앱입니다 🐾',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다! 📋');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#5C4033] max-w-md mx-auto flex flex-col pb-24 selection:bg-amber-100">
      
      {/* 🌸 상단 앱 바 */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-amber-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight text-amber-900">까꿍🐾</span>
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
            더 코지 최고 길드😘
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 카카오톡 공지방 */}
          <a 
            href="https://open.kakao.com/o/gw9XZNxi" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 flex items-center gap-1 text-amber-900 hover:bg-amber-100 transition-colors text-[11px] font-black"
            title="카카오톡 공지방 참여"
          >
            <span>📢</span>
          </a>

          {/* 카카오톡 수다방 */}
          <a 
            href="https://open.kakao.com/o/gRax2bIi" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 flex items-center gap-1 text-amber-900 hover:bg-amber-100 transition-colors text-[11px] font-black"
            title="카카오톡 수다방"
          >
            <span>💬</span>
          </a>

          {/* 공유하기 */}
          <button 
            onClick={handleShare}
            className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
            title="공유하기"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 📄 메인 컨텐츠 영역 */}
      <main className="flex-1 px-4 pt-4">
        {children}
      </main>

      {/* 🧭 하단 바텀 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-amber-100 py-2 px-6 flex justify-around items-center z-30 shadow-lg">
        <button
          onClick={() => router.push('/peekaboo')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
            pathname === '/peekaboo' ? 'text-amber-700 font-black' : 'text-stone-400 font-bold hover:text-stone-600'
          }`}
        >
          <Flower2 className="w-5 h-5" />
          <span className="text-[11px]">임무 꽃 조회</span>
        </button>

        <button
          onClick={() => router.push('/peekaboo/members')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
            pathname === '/peekaboo/members' ? 'text-amber-700 font-black' : 'text-stone-400 font-bold hover:text-stone-600'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px]">임무 관리</span>
        </button>

        <button
          onClick={() => router.push('/peekaboo/notices')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
            pathname === '/peekaboo/notices' ? 'text-amber-700 font-black' : 'text-stone-400 font-bold hover:text-stone-600'
          }`}
        >
          <Bell className="w-5 h-5" />
          <span className="text-[11px]">공지사항</span>
        </button>
      </nav>

    </div>
  );
}