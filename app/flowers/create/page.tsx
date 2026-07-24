'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function CreateFlowerPage() {
  const router = useRouter();
  const [grade, setGrade] = useState('N');
  const [name, setName] = useState('');

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
    if (!name.trim()) {
      alert('꽃 이름을 입력해 주세요.');
      return;
    }

    const { error } = await supabase.from('flowers').insert({ name: name.trim(), grade });
    if (error) {
      alert('중복 등록이거나 네트워크 통신 장애가 생겼습니다.');
    } else {
      alert(`신규 꽃 '${name}' 등록 완료! 🎉`);
      router.push('/flowers/manage');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12 overflow-x-hidden box-border">
      <Header />

      <div className="px-4 flex-1 space-y-4 w-full box-border pt-2">
        {/* 상단 경고 문구 추가 */}
        <div className="px-1">
          <p className="p-2.5 text-xs font-bold text-red-500 bg-red-50 rounded-xl border border-red-100 flex items-center gap-1">
            <span>⚠️</span> 새로 생긴 꽃을 등록하는 화면입니다. 정확히 입력해주세요.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm space-y-4">
          <h2 className="text-base font-black text-amber-900 border-b border-amber-100 pb-2 flex items-center gap-1.5">
            <span>🌱</span> 신규 꽃 등록하기
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">등급 선택</label>
              <div className="grid grid-cols-5 gap-1.5">
                {['N', 'R', 'SR', 'SSR', 'UR'].map((g) => (
                  <label key={g} className={`flex flex-col items-center py-2.5 rounded-xl cursor-pointer font-black text-xs border-2 transition-colors ${
                    grade === g ? 'bg-[#556B2F]/10 border-[#556B2F] text-[#556B2F]' : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <input type="radio" value={g} checked={grade === g} onChange={() => setGrade(g)} className="hidden" />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1">꽃 이름</label>
              <input 
                type="text" 
                placeholder="새로운 꽃 이름을 적어 주세요" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') handleRegister(); }}
                className="w-full p-3.5 border-2 border-amber-200 rounded-2xl font-bold bg-white text-sm focus:outline-none focus:border-[#556B2F]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button 
            onClick={() => router.push('/flowers/manage')} 
            className="py-3.5 bg-gray-300 text-gray-700 rounded-2xl font-black text-base hover:bg-gray-400 transition-colors shadow-sm cursor-pointer"
          >
            취소
          </button>
          <button 
            onClick={handleRegister} 
            className="py-3.5 bg-[#556B2F] text-white rounded-2xl font-black text-base hover:bg-[#445823] transition-colors shadow-sm cursor-pointer"
          >
            등록 완료
          </button>
        </div>
      </div>
    </div>
  );
}