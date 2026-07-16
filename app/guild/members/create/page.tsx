'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function CreateMemberPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [vip, setVip] = useState('N'); // 기본 N

  const handleRegister = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 정확히 작성해 주세요.');
      return;
    }

    // 이미 존재하는 닉네임 유효성 검증
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', nickname.trim())
      .maybeSingle();

    if (existing) {
      alert('이미 등록된 동일한 이름의 닉네임이 존재합니다.');
      return;
    }

    const { error } = await supabase.from('profiles').insert({
      nickname: nickname.trim(),
      role: '멤버', // 기본 멤버 고정
      is_vip: vip,
    });

    if (error) {
      alert('데이터 등록 중 문제가 발견되었습니다.');
    } else {
      alert(`[비옥한 땅] 길드 가입 안내가 등록되었습니다. 새로운 길드원 ${nickname}님, 가입을 환영합니다! 🌱`);
      router.push('/guild/members');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12">
      <Header />
      <div className="px-4 space-y-6">
        <h2 className="text-2xl font-black text-center">👥 뉴비 등록하기</h2>

        <div className="bg-white p-5 rounded-2xl border-2 border-amber-100 shadow-sm space-y-4">
          <div>
            <label className="block text-lg font-extrabold mb-1.5">직급 (기본값)</label>
            <input 
              type="text" 
              value="멤버" 
              readOnly 
              className="w-full p-4 bg-amber-50 border-2 border-amber-200 rounded-xl text-center font-bold text-lg cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-lg font-extrabold mb-1.5">신규 닉네임 입력</label>
            <input 
              type="text" 
              placeholder="뉴비의 닉네임을 입력하세요" 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              className="w-full p-4 border-2 border-amber-200 rounded-xl font-bold text-lg"
            />
          </div>

          <div>
            <label className="block text-lg font-extrabold mb-2">VIP 여부</label>
            <div className="grid grid-cols-2 gap-3">
              {['Y', 'N'].map((v) => (
                <label key={v} className={`flex items-center justify-center py-3 border-2 rounded-xl cursor-pointer font-black text-lg ${
                  vip === v ? 'bg-lime-50 border-lime-600' : 'bg-amber-50 border-amber-200'
                }`}>
                  <input type="radio" value={v} checked={vip === v} onChange={() => setVip(v)} className="hidden" />
                  <span>{v === 'Y' ? 'VIP 우대' : '일반'}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleRegister} className="py-4 bg-lime-700 text-white rounded-2xl font-black text-lg">등록</button>
          <button onClick={() => router.push('/guild/members')} className="py-4 bg-amber-200 rounded-2xl font-black text-lg">취소</button>
        </div>
      </div>
    </div>
  );
}