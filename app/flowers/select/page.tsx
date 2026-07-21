'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function FlowerSelectPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [grade, setGrade] = useState('N');
  const [searchWord, setSearchWord] = useState('');
  const [flowers, setFlowers] = useState<any[]>([]);
  
  // 페이징 & 체크박스 다중 선택 메모리 상태
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>({}); // flower_id: 보유여부(true/false)
  const [allCount, setAllCount] = useState(0);
  const [gradeCount, setGradeCount] = useState(0);
  const limit = 10;

  useEffect(() => {
    const session = sessionStorage.getItem('guild_user');
    if (!session) {
      router.push('/');
      return;
    }
    const curUser = JSON.parse(session);
    setUser(curUser);
    loadCounts();
    loadUserOwnedFlowers(curUser.id);
  }, []);

  useEffect(() => {
    if (user) {
      fetchFlowers(1);
    }
  }, [grade, user]);

  const loadCounts = async () => {
    const { count: total } = await supabase.from('flowers').select('*', { count: 'exact', head: true });
    setAllCount(total || 0);
  };

  const loadUserOwnedFlowers = async (userId: string) => {
    const { data } = await supabase.from('user_flowers').select('flower_id, is_owned').eq('user_id', userId).eq('is_owned', 'Y');
    if (data) {
      const initialChecked: Record<number, boolean> = {};
      data.forEach((item) => {
        initialChecked[item.flower_id] = true;
      });
      setCheckedMap(initialChecked);
    }
  };

  const fetchFlowers = async (targetPage = 1) => {
    let query = supabase
      .from('flowers')
      .select('*', { count: 'exact' })
      .eq('grade', grade);

    if (searchWord.trim()) {
      query = query.ilike('name', `%${searchWord.trim()}%`);
    }

    const { data, count } = await query;
    if (data) {
      const sortedData = [...data].sort((a, b) => {
        const aOwned = checkedMap[a.id] ? 1 : 0;
        const bOwned = checkedMap[b.id] ? 1 : 0;
        return bOwned - aOwned;
      });

      setGradeCount(count || 0);
      setTotalCount(count || 0);
      setFlowers(sortedData.slice((targetPage - 1) * limit, targetPage * limit));
      setPage(targetPage);
    }
  };

  const handleCheckboxChange = (flowerId: number, checked: boolean) => {
    setCheckedMap((prev) => ({
      ...prev,
      [flowerId]: checked,
    }));
  };

  // 전체 선택/해제 핸들러
  const handleToggleAll = (checked: boolean) => {
    const newCheckedMap = { ...checkedMap };
    flowers.forEach((f) => {
      newCheckedMap[f.id] = checked;
    });
    setCheckedMap(newCheckedMap);
  };

  const handleSave = async () => {
    if (!user) return;

    const { data: allFlowerList } = await supabase.from('flowers').select('id');
    if (!allFlowerList) return;

    const upsertPayload = allFlowerList.map((f) => ({
      user_id: user.id,
      flower_id: f.id,
      is_owned: checkedMap[f.id] ? 'Y' : 'N',
    }));

    const { error } = await supabase.from('user_flowers').upsert(upsertPayload, { onConflict: 'user_id,flower_id' });

    if (error) {
      alert('보유 꽃 등록 도중 오류가 발생했습니다.');
    } else {
      alert('보유 꽃 정보가 정상적으로 등록/수정 되었습니다.');
      router.push('/list');
    }
  };

  // 현재 페이지의 꽃들이 모두 체크되어 있는지 확인
  const isAllPageChecked = flowers.length > 0 && flowers.every(f => checkedMap[f.id]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12">
      <Header />
      <div className="px-4 flex-1">
        <p className="text-sm font-bold text-red-500">1️⃣꽃의 등급에 맞는 이름이 있어야 검색이 됩니다. </p>
        <p className="text-sm font-bold text-red-500">2️⃣체크박스 선택 시 보유 꽃, 체크 박스 해제 시 미보유 꽃이 됩니다. </p>
        <p className="text-sm font-bold text-red-500">3️⃣체크박스 선택 후에 수정 버튼을 눌러야 정보가 저장됩니다. </p>
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm mb-6">
          <label className="block text-lg font-extrabold mb-2">등급 필터</label>
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {['N', 'R', 'SR', 'SSR', 'UR'].map((g) => (
              <label key={g} className="flex flex-col items-center bg-amber-50 py-2 rounded-xl cursor-pointer font-black text-sm border border-amber-200">
                <input 
                  type="radio" 
                  name="grade" 
                  value={g} 
                  checked={grade === g}
                  onChange={(e) => setGrade(e.target.value)}
                  className="accent-lime-700 w-4 h-4 mb-1"
                />
                <span>{g}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="꽃 이름 검색" 
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="flex-1 p-3 border-2 border-amber-200 rounded-xl font-bold"
            />
            <button onClick={() => fetchFlowers(1)} className="bg-lime-700 text-white px-4 rounded-xl font-extrabold">검색</button>
          </div>

          <p className="text-right text-xs font-black text-lime-700 mt-2.5">
            해당 등급의 꽃: {gradeCount}개 / 모든 등급의 꽃: {allCount}개
          </p>
        </div>

        <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm overflow-hidden mb-6">
          <table className="w-full text-center">
            <thead>
              <tr className="bg-amber-50 text-sm font-black text-amber-900 border-b border-amber-100">
                <th className="py-3 px-1">
                  <input 
                    type="checkbox" 
                    checked={isAllPageChecked}
                    onChange={(e) => handleToggleAll(e.target.checked)}
                    className="w-5 h-5 accent-lime-700"
                  />
                </th>
                <th className="py-3 px-1">등급</th>
                <th className="py-3 px-1">꽃 이름</th>
                <th className="py-3 px-1">보유</th>
              </tr>
            </thead>
            <tbody className="text-xl font-extrabold">
              {flowers.map((f) => {
                const isOwned = !!checkedMap[f.id];
                return (
                  <tr key={f.id} className="border-b border-amber-50 hover:bg-lime-50/20">
                    <td className="py-4 px-1">
                      <input 
                        type="checkbox" 
                        checked={isOwned}
                        onChange={(e) => handleCheckboxChange(f.id, e.target.checked)}
                        className="w-6 h-6 accent-lime-700"
                      />
                    </td>
                    <td className="py-4 px-1 text-sm">{f.grade}</td>
                    <td className="py-4 px-1 font-black text-left pl-3">{f.name}</td>
                    <td className="py-4 px-1">
                      <span className={`px-2 py-1 rounded-lg text-sm ${isOwned ? 'bg-lime-100 text-lime-800' : 'bg-red-50 text-red-600'}`}>
                        {isOwned ? 'O' : 'X'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between items-center p-3.5 bg-amber-50">
            <button 
              disabled={page === 1}
              onClick={() => fetchFlowers(page - 1)}
              className="px-4 py-2 bg-white border-2 border-amber-200 rounded-xl text-sm font-black disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm font-black">페이지 {page} / {Math.ceil(totalCount / limit) || 1}</span>
            <button 
              disabled={page >= Math.ceil(totalCount / limit)}
              onClick={() => fetchFlowers(page + 1)}
              className="px-4 py-2 bg-white border-2 border-amber-200 rounded-xl text-sm font-black disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-1">
          <button onClick={handleSave} className="py-3 bg-blue-500 text-white font-black rounded-2xl text-lg hover:bg-blue-800">보유 꽃 수정하기</button>
          {/* <button onClick={() => router.push('/list')} className="py-4 bg-amber-200 text-[#78350F] rounded-2xl font-black text-lg">돌아가기</button> */}
          {/* <button onClick={() => router.push('/guild/mission')} className="py-4 bg-amber-100 text-[#78350F] rounded-2xl font-black text-lg">임무 설정 페이지로</button> */}
        </div>
      </div>
    </div>
  );
}