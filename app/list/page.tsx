'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Search } from 'lucide-react';

export default function ListPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchWord, setSearchWord] = useState('');
  const [selectedFlower, setSelectedFlower] = useState<any>(null);
  const [guildRank, setGuildRank] = useState('A');
  const [memberList, setMemberList] = useState<any[]>([]);
  
  // 보유 꽃 멤버 전체 조회 체크박스 상태 추가
  const [showAllOwners, setShowAllOwners] = useState(false);
  
  // 페이징 처리
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  useEffect(() => {
    const session = sessionStorage.getItem('guild_user');
    if (!session) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(session));
    fetchGuildRank();
  }, []);

  const fetchGuildRank = async () => {
    const { data } = await supabase.from('guild_settings').select('guild_rank').eq('id', 1).single();
    if (data) setGuildRank(data.guild_rank);
  };

  const getLimitMissionCount = (rank: string) => {
    const mapping: Record<string, number> = { A: 18, B: 16, C: 14, D: 12 };
    return mapping[rank] || 18;
  };

  const maxMissions = getLimitMissionCount(guildRank);

  const handleSearch = async (targetPage = 1) => {
    if (!searchWord.trim()) return;

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
      return;
    }

    if (matchedFlowers.length > 1) {
      alert('검색어에 해당하는 꽃이 여러 개 존재합니다. 꽃 이름을 정확하게 입력해 주세요.');
      setSelectedFlower(null);
      setMemberList([]);
      return;
    }

    const flower = matchedFlowers[0];
    setSelectedFlower(flower);

    const { data, error } = await supabase
      .from('user_flowers')
      .select(`
        is_owned,
        profiles!inner (
          id,
          nickname, 
          is_basic_only, 
          is_vip, 
          completed_missions
        )
      `)
      .eq('flower_id', flower.id)
      .eq('is_owned', 'Y');

    if (error) {
      console.error("멤버 조회 에러:", error);
      alert('멤버 데이터를 가져오는 중 에러가 발생했습니다.');
      return;
    }

    if (data) {
      // 전체 조회 체크박스가 꺼져있을 때만 기존 미션 가능 조건 필터링 적용
      const filteredData = data.filter((item: any) => {
        if (showAllOwners) return true; // 전체 조회 체크 시 필터링 없이 모두 포함

        const p = item.profiles;
        if (p.is_basic_only === 'Y') return p.completed_missions < maxMissions;
        const limitWithExtra = maxMissions + 6;
        return p.completed_missions < limitWithExtra;
      });

      setTotalCount(filteredData.length);
      const paginatedData = filteredData.slice((targetPage - 1) * limit, targetPage * limit);

      const formatted = paginatedData.map((item: any, index: number) => ({
        seq: (targetPage - 1) * limit + index + 1,
        nickname: item.profiles.nickname,
        basic: item.profiles.is_basic_only,
        vip: item.profiles.is_vip,
        completed: item.profiles.completed_missions,
      }));

      setMemberList(formatted);
      setPage(targetPage);
    }
  };

  const isLeader = user?.role === '길드장' || user?.role === '부길드장';

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12 overflow-x-hidden box-border">
      <Header />
      
      <div className="px-4 flex-1 space-y-4 w-full box-border pt-2">
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => router.push('/flowers/select')} 
            className="py-4 bg-lime-50/80 border-2 border-lime-200 rounded-2xl font-black text-base text-amber-900 hover:bg-lime-100 transition-colors shadow-sm"
          >
            🌸 보유 꽃 선택
          </button>
          <button 
            onClick={() => router.push('/guild/mission')} 
            className="py-4 bg-lime-50/80 border-2 border-lime-200 rounded-2xl font-black text-base text-amber-900 hover:bg-lime-100 transition-colors shadow-sm"
          >
            ⚔️ 임무 설정
          </button>
          {isLeader && (
            <>
              <button 
                onClick={() => router.push('/flowers/manage')} 
                className="py-4 bg-amber-50 border-2 border-amber-200 rounded-2xl font-black text-base text-amber-900 hover:bg-amber-100 transition-colors shadow-sm"
              >
                ⚙️ 꽃 정보 관리
              </button>
              <button 
                onClick={() => router.push('/guild/members')} 
                className="py-4 bg-amber-50 border-2 border-amber-200 rounded-2xl font-black text-base text-amber-900 hover:bg-amber-100 transition-colors shadow-sm"
              >
                👥 길드원 관리
              </button>
            </>
          )}
        </div>

        <p className="text-xs font-bold text-red-500 pt-1 px-1">
          ❣️ 현재 해당 꽃으로 미션이 가능한 멤버들만 노출됩니다.
        </p>

        <div className="flex gap-2 w-full">
          <input 
            type="text" 
            placeholder="꽃 이름을 입력해 주세요" 
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(1); }}
            className="flex-1 p-3.5 text-sm border-2 border-amber-200 rounded-xl bg-white focus:outline-none focus:border-lime-700 font-bold"
          />
          <button 
            onClick={() => handleSearch(1)} 
            className="bg-lime-700 text-white px-5 rounded-xl hover:bg-lime-800 flex items-center justify-center transition-colors shadow-sm"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* (보유 꽃 멤버 전체 조회) 체크박스 영역 */}
        <div className="px-1 flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-pink text-amber-900">
            <input 
              type="checkbox" 
              checked={showAllOwners} 
              onChange={(e) => setShowAllOwners(e.target.checked)}
              className="w-4 h-4 accent-lime-700 rounded cursor-pointer"
            />
            <span>꽃 보유 멤버 전체 조회하려면 체크박스 선택 후 조회하세요.</span>
          </label>
        </div>

        {selectedFlower && (
          <div className="bg-white border-2 border-lime-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-base text-white ${
              selectedFlower.grade === 'UR' ? 'bg-pink-600' :
              selectedFlower.grade === 'SSR' ? 'bg-orange-500' :
              selectedFlower.grade === 'SR' ? 'bg-purple-600' :
              selectedFlower.grade === 'R' ? 'bg-teal-600' : 'bg-slate-400'
            }`}>
              {selectedFlower.grade}
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-lime-700">꽃 등급: {selectedFlower.grade}</p>
              <h3 className="text-xl font-black">{selectedFlower.name}</h3>
            </div>
          </div>
        )}

        {memberList.length > 0 ? (
          <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead>
                  <tr className="bg-amber-50 text-xs font-black border-b border-amber-100 text-amber-900">
                    <th className="py-3 px-3">순번</th>
                    <th className="py-3 px-3">닉네임</th>
                    <th className="py-3 px-3">VIP</th>
                  </tr>
                </thead>
                <tbody className="text-base font-bold">
                  {memberList.map((m) => (
                    <tr key={m.seq} className="border-b border-amber-50 hover:bg-lime-50/20">
                      <td className="py-3 px-1 text-xs text-amber-800">{m.seq}</td>
                      <td className="py-3 px-1 font-black">{m.nickname}</td>
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
            <div className="flex justify-between items-center p-3 bg-amber-50">
              <button 
                disabled={page === 1} 
                onClick={() => handleSearch(page - 1)} 
                className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl text-xs font-black disabled:opacity-50"
              >
                이전
              </button>
              <span className="text-xs font-black text-amber-900">페이지 {page} / {Math.ceil(totalCount / limit) || 1}</span>
              <button 
                disabled={page >= Math.ceil(totalCount / limit)} 
                onClick={() => handleSearch(page + 1)} 
                className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl text-xs font-black disabled:opacity-50"
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