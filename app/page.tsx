'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaLock, FaUsers, FaRegQuestionCircle, FaRocket, FaSeedling, FaUserTag } from 'react-icons/fa';

export default function LoginPage() {
  const router = useRouter();
  const [guildName, setGuildName] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  
  // 신규 등록 및 최초 비밀번호 설정 시 사용할 입력 상태
  const [newPassword, setNewPassword] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'register' | 'no_password' | 'error'>('register');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const savedGuild = localStorage.getItem('guild_name');
    const savedNick = localStorage.getItem('user_nickname');
    const savedPw = localStorage.getItem('guild_password');
    if (savedGuild) setGuildName(savedGuild);
    if (savedNick) setNickname(savedNick);
    if (savedPw) setPassword(savedPw);
  }, []);

  // 로그인 시도 핸들러
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedGuildName = guildName.trim();
    const trimmedNickname = nickname.trim();

    if (!trimmedGuildName) {
      alert('길드명을 입력해주세요.');
      return;
    }

    if (!trimmedNickname) {
      alert('닉네임(내 캐릭터명)을 입력해주세요.');
      return;
    }

    // 1. 길드 존재 여부 확인
    const { data: guild, error } = await supabase
      .from('guild_settings')
      .select('*')
      .eq('guild_name', trimmedGuildName)
      .single();

    // 존재하지 않는 길드인 경우 -> 신규 길드 등록 팝업
    if (error || !guild) {
      setNewPassword('');
      setModalType('register');
      setIsModalOpen(true);
      return;
    }

    // 2. profiles 테이블을 조회하여 해당 길드(guild_id)에 입력한 닉네임이 존재하는지 검증
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('guild_id', guild.id)
      .eq('nickname', trimmedNickname)
      .maybeSingle();

    if (profileError || !profileData) {
      setErrorMessage(`'${trimmedGuildName}' 길드에 등록되지 않은 닉네임입니다. 닉네임을 다시 확인해주세요.`);
      setModalType('error');
      setIsModalOpen(true);
      return;
    }

    // 3. 이미 존재하는 길드인 경우 비밀번호 검증
    if (guild.password) {
      if (!password) {
        setErrorMessage('비밀번호가 설정된 길드입니다. 비밀번호를 입력해주세요.');
        setModalType('error');
        setIsModalOpen(true);
        return;
      }
      if (guild.password !== password) {
        setErrorMessage('비밀번호가 일치하지 않습니다.');
        setModalType('error');
        setIsModalOpen(true);
        return;
      }
    } else {
      // 4. 비밀번호가 아예 설정되지 않은 길드 -> 최초 설정 모달 띄우기
      setNewPassword('');
      setModalType('no_password');
      setIsModalOpen(true);
      return;
    }

    // 정상 로그인 처리 및 정보 저장 (user_id도 함께 저장하여 유저별 데이터 연동에 활용)
    localStorage.setItem('guild_name', trimmedGuildName);
    localStorage.setItem('user_nickname', trimmedNickname);
    localStorage.setItem('guild_password', password);
    localStorage.setItem('guild_id', guild.id.toString());
    localStorage.setItem('user_id', profileData.id); // profiles 테이블의 uuid
    router.push('/flowers/select');
  };

  // 신규 길드 생성 핸들러
  const handleRegisterGuild = async () => {
    const trimmedName = guildName.trim();
    const trimmedNickname = nickname.trim();
    
    const { data, error } = await supabase
      .from('guild_settings')
      .insert([{ guild_name: trimmedName, password: newPassword }])
      .select()
      .single();

    if (error) {
      alert('길드 등록 중 오류가 발생했습니다: ' + error.message);
      return;
    }

    // 신규 길드 생성 시 해당 닉네임을 가진 프로필이 없다면 새로 만들어주거나 연동 처리가 필요할 수 있습니다.
    // 우선 길드 설정 저장 후 메인으로 이동하도록 처리합니다.
    localStorage.setItem('guild_name', trimmedName);
    localStorage.setItem('user_nickname', trimmedNickname);
    localStorage.setItem('guild_password', newPassword);
    localStorage.setItem('guild_id', data.id.toString());
    setIsModalOpen(false);
    router.push('/flowers/select');
  };

  // 비밀번호가 없던 길드에 최초 비밀번호 설정 핸들러
  const handleSetFirstPassword = async () => {
    const trimmedName = guildName.trim();
    const trimmedNickname = nickname.trim();

    if (!newPassword.trim()) {
      alert('설정할 비밀번호를 입력해주세요.');
      return;
    }

    const { data, error } = await supabase
      .from('guild_settings')
      .update({ password: newPassword })
      .eq('guild_name', trimmedName)
      .select()
      .single();

    if (error) {
      alert('비밀번호 설정 중 오류가 발생했습니다: ' + error.message);
      return;
    }

    localStorage.setItem('guild_name', trimmedName);
    localStorage.setItem('user_nickname', trimmedNickname);
    localStorage.setItem('guild_password', newPassword);
    localStorage.setItem('guild_id', data.id.toString());
    setIsModalOpen(false);
    router.push('/flowers/select');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] p-4 text-slate-700 relative">
      
      {/* 메인 카드 컨테이너 */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 border border-stone-100/80 relative">
        
        {/* 상단 우측 문의 버튼 */}
        <div className="absolute top-5 right-5">
          <a
            href="https://open.kakao.com/o/svKuCxFi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 shadow-xs hover:bg-stone-100 transition border border-stone-200/60"
          >
            <FaRegQuestionCircle className="text-amber-400 text-xs" />
            문의
          </a>
        </div>

        {/* 로고 및 타이틀 섹션 */}
        <div className="text-center mb-8 mt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-50 text-pink-400 text-2xl mb-3 shadow-inner">
            <FaSeedling />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">길드해</h1>
          <p className="text-xs text-slate-400 mt-1">길드원들과 함께하는 꽃 도감 & 길드전</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 ml-1">길드명</label>
            <div className="relative">
              <FaUsers className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
              <input
                type="text"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                placeholder="길드명을 입력하세요"
                className="w-full pl-10 pr-4 py-3 bg-stone-50/70 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none text-sm text-slate-800 transition-all border border-stone-200/60"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 ml-1">닉네임</label>
            <div className="relative">
              <FaUserTag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="게임 내 닉네임을 입력하세요"
                className="w-full pl-10 pr-4 py-3 bg-stone-50/70 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none text-sm text-slate-800 transition-all border border-stone-200/60"
                required
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 ml-1">길드 공용 비밀번호</label>
            <div className="relative">
              <FaLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 (없을 시 생략)"
                className="w-full pl-10 pr-4 py-3 bg-stone-50/70 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none text-sm text-slate-800 transition-all border border-stone-200/60"
              />
            </div>
          </div>

          <div className="pt-1 space-y-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#E88DA5] text-white font-medium py-3.5 rounded-xl hover:bg-[#DE7A95] transition-all shadow-md shadow-pink-100 active:scale-[0.98] text-sm cursor-pointer"
            >
              <FaRocket className="text-xs" />
              접속하기
            </button>
          </div>
        </form>
      </div>

      {/* 모달 팝업 영역 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl border border-stone-100">
            
            {/* 1. 신규 길드 등록 모달 */}
            {modalType === 'register' && (
              <>
                <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-400 flex items-center justify-center mx-auto mb-3 text-xl shadow-inner">✨</div>
                <h3 className="text-lg font-bold mb-2 text-slate-800">신규 길드 등록</h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  존재하지 않는 길드명입니다.<br/>사용할 비밀번호를 입력하고 등록하세요!
                </p>
                
                <div className="mb-4 text-left">
                  <label className="block text-xs font-semibold text-slate-500 ml-1 mb-1">새 비밀번호 설정</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="사용할 비밀번호 입력"
                    className="w-full px-4 py-2.5 bg-stone-50 rounded-xl outline-none text-xs border border-stone-200 focus:ring-2 focus:ring-pink-200"
                  />
                </div>

                <div className='flex gap-2'>
                   <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-stone-100 text-slate-600 font-medium py-2.5 rounded-xl hover:bg-stone-200 transition text-xs cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleRegisterGuild}
                    className="flex-1 bg-[#E88DA5] text-white font-medium py-2.5 rounded-xl hover:bg-[#DE7A95] transition text-xs shadow-sm shadow-pink-100 cursor-pointer"
                  >
                    등록 및 접속
                  </button>
                </div>
              </>
            )}

            {/* 2. 비밀번호 미설정 길드 최초 등록 모달 */}
            {modalType === 'no_password' && (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-400 flex items-center justify-center mx-auto mb-3 text-xl shadow-inner">🔒</div>
                <h3 className="text-lg font-bold mb-2 text-slate-800">비밀번호 최초 등록</h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  이 길드는 아직 비밀번호가 없습니다.<br/>사용하실 비밀번호를 설정해주세요!
                </p>
                
                <div className="mb-4 text-left">
                  <label className="block text-xs font-semibold text-slate-500 ml-1 mb-1">최초 비밀번호 설정</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호 입력"
                    className="w-full px-4 py-2.5 bg-stone-50 rounded-xl outline-none text-xs border border-stone-200 focus:ring-2 focus:ring-pink-200"
                  />
                </div>

                <div className='flex gap-2'>
                   <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-stone-100 text-slate-600 font-medium py-2.5 rounded-xl hover:bg-stone-200 transition text-xs cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSetFirstPassword}
                    className="flex-1 bg-[#E88DA5] text-white font-medium py-2.5 rounded-xl hover:bg-[#DE7A95] transition text-xs shadow-sm shadow-pink-100 cursor-pointer"
                  >
                    설정하고 접속
                  </button>
                </div>
              </>
            )}

            {/* 3. 에러 발생 모달 */}
            {modalType === 'error' && (
              <>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-400 flex items-center justify-center mx-auto mb-3 text-xl shadow-inner">⚠️</div>
                <h3 className="text-lg font-bold mb-2 text-rose-600">접속 오류</h3>
                <p className="text-xs text-rose-600 mb-6 leading-relaxed bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                  {errorMessage}
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-stone-100 text-slate-600 font-medium py-2.5 rounded-xl hover:bg-stone-200 transition text-xs cursor-pointer"
                >
                  확인
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}