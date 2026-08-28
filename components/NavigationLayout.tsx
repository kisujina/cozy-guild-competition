'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  FaSeedling, FaTasks, FaBullhorn, 
  FaShareAlt, FaRegQuestionCircle, FaSignOutAlt , FaBell
} from 'react-icons/fa';

export default function NavigationLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [guildName, setGuildName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(true);

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
      localStorage.setItem('read_notice_version', 'v1.0'); // 최신 공지 버전 저장
    }
  };

  const handleLogout = () => { 
    //localStorage.clear(); 
    localStorage.removeItem('read_notice_version');//공지알림만 초기화
    router.push('/'); 
  };
  
  const handleShare = () => { 
    navigator.clipboard.writeText(window.location.href); 
    alert('링크가 복사되었습니다!'); 
  };

  return (
    
    <div className="min-h-screen bg-[#FAF8F5] text-stone-700 selection:bg-pink-100 selection:text-pink-700 font-sans flex flex-col items-center">
      {/* 모바일 뷰어용 컨테이너 넓이 고정 */}
      <div className="w-full max-w-md relative flex flex-col min-h-screen bg-[#FAF8F5] shadow-sm">
        
        {/* ============================== */}
        {/* 1. 상단 앱 바 (스크롤시 상단 고정) */}
        {/* ============================== */}
        <header className="fixed top-0 left-0 right-0 max-w-md mx-auto z-40 bg-white/85 backdrop-blur-md border-b border-stone-200/60 px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-400 flex items-center justify-center shadow-inner">
              <FaSeedling className="text-lg" />
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-800 tracking-tight">{guildName || '길드명 없음'}</h1>
              <p className="text-xs text-stone-400 font-medium">{nickname}님 {dayOfWeek}요팅 하세요❤️</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            { /* 공지사항 아이콘 버튼 */}
            <button
              onClick={handleOpenNotice} // 4. 수정된 함수 연결
              className="relative p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              aria-label="공지사항"
            >
              <FaBell className="w-5 h-5" />
              {/* 5. 안 읽었을 때만 빨간 점 노출 */}
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

        {/* ============================== */}
        {/* 2. 메인 콘텐츠 (스크롤 되는 영역) */}
        {/* ============================== */}
        {/* pt-[76px]로 상단바 가림 방지, pb-[80px]로 하단바 가림 방지 */}
        <main className="flex-1 w-full pt-[76px] pb-[80px]">
          {children}
        </main>

        {/* ============================== */}
        {/* 3. 하단 네비게이션 (스크롤시 하단 고정) */}
        {/* ============================== */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-stone-200/60 px-6 py-2.5 flex items-center justify-around z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
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
        {/* ============================== */}
        {/* 4. 공지사항 모달 (컨테이너 내부 최하단에 위치) */}
        {/* ============================== */}
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
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between border-b border-stone-200/60 pb-3.5">
                <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                  <FaBell className="w-5 h-5 text-[#9b87f5]" />
                  길드 공지사항
                </h2>
                <button 
                  onClick={() => setIsNoticeOpen(false)}
                  className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* 공지 내용 본문 */}
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

                {/* 추가된 사항 */}
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
                      <span><strong>[임무 꽃 조회]</strong> 배너 필터 검색 옵션 추가</span>
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

                {/* 삭제된 사항 */}
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

              {/* 확인 버튼 */}
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