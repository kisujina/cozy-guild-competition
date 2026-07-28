'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Search, X } from 'lucide-react';

export default function FlowerSelectPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [grade, setGrade] = useState('ALL'); // 기본값을 'ALL'(전체)로 변경
  const [searchWord, setSearchWord] = useState('');
  const [flowers, setFlowers] = useState<any[]>([]);
  
  // 실시간 꽃 검색 힌트 리스트 상태 및 팝업 제어 플래그
  const [suggestedFlowers, setSuggestedFlowers] = useState<any[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  
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

  // 실시간 꽃 이름 자동완성/추천 검색어 조회 (한글 자음/모음 입력 대응)
  useEffect(() => {
    if (isSelecting) {
      setSuggestedFlowers([]);
      return;
    }

    const fetchFlowerHints = async () => {
      if (!searchWord.trim()) {
        setSuggestedFlowers([]);
        return;
      }

      const cleanKeyword = searchWord.trim().replace(/\s+/g, '');
      let query = supabase.from('flowers').select('*');
      if (grade !== 'ALL') {
        query = query.eq('grade', grade);
      }
      const { data, error } = await query;

      if (!error && data) {
        // 자음, 모음 또는 일반 단어가 포함되어 있는지 정규식 또는 문자열 포함 여부로 체크
        const filtered = data.filter((f: any) => {
          const cleanName = f.name.replace(/\s+/g, '');
          try {
            // 자음/모음만 입력된 경우도 에러 없이 정규식 생성
            const regex = new RegExp(cleanKeyword);
            return cleanName.includes(cleanKeyword) || regex.test(cleanName);
          } catch {
            return cleanName.includes(cleanKeyword);
          }
        });
        setSuggestedFlowers(filtered);
      }
    };

    const timer = setTimeout(() => {
      fetchFlowerHints();
    }, 200);

    return () => clearTimeout(timer);
  }, [searchWord, grade, isSelecting]);

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
    setIsSelecting(true); // 검색 실행 시 자동완성 창 닫기
    setSuggestedFlowers([]);

    let query = supabase
      .from('flowers')
      .select('*', { count: 'exact' });

    if (grade !== 'ALL') {
      query = query.eq('grade', grade);
    }

    const trimmedSearch = searchWord.trim();
    if (trimmedSearch) {
      // 자음/모음 혹은 일반 검색어 모두 대응하도록 ilike 적용
      query = query.ilike('name', `%${trimmedSearch}%`);
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

  // 검색창 데이터 초기화 함수
  const handleResetSearch = () => {
    setSearchWord('');
    setSuggestedFlowers([]);
    setIsSelecting(false);
    fetchFlowers(1);
  };

  const handleCheckboxChange = (flowerId: number, checked: boolean) => {
    setCheckedMap((prev) => ({
      ...prev,
      [flowerId]: checked,
    }));
  };

  const handleToggleAll = (checked: boolean) => {
    const newCheckedMap = { ...checkedMap };
    flowers.forEach((f) => {
      newCheckedMap[f.id] = checked;
    });
    setCheckedMap(newCheckedMap);
  };

  const handleSave = async () => {
    if (!user) return;

    const { data: allFlowerList, error: flowerError } = await supabase.from('flowers').select('id');
    if (flowerError || !allFlowerList) {
      alert('꽃 목록을 불러오는 중 오류가 발생했습니다.');
      return;
    }

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
    }
  };

  const isAllPageChecked = flowers.length > 0 && flowers.every(f => checkedMap[f.id]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12 overflow-x-hidden box-border">
      <Header />
      
      <div className="px-4 flex-1 space-y-4 w-full box-border pt-2">
        {/* 안내 문구 영역 */}
        <div className="p-3 bg-red-50 rounded-2xl border border-red-100 space-y-1">
          <p className="text-xs font-bold text-red-500">📌꽃이 없을 경우 길드장/부길드장에게 알려주세요.</p>
          <p className="text-xs font-bold text-red-500">1️⃣ 꽃의 등급에 맞는 이름이 있어야 검색이 됩니다.</p>
          <p className="text-xs font-bold text-red-500">2️⃣ 체크박스 선택 시 보유 꽃, 해제 시 미보유 꽃입니다.</p>
          <p className="text-xs font-bold text-red-500">3️⃣ 체크박스 선택 후에 수정 버튼을 눌러야 저장됩니다.</p>
        </div>

        {/* 등급 필터 및 검색 영역 */}
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm space-y-3">
          <label className="block text-base font-extrabold">등급 필터</label>
          <div className="grid grid-cols-6 gap-1">
            {['ALL', 'N', 'R', 'SR', 'SSR', 'UR'].map((g) => (
              <label key={g} className={`flex flex-col items-center py-2 rounded-xl cursor-pointer font-black text-xs border-2 transition-colors ${
                grade === g ? 'bg-lime-50 border-lime-600 text-lime-900' : 'bg-amber-50/50 border-amber-200 text-amber-800'
              }`}>
                <input 
                  type="radio" 
                  name="grade" 
                  value={g} 
                  checked={grade === g}
                  onChange={(e) => {
                    setGrade(e.target.value);
                    setSearchWord('');
                    setSuggestedFlowers([]);
                  }}
                  className="accent-lime-700 w-3.5 h-3.5 mb-1 cursor-pointer"
                />
                <span>{g === 'ALL' ? '전체' : g}</span>
              </label>
            ))}
          </div>

          {/* 검색바 및 실시간 추천 목록 컨테이너 */}
          <div className="relative">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="꽃 이름 검색 (자음/모음 가능)" 
                value={searchWord}
                onChange={(e) => {
                  setIsSelecting(false);
                  setSearchWord(e.target.value);
                }}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') {
                    fetchFlowers(1); 
                  } 
                }}
                className="flex-1 p-3 text-sm border-2 border-amber-200 rounded-xl font-bold bg-white focus:outline-none focus:border-lime-700"
                autoComplete="off"
              />
              <button 
                onClick={() => fetchFlowers(1)} 
                className="bg-lime-700 text-white px-4 rounded-xl font-extrabold text-sm hover:bg-lime-800 transition-colors shadow-sm flex items-center justify-center cursor-pointer"
                title="검색"
              >
                <Search className="w-5 h-5" />
              </button>
              <button 
                onClick={handleResetSearch} 
                className="bg-gray-200 text-gray-700 px-3 rounded-xl hover:bg-gray-300 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                title="초기화"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 실시간 꽃 추천(자동완성) 리스트 팝업 */}
            {suggestedFlowers.length > 0 && !isSelecting && (
              <div className="absolute left-0 right-14 top-full mt-1 bg-white border-2 border-amber-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                <p className="px-3 py-1.5 text-[10px] font-black text-amber-700 bg-amber-50 border-b border-amber-100">
                  🌸 검색된 꽃 목록 (클릭 시 바로 조회)
                </p>
                {suggestedFlowers.map((flower, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsSelecting(true);
                      setSearchWord(flower.name);
                      // 선택한 꽃으로 즉시 검색 실행
                      let query = supabase
                        .from('flowers')
                        .select('*', { count: 'exact' })
                        .ilike('name', `%${flower.name}%`);
                      
                      if (grade !== 'ALL') {
                        query = query.eq('grade', grade);
                      }
                      
                      query.then(({ data, count }) => {
                        if (data) {
                          const sortedData = [...data].sort((a, b) => {
                            const aOwned = checkedMap[a.id] ? 1 : 0;
                            const bOwned = checkedMap[b.id] ? 1 : 0;
                            return bOwned - aOwned;
                          });
                          setGradeCount(count || 0);
                          setTotalCount(count || 0);
                          setFlowers(sortedData.slice(0, limit));
                          setPage(1);
                        }
                      });
                      setSuggestedFlowers([]);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-lime-50 transition-colors border-b border-amber-50 last:border-b-0 flex items-center justify-between"
                  >
                    <span>{flower.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${
                      flower.grade === 'UR' ? 'bg-pink-600' :
                      flower.grade === 'SSR' ? 'bg-orange-500' :
                      flower.grade === 'SR' ? 'bg-purple-600' :
                      flower.grade === 'R' ? 'bg-teal-600' : 'bg-slate-400'
                    }`}>
                      {flower.grade}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-right text-[11px] font-black text-lime-700 pt-1">
            {grade === 'ALL' ? `전체 꽃: ${gradeCount}개` : `해당 등급의 꽃: ${gradeCount}개`} / 모든 등급의 꽃: {allCount}개
          </p>
        </div>

        {/* 꽃 목록 테이블 영역 */}
        <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead>
                <tr className="bg-amber-50 text-xs font-black text-amber-900 border-b border-amber-100">
                  <th className="py-3 px-1">
                    <input 
                      type="checkbox" 
                      checked={isAllPageChecked}
                      onChange={(e) => handleToggleAll(e.target.checked)}
                      className="w-4 h-4 accent-lime-700 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-1">등급</th>
                  <th className="py-3 px-1">꽃 이름</th>
                  <th className="py-3 px-1">보유</th>
                </tr>
              </thead>
              <tbody className="text-base font-extrabold">
                {flowers.map((f) => {
                  const isOwned = !!checkedMap[f.id];
                  return (
                    <tr key={f.id} className="border-b border-amber-50 hover:bg-lime-50/20">
                      <td className="py-3 px-1">
                        <input 
                          type="checkbox" 
                          checked={isOwned}
                          onChange={(e) => handleCheckboxChange(f.id, e.target.checked)}
                          className="w-5 h-5 accent-lime-700 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-1 text-xs">{f.grade}</td>
                      <td className="py-3 px-1 font-black text-left pl-3 text-sm">{f.name}</td>
                      <td className="py-3 px-1">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${isOwned ? 'bg-lime-100 text-lime-800' : 'bg-red-50 text-red-600'}`}>
                          {isOwned ? 'O' : 'X'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center p-3 bg-amber-50">
            <button 
              disabled={page === 1}
              onClick={() => fetchFlowers(page - 1)}
              className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl text-xs font-black disabled:opacity-50 cursor-pointer"
            >
              이전
            </button>
            <span className="text-xs font-black text-amber-900">페이지 {page} / {Math.ceil(totalCount / limit) || 1}</span>
            <button 
              disabled={page >= Math.ceil(totalCount / limit)}
              onClick={() => fetchFlowers(page + 1)}
              className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl text-xs font-black disabled:opacity-50 cursor-pointer"
            >
              다음
            </button>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="pt-2">
          <button 
            onClick={handleSave} 
            className="w-full py-4 bg-blue-500 text-white font-black rounded-2xl text-lg hover:bg-blue-600 transition-colors shadow-sm cursor-pointer"
          >
            보유 꽃 수정하기
          </button>
        </div>
      </div>
    </div>
  );
}