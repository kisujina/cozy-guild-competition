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

// 1. 꽃 정보 조회
    // 띄어쓰기를 완전히 제거한 검색어 생성
    const cleanSearchWord = searchWord.trim().replace(/\s+/g, '');

    // 모든 꽃 데이터를 가져와서 자바스크립트에서 띄어쓰기 없이 비교
    const { data: flowers, error: flowerError } = await supabase
      .from('flowers')
      .select('*'); 

    if (flowerError) {
      console.error("꽃 정보 조회 에러:", flowerError);
      alert('꽃 정보를 조회하는 과정에서 에러가 발생했습니다.');
      return;
    }

    // 🌟 [핵심 수정]: 자바스크립트에서 띄어쓰기를 무시하고 필터링
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

    // 2. 해당 꽃을 가진 모든 보유자를 다 가져옵니다 (SQL 필터 제거)
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
      // 🌟 [핵심 로직]: 기획하신 조건대로 필터링
      const filteredData = data.filter((item: any) => {
        const p = item.profiles;
        /*
        // is_basic_only가 'N'이면 무조건 통과
        if (p.is_basic_only === 'N') return true;
        
        // is_basic_only가 'Y'이면 완료 횟수가 maxMissions 미만인 경우만 통과
        return p.completed_missions < maxMissions;
        */
       //추가 임무 +6 까지 추가. 추가 임무 모두 달성 시에 조회 되지 않도록 처리.
        const limitWithExtra = maxMissions + 6; // 기본횟수 + 6 (풀 임무 완료 기준)
        
        // 완료 횟수가 (기본횟수 + 6) 미만인 사람만 남김
        return p.completed_missions < limitWithExtra;

      });

      // 필터링된 결과로 페이징 처리
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
    // ... (기존과 동일한 UI 부분)
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12">
      <Header />
      <div className="px-4 flex-1">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => router.push('/flowers/select')} className="py-4 bg-lime-50 border-2 border-lime-200 text-lg font-black rounded-2xl hover:bg-lime-100 transition-all">🌸 보유 꽃 선택</button>
          <button onClick={() => router.push('/guild/mission')} className="py-4 bg-lime-50 border-2 border-lime-200 text-lg font-black rounded-2xl hover:bg-lime-100 transition-all">⚔️ 임무 설정</button>
          {isLeader && (
            <>
              <button onClick={() => router.push('/flowers/manage')} className="py-4 bg-amber-100 border-2 border-amber-200 text-lg font-black rounded-2xl hover:bg-amber-200 transition-all">⚙️ 꽃 정보 관리</button>
              <button onClick={() => router.push('/guild/members')} className="py-4 bg-amber-100 border-2 border-amber-200 text-lg font-black rounded-2xl hover:bg-amber-200 transition-all">👥 길드원 관리</button>
            </>
          )}
        </div>
        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            placeholder="꽃 이름을 입력해 주세요" 
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(1); }}
            className="flex-1 p-4 border-2 border-amber-200 rounded-2xl text-lg font-bold focus:outline-none focus:border-lime-700 bg-white"
          />
          <button onClick={() => handleSearch(1)} className="bg-lime-700 text-white px-5 rounded-2xl hover:bg-lime-800 flex items-center justify-center">
            <Search className="w-6 h-6" />
          </button>
        </div>
        {selectedFlower && (
          <div className="bg-white border-2 border-lime-200 rounded-2xl p-4 mb-6 flex items-center gap-4 shadow-sm">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl text-white ${
              selectedFlower.grade === 'UR' ? 'bg-pink-600' :
              selectedFlower.grade === 'SSR' ? 'bg-orange-500' :
              selectedFlower.grade === 'SR' ? 'bg-purple-600' :
              selectedFlower.grade === 'R' ? 'bg-teal-600' : 'bg-slate-400'
            }`}>
              {selectedFlower.grade}
            </div>
            <div>
              <p className="text-xs font-extrabold text-lime-700">꽃 등급: {selectedFlower.grade}</p>
              <h3 className="text-2xl font-black">{selectedFlower.name}</h3>
            </div>
          </div>
        )}
        {memberList.length > 0 ? (
          <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead>
                  <tr className="bg-amber-50 text-sm font-black border-b border-amber-100 text-amber-900">
                    <th className="py-3 px-1">순번</th>
                    <th className="py-3 px-1">닉네임</th>
                    <th className="py-3 px-1">기본임무</th>
                    <th className="py-3 px-1">VIP</th>
                    <th className="py-3 px-1">완료수</th>
                  </tr>
                </thead>
                <tbody className="text-lg font-bold">
                  {memberList.map((m) => (
                    <tr key={m.seq} className="border-b border-amber-50 hover:bg-lime-50/20">
                      <td className="py-4 px-1 text-sm text-amber-800">{m.seq}</td>
                      <td className="py-4 px-1 font-black">{m.nickname}</td>
                      <td className="py-4 px-1">{m.basic}</td>
                      <td className="py-4 px-1">{m.vip}</td>
                      <td className="py-4 px-1 text-lime-700">{m.completed}회</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center p-3.5 bg-amber-50">
              <button disabled={page === 1} onClick={() => handleSearch(page - 1)} className="px-4 py-2 bg-white border-2 border-amber-200 rounded-xl text-sm font-black disabled:opacity-50">이전</button>
              <span className="text-sm font-black text-amber-900">페이지 {page} / {Math.ceil(totalCount / limit) || 1}</span>
              <button disabled={page >= Math.ceil(totalCount / limit)} onClick={() => handleSearch(page + 1)} className="px-4 py-2 bg-white border-2 border-amber-200 rounded-xl text-sm font-black disabled:opacity-50">다음</button>
            </div>
          </div>
        ) : (
          selectedFlower && <p className="text-center text-sm font-black text-amber-800 py-8">조건에 부합하는 꽃 보유 길드원이 없습니다.</p>
        )}
      </div>
    </div>
  );
}