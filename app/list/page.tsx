'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Search, RotateCcw, Check } from 'lucide-react';

export default function ListPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchWord, setSearchWord] = useState('');
  const [selectedFlower, setSelectedFlower] = useState<any>(null);
  const [guildRank, setGuildRank] = useState('A');
  const [memberList, setMemberList] = useState<any[]>([]);
  
  const [guildSettings, setGuildSettings] = useState<any>(null);

  const [filters, setFilters] = useState({
    excludeBasicOnly: false,
    excludeScoreMet: false,
  });
  
  const [suggestedFlowers, setSuggestedFlowers] = useState<any[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  useEffect(() => {
    const session = sessionStorage.getItem('guild_user');
    if (!session) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(session);
    setUser(parsedUser);
    fetchGuildSettings(parsedUser.guild_id);
  }, []);

  const fetchGuildSettings = async (guildId: number) => {
    const { data } = await supabase
      .from('guild_settings')
      .select('*')
      .eq('id', guildId)
      .maybeSingle();
      
    if (data) {
      setGuildSettings(data);
      if (data.guild_rank) {
        setGuildRank(data.guild_rank);
      }
    }
  };

  useEffect(() => {
    const handleGuildUpdated = () => {
      if (user && user.guild_id) {
        fetchGuildSettings(user.guild_id);
      }
    };

    window.addEventListener('guildSettingsUpdated', handleGuildUpdated);
    return () => {
      window.removeEventListener('guildSettingsUpdated', handleGuildUpdated);
    };
  }, [user]);

  const getLimitMissionCount = (rank: string) => {
    const mapping: Record<string, number> = { A: 18, B: 16, C: 14, D: 12 };
    return mapping[rank] || 18;
  };

  const maxMissions = getLimitMissionCount(guildRank);

  const addMissions = 6;

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
      const { data, error } = await supabase
        .from('flowers')
        .select('*');

      if (!error && data) {
        const filtered = data.filter((f: any) => 
          f.name.replace(/\s+/g, '').includes(cleanKeyword)
        );
        setSuggestedFlowers(filtered);
      }
    };

    const timer = setTimeout(() => {
      fetchFlowerHints();
    }, 200);

    return () => clearTimeout(timer);
  }, [searchWord, isSelecting]);

  useEffect(() => {
    if (selectedFlower) {
      handleSearchByFlower(selectedFlower, 1);
    }
  }, [filters, guildRank]);

  const handleSearchByFlower = async (flower: any, targetPage = 1) => {
    if (!user) return;
    setIsSelecting(true);
    setSelectedFlower(flower);
    setSuggestedFlowers([]);

    const { data, error } = await supabase
      .from('user_flowers')
      .select(`
        is_owned,
        profiles!inner (
          id,
          guild_id,
          nickname, 
          is_basic_only, 
          is_vip, 
          completed_missions,
          total_mission_score
        )
      `)
      .eq('flower_id', flower.id)
      .eq('is_owned', 'Y')
      .eq('profiles.guild_id', user.guild_id);

    if (error) {
      console.error("멤버 조회 에러:", error);
      alert('멤버 데이터를 가져오는 중 에러가 발생했습니다.');
      return;
    }

    if (data) {
      const filteredData = data.filter((item: any) => {
        const p = item.profiles;

        if (filters.excludeBasicOnly) {
          if ((p.is_basic_only === 'Y' && p.completed_missions >= maxMissions) || (p.is_basic_only === 'N' && p.completed_missions >= (maxMissions+addMissions))) {
            return false;
          }
        }

        if (filters.excludeScoreMet && guildSettings?.is_default_mission_enabled === 'Y') {
          const defaultScore = Number(guildSettings.default_mission_score) || 0;
          const userScore = Number(p.total_mission_score) || 0;
          if (userScore >= defaultScore) {
            return false;
          }
        }

        return true;
      });

      setTotalCount(filteredData.length);
      const paginatedData = filteredData.slice((targetPage - 1) * limit, targetPage * limit);

      const formatted = paginatedData.map((item: any, index: number) => ({
        seq: (targetPage - 1) * limit + index + 1,
        nickname: item.profiles.nickname,
        basic: item.profiles.is_basic_only,
        vip: item.profiles.is_vip,
        completed_missions: item.profiles.completed_missions ?? 0,
        total_mission_score: item.profiles.total_mission_score ?? 0,
      }));

      setMemberList(formatted);
      setPage(targetPage);
    }
  };

  const handleSearch = async (targetPage = 1) => {
    if (!searchWord.trim()) return;

    setIsSelecting(true);
    const cleanSearchWord = searchWord.trim().replace(/\s+/g, '');

    const { data: flowers, error: flowerError } = await supabase
      .from('flowers')
      .select('*'); 

    if (flowerError) {
      console.error("꽃 정보 조회 에러:", flowerError);
      alert('꽃 정보를 조회하는 과정에서 에러가 발생했습니다.');
      return;
    }

    const matchedFlowers = flowers?.filter((flower: any) => {
      const cleanDbName = flower.name.replace(/\s+/g, '');
      return cleanDbName.includes(cleanSearchWord);
    });

    if (!matchedFlowers || matchedFlowers.length === 0) {
      alert('일치하는 꽃 정보가 없습니다.');
      setSelectedFlower(null);
      setMemberList([]);
      setSuggestedFlowers([]);
      return;
    }

    if (matchedFlowers.length > 1) {
      alert('검색어에 해당하는 꽃이 여러 개 존재합니다. 꽃 이름을 정확하게 입력해 주세요.');
      setSelectedFlower(null);
      setMemberList([]);
      return;
    }

    handleSearchByFlower(matchedFlowers[0], targetPage);
  };

  const handleResetSearch = () => {
    setSearchWord('');
    setSelectedFlower(null);
    setMemberList([]);
    setSuggestedFlowers([]);
    setIsSelecting(false);
    setTotalCount(0);
    setPage(1);
    setFilters({ excludeBasicOnly: false, excludeScoreMet: false });
  };

  const toggleFilter = (key: 'excludeBasicOnly' | 'excludeScoreMet') => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isLeader = user?.role === '길드장' || user?.role === '부길드장';

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12 overflow-x-hidden box-border">
      <Header />
      {isLeader && (
        <div className="p-3 bg-red-50 rounded-2xl border border-red-100 space-y-1 mx-4 mt-2 box-border">
          <p className="text-xs font-bold text-red-500">📌[길드관리]는 길드장만 권한.</p>
          <p className="text-xs font-bold text-red-500">📌[게임 꽃 정보 관리], [길드원 관리]는 길드장,부길드장 권한.</p>
        </div>
      )}
      <div className="px-4 flex-1 space-y-3 w-full max-w-full box-border pt-2 overflow-hidden">
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => router.push('/flowers/select')} 
            className="py-3 bg-lime-50/80 border-2 border-lime-200 rounded-2xl font-black text-sm text-amber-900 hover:bg-lime-100 transition-colors shadow-sm cursor-pointer"
          >
            🌸나의 보유 꽃 관리
          </button>
          <button 
            onClick={() => router.push('/guild/mission')} 
            className="py-3 bg-lime-50/80 border-2 border-lime-200 rounded-2xl font-black text-sm text-amber-900 hover:bg-lime-100 transition-colors shadow-sm cursor-pointer"
          >
            ⚔️ 나의 임무 설정
          </button>
          {isLeader && (
            <>
              <button 
                onClick={() => router.push('/flowers/manage')} 
                className="py-3 bg-amber-50 border-2 border-amber-200 rounded-2xl font-black text-sm text-amber-900 hover:bg-amber-100 transition-colors shadow-sm cursor-pointer"
              >
                ⚙️ 게임 꽃 정보 관리
              </button>
              <button 
                onClick={() => router.push('/guild/members')} 
                className="py-3 bg-amber-50 border-2 border-amber-200 rounded-2xl font-black text-sm text-amber-900 hover:bg-amber-100 transition-colors shadow-sm cursor-pointer"
              >
                👥 길드원 관리
              </button>
            </>
          )}
        </div>

        {/* 안내 문구 */}
        <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-2.5 space-y-0.5 text-[11px] font-bold text-amber-900 leading-relaxed box-border">
          <p>⭐ 해당 꽃을 보유한 길드원들을 검색할 수 있습니다.</p>
          <p>⭐ 검색 창 아래 조건 선택 시 현재 꽃 미션이 가능한 길드원 확인 가능.</p>
        </div>

        {/* 검색바 및 추천 목록 컨테이너 */}
        <div className="relative w-full box-border">
          <div className="flex gap-2 w-full box-border">
            <div className="relative flex-1 min-w-0">
              <input 
                type="text" 
                placeholder="꽃 이름을 입력해 주세요" 
                value={searchWord}
                onChange={(e) => {
                  setIsSelecting(false);
                  setSearchWord(e.target.value);
                }}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') {
                    setSuggestedFlowers([]);
                    handleSearch(1); 
                  } 
                }}
                className="w-full p-3 pl-9 text-sm border-2 border-amber-200 rounded-xl bg-white focus:outline-none focus:border-lime-700 font-bold box-border"
                autoComplete="off"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none" />
            </div>

            {/* 초기화 버튼 */}
            <button 
              type="button"
              onClick={handleResetSearch} 
              className="bg-gray-100 text-gray-700 px-3.5 py-3 rounded-xl hover:bg-gray-200 text-xs font-bold transition-colors border border-gray-300 shadow-2xs flex items-center justify-center gap-1 shrink-0 cursor-pointer"
              title="초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>초기화</span>
            </button>
          </div>

          {/* 실시간 꽃 추천(자동완성) 리스트 팝업 */}
          {suggestedFlowers.length > 0 && !isSelecting && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-amber-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto box-border">
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
                    handleSearchByFlower(flower, 1);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-lime-50 transition-colors border-b border-amber-50 last:border-b-0 flex items-center justify-between cursor-pointer"
                >
                  <span>{flower.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded text-white shrink-0 ${
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

        {/* 조건 선택 버튼 영역 */}
        <div className="grid grid-cols-2 gap-2 pt-1 w-full box-border">
          <button
            type="button"
            onClick={() => toggleFilter('excludeBasicOnly')}
            className={`w-full py-2.5 px-2 rounded-xl text-[11px] font-black border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs box-border ${
              filters.excludeBasicOnly
                ? 'bg-lime-700 text-white border-lime-800 ring-2 ring-lime-300'
                : 'bg-amber-50/80 text-amber-900 border-dashed border-amber-300 hover:bg-amber-100/60'
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border shrink-0 ${filters.excludeBasicOnly ? 'bg-white text-lime-700 border-white' : 'border-amber-400 bg-white'}`}>
              {filters.excludeBasicOnly && <Check className="w-3 h-3 stroke-[3]" />}
            </span>
            <span className="truncate">임무 횟수 충족 제외</span>
          </button>

          {guildSettings?.is_default_mission_enabled === 'Y' ? (
            <button
              type="button"
              onClick={() => toggleFilter('excludeScoreMet')}
              className={`w-full py-2.5 px-2 rounded-xl text-[11px] font-black border-2 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs box-border ${
                filters.excludeScoreMet
                  ? 'bg-lime-700 text-white border-lime-800 ring-2 ring-lime-300'
                  : 'bg-amber-50/80 text-amber-900 border-dashed border-amber-300 hover:bg-amber-100/60'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border shrink-0 ${filters.excludeScoreMet ? 'bg-white text-lime-700 border-white' : 'border-amber-400 bg-white'}`}>
                {filters.excludeScoreMet && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span className="truncate">임무 점수 충족 제외</span>
            </button>
          ) : (
            <div className="hidden sm:block"></div>
          )}
        </div>

        {selectedFlower && (
          <div className="bg-white border-2 border-lime-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm box-border w-full">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base text-white shrink-0 ${
              selectedFlower.grade === 'UR' ? 'bg-pink-600' :
              selectedFlower.grade === 'SSR' ? 'bg-orange-500' :
              selectedFlower.grade === 'SR' ? 'bg-purple-600' :
              selectedFlower.grade === 'R' ? 'bg-teal-600' : 'bg-slate-400'
            }`}>
              {selectedFlower.grade}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold text-lime-700">꽃 등급: {selectedFlower.grade}</p>
              <h3 className="text-xl font-black truncate">{selectedFlower.name}</h3>
            </div>
          </div>
        )}

        {/* 멤버 리스트 테이블 (임무 완료 횟수 및 임무 점수 컬럼 추가) */}
        {memberList.length > 0 ? (
          <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm overflow-hidden box-border w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-center">
                <thead>
                  <tr className="bg-amber-50 text-xs font-black border-b border-amber-100 text-amber-900">
                    <th className="py-3 px-2">순번</th>
                    <th className="py-3 px-2">닉네임</th>
                    <th className="py-3 px-2">완료 횟수</th>
                    <th className="py-3 px-2">점수</th>
                    <th className="py-3 px-2">VIP</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-bold">
                  {memberList.map((m) => (
                    <tr key={m.seq} className="border-b border-amber-50 hover:bg-lime-50/20">
                      <td className="py-3 px-1 text-xs text-amber-800">{m.seq}</td>
                      <td className="py-3 px-1 font-black truncate max-w-[100px]">{m.nickname}</td>
                      <td className="py-3 px-1 text-amber-900">{m.completed_missions}회</td>
                      <td className="py-3 px-1 text-lime-700 font-extrabold">{m.total_mission_score}점</td>
                      {m.vip === "N" ? (
                        <td className="py-3 px-1 text-red-500">X</td>
                      ) : (
                        <td className="py-3 px-1 text-blue-500">O</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center p-3 bg-amber-50 box-border">
              <button 
                disabled={page === 1} 
                onClick={() => handleSearchByFlower(selectedFlower, page - 1)} 
                className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl text-xs font-black disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                이전
              </button>
              <span className="text-xs font-black text-amber-900">페이지 {page} / {Math.ceil(totalCount / limit) || 1}</span>
              <button 
                disabled={page >= Math.ceil(totalCount / limit)} 
                onClick={() => handleSearchByFlower(selectedFlower, page + 1)} 
                className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl text-xs font-black disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                다음
              </button>
            </div>
          </div>
        ) : (
          selectedFlower && <p className="text-center text-xs font-black text-amber-800 py-6">조건에 부합하는 꽃 보유 길드원이 없습니다.</p>
        )}
      </div>
    </div>
  );
}