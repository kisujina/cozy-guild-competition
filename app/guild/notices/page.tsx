'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NavigationLayout from '@/components/NavigationLayout';
import { FaBullhorn, FaPlus, FaLock, FaTimes, FaEdit, FaTrashAlt, FaChevronRight, FaSearch } from 'react-icons/fa';

export default function GuildNoticesPage() {
  const router = useRouter();
  const [guildId, setGuildId] = useState<number | null>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState(''); // 입력창 값
  const [searchQuery, setSearchQuery] = useState(''); // 엔터/검색 시 확정되는 검색어

  // 공지 작성/수정 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // 상세 보기 모달 상태
  const [selectedDetailNotice, setSelectedDetailNotice] = useState<any | null>(null);

  // 비밀번호 확인 모달 (수정/삭제용)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetAction, setTargetAction] = useState<'edit' | 'delete' | null>(null);
  const [selectedNoticeItem, setSelectedNoticeItem] = useState<any | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const sGId = localStorage.getItem('guild_id');
    if (!sGId) {
      alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
      router.push('/');
      return;
    }
    const gIdNum = Number(sGId);
    setGuildId(gIdNum);
    fetchNotices(gIdNum);
  }, [router]);

  const fetchNotices = async (gId: number) => {
    const { data, error } = await supabase
      .from('guild_notices')
      .select('*')
      .eq('guild_id', gId)
      .order('created_at', { ascending: false });
    if (!error && data) setNotices(data);
  };

  // 공지 등록/수정 핸들러
  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId || !title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    if (!passwordInput.trim()) {
      alert('등록을 위한 숫자 비밀번호를 입력해주세요.');
      return;
    }

    if (editingNotice) {
      if (editingNotice.password && editingNotice.password !== passwordInput) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }
      const { error } = await supabase
        .from('guild_notices')
        .update({ title, content, password: passwordInput })
        .eq('id', editingNotice.id);

      if (error) {
        alert('수정 실패: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('guild_notices')
        .insert([{ guild_id: guildId, title, content, password: passwordInput }]);

      if (error) {
        alert('등록 실패: ' + error.message);
        return;
      }
    }

    setIsModalOpen(false);
    setEditingNotice(null);
    setTitle('');
    setContent('');
    setPasswordInput('');
    fetchNotices(guildId);
  };

  // 비밀번호 확인 후 수정/삭제 분기 실행
  const handleVerifyPasswordAction = () => {
    if (!selectedNoticeItem) return;

    if (selectedNoticeItem.password && selectedNoticeItem.password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (targetAction === 'edit') {
      setEditingNotice(selectedNoticeItem);
      setTitle(selectedNoticeItem.title);
      setContent(selectedNoticeItem.content);
      setPasswordInput(selectedNoticeItem.password || '');
      setIsPasswordModalOpen(false);
      setSelectedDetailNotice(null);
      setIsModalOpen(true);
    } else if (targetAction === 'delete') {
      executeDeleteNotice(selectedNoticeItem.id);
    }
  };

  const executeDeleteNotice = async (id: string) => {
    const { error } = await supabase.from('guild_notices').delete().eq('id', id);
    if (!error && guildId) {
      setIsPasswordModalOpen(false);
      setSelectedNoticeItem(null);
      setSelectedDetailNotice(null);
      fetchNotices(guildId);
    } else {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 엔터 키 입력 시 검색 실행
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  // 검색 초기화
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  // 확정된 검색어(searchQuery)를 기준으로 필터링
  const filteredNotices = notices.filter((notice) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = notice.title?.toLowerCase().includes(query);
    const contentMatch = notice.content?.toLowerCase().includes(query);
    return titleMatch || contentMatch;
  });

  return (
    <NavigationLayout>
      <div className="px-4 space-y-4 animate-in fade-in duration-200 pb-10">
        
        {/* 상단 통합 배너 (제목, 작성 버튼, 검색창 결합) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-stone-200/80 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs shrink-0">
                <FaBullhorn className="text-xs" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
                  길드 공지사항
                </h2>
                <p className="text-[11px] text-stone-500 font-medium mt-0.5 truncate">길드원들에게 전달할 소식과 일정을 확인하세요.</p>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingNotice(null);
                setTitle('');
                setContent('');
                setPasswordInput('');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-pink-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs hover:bg-pink-600 transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
            >
              <FaPlus className="text-xs" /> 공지 작성
            </button>
          </div>

          {/* 통합된 검색창 (엔터 검색 지원) */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <FaSearch className="text-xs" />
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="제목 또는 내용 입력 후 엔터를 누르세요"
              className="w-full pl-9 pr-16 py-2.5 bg-stone-50 rounded-xl outline-none text-xs font-medium border border-stone-200/85 focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all text-stone-800 placeholder-stone-400"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="w-6 h-6 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200/60 flex items-center justify-center transition-all cursor-pointer text-[10px]"
                >
                  <FaTimes />
                </button>
              )}
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                검색
              </button>
            </div>
          </form>
        </div>

        {/* 공지사항 심플 리스트 */}
        <div className="space-y-2.5">
          {filteredNotices.length === 0 ? (
            <div className="text-center py-16 text-stone-400 text-xs bg-white rounded-2xl border border-stone-200/80 shadow-xs font-medium">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 공지사항이 없습니다.'}
            </div>
          ) : (
            filteredNotices.map((notice) => (
              <div 
                key={notice.id} 
                onClick={() => setSelectedDetailNotice(notice)}
                className="bg-white p-4 rounded-2xl shadow-xs border border-stone-200/80 hover:border-pink-300 transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 tracking-tight truncate group-hover:text-pink-600 transition-colors">
                      {notice.title}
                    </h3>
                  </div>
                  <p className="text-xs text-stone-400 font-medium truncate">
                    {notice.content}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-semibold text-stone-400">
                    {new Date(notice.created_at).toLocaleDateString()}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-stone-50 text-stone-400 flex items-center justify-center group-hover:bg-pink-50 group-hover:text-pink-500 transition-all">
                    <FaChevronRight className="text-[10px]" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* [모달 1] 공지 상세 보기 모달 */}
        {selectedDetailNotice && (
          <div 
            onClick={() => setSelectedDetailNotice(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-stone-100 space-y-4"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-semibold text-stone-400">
                    {new Date(selectedDetailNotice.created_at).toLocaleDateString()} 작성됨
                  </span>
                  <h3 className="text-base font-extrabold text-stone-900 tracking-tight leading-snug">
                    {selectedDetailNotice.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedDetailNotice(null)} 
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-all cursor-pointer shrink-0"
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>

              <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-100 max-h-[50vh] overflow-y-auto">
                <p className="text-xs sm:text-sm text-stone-700 whitespace-pre-wrap leading-relaxed font-medium">
                  {selectedDetailNotice.content}
                </p>
              </div>

              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  onClick={() => {
                    setSelectedNoticeItem(selectedDetailNotice);
                    setTargetAction('edit');
                    setConfirmPassword('');
                    setIsPasswordModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <FaEdit className="text-xs" /> 수정
                </button>
                <button
                  onClick={() => {
                    setSelectedNoticeItem(selectedDetailNotice);
                    setTargetAction('delete');
                    setConfirmPassword('');
                    setIsPasswordModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <FaTrashAlt className="text-xs" /> 삭제
                </button>
              </div>
            </div>
          </div>
        )}

        {/* [모달 2] 공지 작성 / 수정 모달 */}
        {isModalOpen && (
          <div 
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-stone-100 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-stone-900">{editingNotice ? '공지사항 수정' : '새 공지사항 등록'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-all cursor-pointer">
                  <FaTimes className="text-xs" />
                </button>
              </div>

              <form onSubmit={handleSaveNotice} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-stone-500 mb-1.5 ml-0.5">제목</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="공지 제목 입력"
                    className="w-full px-4 py-3 bg-stone-50 rounded-2xl outline-none font-medium border border-stone-200 focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-500 mb-1.5 ml-0.5">내용</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="공지 내용을 입력하세요"
                    rows={4}
                    className="w-full px-4 py-3 bg-stone-50 rounded-2xl outline-none font-medium border border-stone-200 focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-500 mb-1.5 ml-0.5">비밀번호 (숫자 설정)</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="수정/삭제 시 사용할 비밀번호"
                    className="w-full px-4 py-3 bg-stone-50 rounded-2xl outline-none font-medium border border-stone-200 focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-pink-500 text-white font-bold py-3.5 rounded-2xl hover:bg-pink-600 transition-all cursor-pointer shadow-xs active:scale-95 mt-2"
                >
                  {editingNotice ? '수정 완료' : '등록하기'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* [모달 3] 비밀번호 확인 모달 (수정/삭제 시) */}
        {isPasswordModalOpen && (
          <div 
            onClick={() => setIsPasswordModalOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[28px] p-6 max-w-xs w-full shadow-2xl border border-stone-100 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto text-base shadow-2xs border border-amber-200/60">
                <FaLock />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-stone-900">비밀번호 확인</h3>
                <p className="text-xs text-stone-500 font-medium">
                  {targetAction === 'edit' ? '공지를 수정하려면' : '공지를 삭제하려면'} 설정된 비밀번호를 입력하세요.
                </p>
              </div>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-4 py-3 bg-stone-50 rounded-2xl outline-none text-xs font-bold border border-stone-200 focus:bg-white focus:ring-2 focus:ring-amber-200 text-center transition-all"
              />

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 bg-stone-100 text-stone-600 py-3 rounded-2xl text-xs font-bold hover:bg-stone-200 transition-all cursor-pointer active:scale-95"
                >
                  취소
                </button>
                <button
                  onClick={handleVerifyPasswordAction}
                  className="flex-1 bg-pink-500 text-white py-3 rounded-2xl text-xs font-bold hover:bg-pink-600 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </NavigationLayout>
  );
}