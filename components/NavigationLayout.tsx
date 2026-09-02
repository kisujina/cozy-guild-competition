'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  FaSeedling, FaTasks, FaBullhorn, 
  FaShareAlt, FaRegQuestionCircle, FaSignOutAlt, FaBell
} from 'react-icons/fa';

export default function NavigationLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [guildName, setGuildName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(true);

  // 상/하단바 표시 여부 상태 (true: 보임, false: 숨김)
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // 스크롤 방향 감지 로직
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 최상단 근처에서는 무조건 보이게 처리
      if (currentScrollY < 10) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY.current) {
        // 아래로 스크롤할 때 -> 숨김
        setIsVisible(false);
      } else {
        // 위로 스크롤할 때 -> 나타남
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 모달이 열려있을 때 배경 페이지 전체 스크롤 방지
  useEffect(() => {
    if (isNoticeOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isNoticeOpen]);

  useEffect(() => {
    setGuildName(localStorage.getItem('guild_name') || '');
    setNickname(localStorage.getItem('user_nickname') || '');
    setDayOfWeek(['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()]);

    const readNoticeVersion = localStorage.getItem('read_notice_version');
    if (readNoticeVersion === 'v1.0') {
      setHasUnreadNotice(false);
    }
  }, []);

  const handleOpenNotice = () => {
    setIsNoticeOpen(true);
    if (hasUnreadNotice) {
      setHasUnreadNotice(false);
      localStorage.setItem('read_notice_version', 'v1.0');
    }
  };

  const handleLogout = () => { 
    localStorage.removeItem('read_notice_version');
    router.push('/'); 
  };
  
  const handleShare = () => { 
    navigator.clipboard.writeText(window.location.href); 
    alert('링크가 복사되었습니다!'); 
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-700 selection:bg-pink-100 selection:text-pink-700 font-sans flex flex-col items-center">
      <div className="w-full max-w-md relative flex flex-col min-h-screen bg-[#FAF8F5] shadow-sm">
        
        {/* 1. 상단 앱 바 (스크롤 내리면 위로 숨겨지고, 올리면 스르륵 나타남) */}
        <header className={`w-full fixed top-0 left-1/2 -translate-x-1/2 max-w-md bg-white/85 backdrop-blur-md border-b border-stone-200/60 px-4 py-3 flex items-center justify-between shadow-xs z-30 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-400 flex items-center justify-center shadow-inner shrink-0">
              <FaSeedling className="text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold text-stone-800 tracking-tight truncate">{guildName || '길드명 없음'}</h1>
              <p className="text-[11px] sm:text-xs text-stone-400 font-medium tracking-tight shrink min-w-0 truncate">🤗{nickname}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenNotice}
              className="relative p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
              aria-label="공지사항"
            >
              <FaBell className="w-5 h-5" />
              {hasUnreadNotice && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button onClick={handleShare} className="w-9 h-9 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-500 flex items-center justify-center transition cursor-pointer border border-stone-200/60">
              <FaShareAlt className="text-xs" />
            </button>
            <a href="https://open.kakao.com/o/svKuCxFi" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-500 flex items-center justify-center transition cursor-pointer border border-amber-200/60">
              <FaRegQuestionCircle className="text-sm" />
            </a>
            <button onClick={handleLogout} className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-400 flex items-center justify-center transition cursor-pointer border border-rose-200/60">
              <FaSignOutAlt className="text-xs" />
            </button>
          </div>
        </header>

        {/* 2. 메인 콘텐츠 (상단바가 fixed 되었으므로 밀리지 않도록 상단 패딩 pt-16 추가) */}
        <main className="flex-1 w-full pt-16 pb-20">
          {children}
        </main>

        {/* 3. 하단 네비게이션 (스크롤 내리면 아래로 숨겨지고, 올리면 스르륵 나타남) */}
        <nav className={`w-full fixed bottom-0 left-1/2 -translate-x-1/2 max-w-md bg-white/90 backdrop-blur-md border-t border-stone-200/60 px-6 py-2.5 flex items-center justify-around z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] transition-transform duration-300 ${isVisible && !isNoticeOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <Link 
            href="/flowers/select" 
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${pathname.includes('/flowers') ? 'text-pink-500 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <FaSeedling className="text-lg" />
            <span className="text-[10px]">임무 꽃 조회</span>
          </Link>
          <Link 
            href="/guild/tasks" 
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${pathname.includes('/guild/tasks') ? 'text-pink-500 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <FaTasks className="text-lg" />
            <span className="text-[10px]">임무 관리</span>
          </Link>
          <Link 
            href="/guild/notices" 
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${pathname.includes('/guild/notices') ? 'text-pink-500 font-bold' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <FaBullhorn className="text-lg" />
            <span className="text-[10px]">공지사항</span>
          </Link>
        </nav>

        {/* 4. 공지사항 모달 */}
        {isNoticeOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
            onClick={() => setIsNoticeOpen(false)}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onScroll={(e) => e.stopPropagation()}
          >
            <div 
              className="bg-[#FFFDF9] rounded-[28px] p-5 max-w-md w-full max-h-[88vh] overflow-y-auto shadow-2xl border border-purple-100 space-y-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-200/60 pb-3.5">
                <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                  <FaBell className="w-5 h-5 text-[#9b87f5]" />
                  길드해 공지사항
                </h2>
                <button 
                  onClick={() => setIsNoticeOpen(false)}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-stone-700 text-sm leading-relaxed">
                <div className="bg-[#f3f0ff]/60 p-3.5 rounded-xl border border-[#e8deff]">
                  <span className="inline-block px-2 py-0.5 bg-[#e8deff] text-[#6e56cf] text-xs font-semibold rounded-md mb-1">
                    UPDATE
                  </span>
                  <h3 className="font-bold text-stone-900 mb-1">길드 앱 주요 업데이트 안내</h3>
                  <p className="text-stone-600 text-xs">
                    길드 운영 편의성과 UI/UX가 대폭 개선되었습니다. 변경된 내용을 확인해 주세요!
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-[#6e56cf] uppercase tracking-wider flex items-center gap-1">
                    <span>✨ 추가된 사항</span>
                  </h4>
                  <ul className="space-y-1.5 pl-1 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="text-[#9b87f5] font-bold">•</span>
                      <span>전체 UI/UX 개선 작업 완료</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#9b87f5] font-bold">•</span>
                      <span>길드원 공용 비밀번호 추가</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#9b87f5] font-bold">•</span>
                      <span><strong>[임무 꽃 조회]</strong> 필터 검색 옵션, 즐겨찾기 꽃 리스트 추가</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#9b87f5] font-bold">•</span>
                      <span><strong>[임무 관리]</strong> 길드원 별로 보유 꽃 관리 기능 추가</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#9b87f5] font-bold">•</span>
                      <span><strong>[공지사항]</strong>에서 길드 공지 업로드 기능 추가</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#9b87f5] font-bold">•</span>
                      <span>꽃 정보 길드전 점수, 길드원 별 절품 추가 점수 기능 추가</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#9b87f5] font-bold">•</span>
                      <span>길드원별 길드전 임무 상태 관리 기능 추가</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2 pt-1 border-t border-stone-200/40">
                  <h4 className="font-bold text-xs text-rose-500 uppercase tracking-wider flex items-center gap-1">
                    <span>🗑️ 삭제된 사항</span>
                  </h4>
                  <ul className="space-y-1.5 pl-1 text-xs text-stone-500">
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>게임 꽃 정보 관리 신규 꽃 추가/수정/삭제 기능 삭제</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>임무 정보 및 길드원 정보 상세 설정 페이지 삭제</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsNoticeOpen(false)}
                  className="w-full py-3 bg-[#9b87f5] hover:bg-[#8570e6] text-white font-medium rounded-xl transition-colors shadow-sm text-sm cursor-pointer"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}