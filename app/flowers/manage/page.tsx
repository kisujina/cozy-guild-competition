'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function FlowerManagePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchWord, setSearchWord] = useState('');
  const [flowers, setFlowers] = useState<any[]>([]);
  
  // 페이징 & 체크박스 다중 삭제/수정 상태 객체
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});
  
  // 변경 추적용 임시 로컬 버퍼 State
  const [localData, setLocalData] = useState<Record<number, { grade: string; name: string }>>({});
  const limit = 10;

  useEffect(() => {
    const session = sessionStorage.getItem('guild_user');
    if (!session) {
      router.push('/');
      return;
    }
    const curUser = JSON.parse(session);
    if (curUser.role !== '길드장' && curUser.role !== '부길드장') {
      alert('길드장 또는 부길드장 전용 관리 영역입니다.');
      router.push('/list');
      return;
    }
    setUser(curUser);
    fetchFlowers(1);
  }, []);

  const fetchFlowers = async (targetPage = 1) => {
    let query = supabase.from('flowers').select('*', { count: 'exact' });
    if (searchWord.trim()) {
      query = query.ilike('name', `%${searchWord.trim()}%`);
    }

    const { data, count } = await query.range((targetPage - 1) * limit, targetPage * limit - 1);
    if (data) {
      setFlowers(data);
      setTotalCount(count || 0);
      setPage(targetPage);

      const buffer: Record<number, { grade: string; name: string }> = {};
      data.forEach((f) => {
        buffer[f.id] = { grade: f.grade, name: f.name };
      });
      setLocalData(buffer);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdate = async () => {
    const activeIds = Object.keys(selectedIds).filter((id) => selectedIds[Number(id)]);
    if (activeIds.length === 0) {
      alert('선택된 데이터가 없습니다');
      return;
    }

    for (const stringId of activeIds) {
      const id = Number(stringId);
      const original = flowers.find((f) => f.id === id);
      const edited = localData[id];

      if (original.name === edited.name && original.grade === edited.grade) {
        alert(`[${original.name}] 데이터가 그대로 입니다.`);
        return;
      }

      const { error } = await supabase
        .from('flowers')
        .update({ name: edited.name, grade: edited.grade })
        .eq('id', id);

      if (error) {
        alert('데이터 수정 진행 중 오류가 발생하였습니다.');
        return;
      }
    }

    alert('성공적으로 변경 사항이 적용되었습니다.');
    setSelectedIds({});
    fetchFlowers(page);
  };

  const handleDelete = async () => {
    const activeIds = Object.keys(selectedIds).filter((id) => selectedIds[Number(id)]);
    if (activeIds.length === 0) {
      alert('선택된 데이터가 없습니다');
      return;
    }

    const selectedFlowers = flowers.filter((f) => selectedIds[f.id]);
    const namesString = selectedFlowers.map((f) => f.name).join(', ');

    if (confirm(`'${namesString}' 삭제 하시겠습니까?`)) {
      const { error } = await supabase.from('flowers').delete().in('id', selectedFlowers.map((f) => f.id));
      if (!error) {
        alert('삭제되었습니다.');
        setSelectedIds({});
        fetchFlowers(1);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12 overflow-x-hidden box-border">
      <Header />

      <div className="px-4 flex-1 space-y-4 w-full box-border pt-2">
        {/* 상단 안내 문구 (메인 화면의 알림 박스와 스타일 통일) */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-amber-100 shadow-sm space-y-2">
          <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
            <span>❣️</span> 새로운 꽃을 등록할 경우, 아래 버튼을 눌러주세요.
          </p>
          <button 
            onClick={() => router.push('/flowers/create')} 
            className="w-full py-3.5 bg-blue-600 text-white font-black text-base rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            🌱 신규 꽃 등록하기
          </button>
        </div>

        {/* 검색 영역 (메인 화면 검색창/검색버튼 디자인과 완벽 통일) */}
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm space-y-2">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="꽃 이름을 입력해 주세요" 
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchFlowers(1); }}
              className="flex-1 p-3.5 border-2 border-amber-200 rounded-2xl font-bold bg-white text-sm focus:outline-none focus:border-[#556B2F]"
            />
            <button 
              onClick={() => fetchFlowers(1)} 
              className="w-14 h-14 bg-[#556B2F] text-white rounded-2xl flex items-center justify-center hover:bg-[#445823] transition-colors shadow-sm shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 꽃 설정 테이블 영역 */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-red-500 px-1">
            ❤️ 체크박스 선택 후에 삭제/수정 버튼을 눌러야 정보가 저장됩니다.
          </p>

          <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead>
                  <tr className="bg-amber-50 text-xs font-black text-amber-900 border-b border-amber-100">
                    <th className="py-3 px-1 w-12">선택</th>
                    <th className="py-3 px-1 w-20">등급</th>
                    <th className="py-3 px-1">꽃 이름</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-extrabold">
                  {flowers.map((f) => (
                    <tr key={f.id} className="border-b border-amber-50 hover:bg-lime-50/20">
                      <td className="py-3 px-1">
                        <input 
                          type="checkbox" 
                          checked={!!selectedIds[f.id]} 
                          onChange={() => toggleSelect(f.id)}
                          className="w-5 h-5 accent-[#556B2F] cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-1">
                        <select 
                          value={localData[f.id]?.grade || f.grade}
                          onChange={(e) => setLocalData({ ...localData, [f.id]: { ...localData[f.id], grade: e.target.value } })}
                          className="border border-amber-200 p-1.5 rounded-xl bg-white text-xs font-bold focus:outline-none focus:border-[#556B2F]"
                        >
                          {['N', 'R', 'SR', 'SSR', 'UR'].map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-2 text-left">
                        <input 
                          type="text" 
                          value={localData[f.id]?.name || ''} 
                          onChange={(e) => setLocalData({ ...localData, [f.id]: { ...localData[f.id], name: e.target.value } })}
                          className="w-full border-b border-dashed border-amber-300 focus:border-[#556B2F] focus:outline-none px-1 py-1 font-bold bg-transparent"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이징 */}
            <div className="flex justify-between items-center p-3 bg-amber-50">
              <button 
                disabled={page === 1} 
                onClick={() => fetchFlowers(page - 1)} 
                className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl text-xs font-black disabled:opacity-50"
              >
                이전
              </button>
              <span className="text-xs font-black text-amber-900">페이지 {page} / {Math.ceil(totalCount / limit) || 1}</span>
              <button 
                disabled={page >= Math.ceil(totalCount / limit)} 
                onClick={() => fetchFlowers(page + 1)} 
                className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl text-xs font-black disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        </div>

        {/* 액션 제어 버튼 */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button 
            onClick={handleDelete} 
            className="py-3.5 bg-red-600 text-white rounded-2xl font-black text-base hover:bg-red-700 transition-colors shadow-sm"
          >
            꽃 정보 삭제
          </button>
          <button 
            onClick={handleUpdate} 
            className="py-3.5 bg-blue-500 text-white rounded-2xl font-black text-base hover:bg-blue-600 transition-colors shadow-sm"
          >
            꽃 정보 수정
          </button>
        </div>
      </div>
    </div>
  );
}