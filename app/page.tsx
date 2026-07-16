'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('멤버');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nickname.trim()) {
      setError('닉네임을 입력해 주세요.');
      return;
    }

    // 닉네임 유효성 검증
    const { data: user, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .eq('nickname', nickname.trim())
      .single();

    if (dbError || !user) {
      setError('기존 디비에 일치하는 데이터가 없습니다. 닉네임을 다시 확인해 주세요.');
      return;
    }

    // 직급 선택값 검증 (선택한 직급과 DB의 실제 직급 매칭)
    if (user.role !== role) {
      setError(`입력하신 닉네임의 실제 직급은 [${user.role}]입니다. 직급을 올바르게 선택해 주세요.`);
      return;
    }

    sessionStorage.setItem('guild_user', JSON.stringify(user));
    router.push('/list');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] p-4 text-[#78350F]">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border-4 border-lime-600/20 p-8">
        <h1 className="text-4xl font-black text-center text-[#4D7C0F] mb-1">🌿 비옥한 땅</h1>
        <p className="text-center text-sm font-bold text-amber-800 mb-8">모바일 길드 경쟁전 시스템 v1.0</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-lg font-extrabold mb-1.5">길드명</label>
            <input 
              type="text" 
              value="비옥한 땅" 
              readOnly 
              className="w-full p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-amber-900 font-black text-center text-xl cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-lg font-extrabold mb-1.5">직위 선택</label>
            <div className="grid grid-cols-5 gap-1 bg-amber-50 p-2 rounded-2xl border-2 border-amber-200">
              {['길드장', '부길드장', '임원', '정예', '멤버'].map((r) => (
                <label key={r} className="flex flex-col items-center p-2.5 cursor-pointer rounded-xl text-xs font-black gap-1.5">
                  <input 
                    type="radio" 
                    name="role" 
                    value={r} 
                    checked={role === r} 
                    onChange={(e) => setRole(e.target.value)}
                    className="accent-lime-700 w-4 h-4"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-lg font-extrabold mb-1.5">닉네임</label>
            <input 
              type="text" 
              placeholder="닉네임을 정확히 입력해 주세요" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full p-4 border-2 border-amber-200 rounded-2xl focus:border-lime-700 focus:outline-none text-xl text-center font-bold"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-extrabold text-center bg-red-50 p-2 rounded-lg border border-red-200">{error}</p>}

          <button type="submit" className="w-full py-4 bg-lime-700 text-white rounded-2xl font-black text-2xl hover:bg-lime-800 shadow-md transition-all">
            입장하기
          </button>
        </form>
      </div>
    </div>
  );
}