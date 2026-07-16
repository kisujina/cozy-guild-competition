'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function CreateFlowerPage() {
  const router = useRouter();
  const [grade, setGrade] = useState('N');
  const [name, setName] = useState('');

  const handleRegister = async () => {
    if (!name.trim()) {
      alert('꽃 이름을 입력해 주세요.');
      return;
    }

    const { error } = await supabase.from('flowers').insert({ name: name.trim(), grade });
    if (error) {
      alert('중복 등록이거나 네트워크 통신 장애가 생겼습니다.');
    } else {
      alert(`신규 꽃 '${name}' 등록 완료!`);
      router.push('/flowers/manage');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12">
      <Header />
      <div className="px-4 space-y-6">
        <h2 className="text-2xl font-black text-center">🌱 신규 꽃 등록하기</h2>

        <div className="bg-white p-5 rounded-2xl border-2 border-amber-100 shadow-sm space-y-4">
          <div>
            <label className="block text-lg font-extrabold mb-2">등급 선택</label>
            <div className="grid grid-cols-5 gap-1.5">
              {['N', 'R', 'SR', 'SSR', 'UR'].map((g) => (
                <label key={g} className={`flex flex-col items-center py-2.5 rounded-xl cursor-pointer font-black text-sm border-2 ${
                  grade === g ? 'bg-lime-50 border-lime-600' : 'bg-amber-50 border-amber-200'
                }`}>
                  <input type="radio" value={g} checked={grade === g} onChange={() => setGrade(g)} className="hidden" />
                  <span>{g}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-lg font-extrabold mb-1.5">꽃 이름</label>
            <input 
              type="text" 
              placeholder="새로운 꽃 이름을 적어 주세요" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full p-4 border-2 border-amber-200 rounded-2xl font-bold text-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleRegister} className="py-4 bg-lime-700 text-white rounded-2xl font-black text-lg">등록</button>
          <button onClick={() => router.push('/flowers/manage')} className="py-4 bg-amber-200 rounded-2xl font-black text-lg">취소</button>
        </div>
      </div>
    </div>
  );
}