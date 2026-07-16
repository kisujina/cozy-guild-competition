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
  
  // 페이징 & 체크박스 다중 삭제 상태 객체
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

    // 변경사항 점검
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
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12">
      <Header />

      <div className="px-4 flex-1">
        <div className="flex flex-col gap-3 mb-6">
          <button onClick={() => router.push('/flowers/create')} className="w-full py-4 bg-lime-700 text-white font-black text-xl rounded-2xl">
            🌱 신규 꽃 등록하기
          </button>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="꽃 이름 검색" 
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="flex-1 p-3.5 border-2 border-amber-200 rounded-xl"
            />
            <button onClick={() => fetchFlowers(1)} className="bg-lime-700 text-white px-5 rounded-xl font-bold">검색</button>
          </div>
        </div>

        {/* 꽃 설정 테이블 */}
        <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm overflow-hidden mb-6">
          <table className="w-full text-center">
            <thead>
              <tr className="bg-amber-50 text-sm font-black text-amber-900 border-b border-amber-100">
                <th className="py-3 px-1">선택</th>
                <th className="py-3 px-1">등급</th>
                <th className="py-3 px-1">꽃 이름</th>
              </tr>
            </thead>
            <tbody className="text-xl font-extrabold">
              {flowers.map((f) => (
                <tr key={f.id} className="border-b border-amber-50">
                  <td className="py-4 px-1">
                    <input 
                      type="checkbox" 
                      checked={!!selectedIds[f.id]} 
                      onChange={() => toggleSelect(f.id)}
                      className="w-6 h-6 accent-lime-700"
                    />
                  </td>
                  <td className="py-4 px-1">
                    <select 
                      value={localData[f.id]?.grade || f.grade}
                      onChange={(e) => setLocalData({ ...localData, [f.id]: { ...localData[f.id], grade: e.target.value } })}
                      className="border border-amber-200 p-1 rounded-xl bg-white"
                    >
                      {['N', 'R', 'SR', 'SSR', 'UR'].map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </td>
                  <td className="py-4 px-1 text-left">
                    <input 
                      type="text" 
                      value={localData[f.id]?.name || ''} 
                      onChange={(e) => setLocalData({ ...localData, [f.id]: { ...localData[f.id], name: e.target.value } })}
                      className="w-full border-b border-dashed border-amber-300 focus:border-lime-700 focus:outline-none px-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 페이징 */}
          <div className="flex justify-between items-center p-3 bg-amber-50">
            <button disabled={page === 1} onClick={() => fetchFlowers(page - 1)} className="px-4 py-2 bg-white border-2 border-amber-200 rounded-xl text-sm font-black">이전</button>
            <span className="text-sm font-black">페이지 {page} / {Math.ceil(totalCount / limit) || 1}</span>
            <button disabled={page >= Math.ceil(totalCount / limit)} onClick={() => fetchFlowers(page + 1)} className="px-4 py-2 bg-white border-2 border-amber-200 rounded-xl text-sm font-black">다음</button>
          </div>
        </div>

        {/* 액션 제어 */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleUpdate} className="py-4 bg-lime-700 text-white rounded-2xl font-black text-lg">꽃 정보 수정</button>
          <button onClick={handleDelete} className="py-4 bg-red-600 text-white rounded-2xl font-black text-lg">삭제</button>
          {/* <button onClick={() => router.push('/list')} className="py-4 bg-amber-200 text-amber-900 rounded-2xl font-black text-lg">홈으로</button> */}
        </div>
      </div>
    </div>
  );
}