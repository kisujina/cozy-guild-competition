'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function CreateMemberPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [vip, setVip] = useState('N'); // 기본 N

  useEffect(() => {
    const session = sessionStorage.getItem('guild_user');
    if (!session) {
      router.push('/');
      return;
    }
    const curUser = JSON.parse(session);
    if (curUser.role !== '길드장' && curUser.role !== '부길드장') {
      alert('운영진 전용 관리 영역입니다.');
      router.push('/list');
      return;
    }
  }, []);

  const handleRegister = async () => {
      if (!nickname.trim()) {
        alert('닉네임을 정확히 작성해 주세요.');
        return;
      }

      // 1. 현재 로그인된 사용자의 길드 ID 가져오기
      const session = sessionStorage.getItem('guild_user');
      if (!session) return;
      const curUser = JSON.parse(session);
      const currentGuildId = curUser.guild_id;

      if (!currentGuildId) {
        alert('길드 정보가 유효하지 않습니다.');
        return;
      }

      // 2. 현재 길드 내에서 동일한 닉네임이 있는지 검증 (필요시 전체 검증으로 유지 가능)
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('guild_id', currentGuildId) // 같은 길드 내 중복 체크로 변경 권장
        .eq('nickname', nickname.trim())
        .maybeSingle();

      if (existing) {
        alert('우리 길드에 이미 등록된 동일한 이름의 닉네임이 존재합니다.');
        return;
      }

      // 3. insert 시 반드시 guild_id 포함하기
      const { error } = await supabase.from('profiles').insert({
        nickname: nickname.trim(),
        role: '멤버',
        is_vip: vip,
        guild_id: currentGuildId, // 👈 이 부분이 반드시 들어가야 합니다!
      });

      if (error) {
        alert('데이터 등록 중 문제가 발견되었습니다.');
      } else {
        alert(`새로운 길드원 ${nickname}님, 가입을 환영합니다! 🌱`);
        router.push('/guild/members'); // 👈 실제 관리 페이지 경로에 맞게 수정
      }
    };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12 overflow-x-hidden box-border">
      <Header />

      <div className="px-4 flex-1 space-y-4 w-full box-border pt-2">
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm space-y-4">
          <h2 className="text-base font-black text-amber-900 border-b border-amber-100 pb-2 flex items-center gap-1.5">
            <span>👥</span> 뉴비 등록하기
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">직급 (기본값)</label>
              <input 
                type="text" 
                value="멤버" 
                readOnly 
                className="w-full p-3.5 bg-amber-50 border-2 border-amber-200 rounded-2xl text-center font-bold text-sm text-amber-900 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">신규 닉네임 입력</label>
              <input 
                type="text" 
                placeholder="뉴비의 닉네임을 입력하세요" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') handleRegister(); }}
                className="w-full p-3.5 border-2 border-amber-200 rounded-2xl font-bold bg-white text-sm focus:outline-none focus:border-[#556B2F]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">VIP 여부</label>
              <div className="grid grid-cols-2 gap-2">
                {['Y', 'N'].map((v) => (
                  <label key={v} className={`flex items-center justify-center py-3 border-2 rounded-2xl cursor-pointer font-black text-sm transition-colors ${
                    vip === v ? 'bg-[#556B2F]/10 border-[#556B2F] text-[#556B2F]' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <input type="radio" value={v} checked={vip === v} onChange={() => setVip(v)} className="hidden" />
                    <span>{v === 'Y' ? 'VIP 우대' : '일반'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button 
            onClick={() => router.push('/guild/members')} 
            className="py-3.5 bg-gray-300 text-gray-700 rounded-2xl font-black text-base hover:bg-gray-400 transition-colors shadow-sm"
          >
            취소
          </button>
          <button 
            onClick={handleRegister} 
            className="py-3.5 bg-[#556B2F] text-white rounded-2xl font-black text-base hover:bg-[#445823] transition-colors shadow-sm"
          >
            뉴비 등록
          </button>
        </div>
      </div>
    </div>
  );
}