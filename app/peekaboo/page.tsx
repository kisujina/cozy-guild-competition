'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Heart, ChevronRight, X, Sparkles } from 'lucide-react';

export default function PeekabooFlowersPage() {
  const [flowers, setFlowers] = useState<any[]>([]);
  const [searchWord, setSearchWord] = useState('');
  const [suggestedFlowers, setSuggestedFlowers] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedFlower, setSelectedFlower] = useState<any | null>(null);

  // 상세 정보 탭 관련 상태 (보유 멤버 및 필터)
  const [owners, setOwners] = useState<any[]>([]);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [suggestedMembers, setSuggestedMembers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | '진행' | '중단' | '완료'>('all');

  // 데이터 로드 및 즐겨찾기 불러오기
  useEffect(() => {
    fetchFlowers();
    const savedFavs = localStorage.getItem('peekaboo_favorite_flowers');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {}
    }
  }, []);

  const fetchFlowers = async () => {
    const { data, error } = await supabase
      .from('peekaboo_flowers')
      .select('*')
      .order('score', { ascending: false }); // 길드전 점수 높은 순 정렬

    if (!error && data) {
      setFlowers(data);
    }
  };

  // 실시간 꽃 검색 힌트
  useEffect(() => {
    if (!searchWord.trim()) {
      setSuggestedFlowers([]);
      return;
    }
    const keyword = searchWord.trim().replace(/\s+/g, '');
    const filtered = flowers.filter((f) => 
      f.name.replace(/\s+/g, '').includes(keyword)
    );
    setSuggestedFlowers(filtered);
  }, [searchWord, flowers]);

  // 즐겨찾기 토글
  const toggleFavorite = (flowerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated;
    if (favorites.includes(flowerId)) {
      updated = favorites.filter((id) => id !== flowerId);
    } else {
      updated = [...favorites, flowerId];
    }
    setFavorites(updated);
    localStorage.setItem('peekaboo_favorite_flowers', JSON.stringify(updated));
  };

  // 꽃 상세 정보 열기 및 보유 멤버 조회
  const openFlowerDetail = async (flower: any) => {
    setSelectedFlower(flower);
    fetchFlowerOwners(flower.id);
  };

  const fetchFlowerOwners = async (flowerId: string) => {
    const { data, error } = await supabase
      .from('peekaboo_flower_owners')
      .select(`
        id,
        extra_score,
        peekaboo_members (
          id,
          server_name,
          member_name,
          mission_status
        )
      `)
      .eq('flower_id', flowerId)
      .order('extra_score', { ascending: false }); // 절품 추가 점수 내림차순 정렬

    if (!error && data) {
      setOwners(data);
    }
  };

  // 꽃을 보유한 멤버 검색 힌트 (전체 길드원 중 검색)
  useEffect(() => {
    if (!ownerSearch.trim()) {
      setSuggestedMembers([]);
      return;
    }
    const fetchMemberHints = async () => {
      const { data } = await supabase
        .from('peekaboo_members')
        .select('*')
        .ilike('member_name', `%${ownerSearch.trim()}%`);
      if (data) setSuggestedMembers(data);
    };
    const timer = setTimeout(fetchMemberHints, 200);
    return () => clearTimeout(timer);
  }, [ownerSearch]);

  // 길드원을 해당 꽃 보유자로 추가
  const addFlowerOwner = async (member: any) => {
    if (!selectedFlower) return;
    
    // 이미 등록되어 있는지 확인
    const exists = owners.some((o) => o.peekaboo_members?.id === member.id);
    if (exists) {
      alert('이미 해당 꽃을 보유한 길드원으로 등록되어 있습니다.');
      return;
    }

    const { error } = await supabase.from('peekaboo_flower_owners').insert([
      {
        member_id: member.id,
        flower_id: selectedFlower.id,
        extra_score: 0,
      },
    ]);

    if (error) {
      alert('보유자 추가 중 오류가 발생했습니다.');
    } else {
      setOwnerSearch('');
      setSuggestedMembers([]);
      fetchFlowerOwners(selectedFlower.id);
    }
  };

  // 절품 추가 점수 실시간 수정
  const updateExtraScore = async (ownerId: string, newScore: number) => {
    const targetVal = Math.max(0, newScore);
    
    // 낙관적 업데이트
    setOwners(prev => prev.map(o => o.id === ownerId ? { ...o, extra_score: targetVal } : o));

    await supabase
      .from('peekaboo_flower_owners')
      .update({ extra_score: targetVal })
      .eq('id', ownerId);
  };

  // 보유 멤버 삭제
  const removeFlowerOwner = async (ownerId: string) => {
    if (!confirm('정말 해당 길드원의 보유 목록에서 삭제하시겠습니까?')) return;

    const { error } = await supabase
      .from('peekaboo_flower_owners')
      .delete()
      .eq('id', ownerId);

    if (!error && selectedFlower) {
      fetchFlowerOwners(selectedFlower.id);
    }
  };

  // 즐겨찾기 꽃 리스트와 일반 꽃 리스트 분리
  const favoriteFlowersList = flowers.filter((f) => favorites.includes(f.id));
  const displayFlowersList = searchWord.trim() 
    ? flowers.filter((f) => f.name.toLowerCase().includes(searchWord.toLowerCase()))
    : flowers;

  return (
    <div className="space-y-4 pb-12">
      {/* 🌸 상단 검색 배너 */}
      <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm space-y-2 relative">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-amber-900">🌸 임무 꽃 검색</span>
          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
            총 {flowers.length}개 등록됨
          </span>
        </div>

        <div className="relative">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="꽃 이름으로 검색하세요" 
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="flex-1 p-3 border-2 border-amber-200 rounded-xl font-bold bg-[#FDFBF7] text-xs focus:outline-none focus:border-amber-600"
            />
            {searchWord && (
              <button 
                onClick={() => setSearchWord('')}
                className="px-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 실시간 힌트 팝업 */}
          {suggestedFlowers.length > 0 && searchWord.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-amber-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
              {suggestedFlowers.map((f) => (
                <div 
                  key={f.id}
                  onClick={() => {
                    setSearchWord(f.name);
                    setSuggestedFlowers([]);
                  }}
                  className="px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50 cursor-pointer border-b border-amber-50 flex justify-between items-center"
                >
                  <span>{f.name}</span>
                  <span className="text-[10px] text-amber-600">점수: {f.score}점</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ⭐ 즐겨찾기 꽃 섹션 */}
      {favorites.length > 0 && !searchWord && (
        <div className="space-y-2">
          <h3 className="text-xs font-black text-amber-900 flex items-center gap-1 px-1">
            <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" /> 즐겨찾기 꽃
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {favoriteFlowersList.map((f) => (
              <div 
                key={f.id}
                onClick={() => openFlowerDetail(f)}
                className="bg-white p-3 rounded-xl border-2 border-amber-200 shadow-sm flex items-center gap-3 cursor-pointer hover:border-amber-400 transition-all"
              >
                {f.image_url ? (
                  <img src={f.image_url} alt={f.name} className="w-10 h-10 rounded-lg object-cover bg-amber-50" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-xs">🌸</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-amber-900 truncate">{f.name}</p>
                  <p className="text-[10px] text-amber-600 font-bold">{f.grade}등급 · {f.score}점</p>
                </div>
                <button onClick={(e) => toggleFavorite(f.id, e)} className="text-red-500">
                  <Heart className="w-4 h-4 fill-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📋 전체 꽃 리스트 */}
      <div className="space-y-2">
        <h3 className="text-xs font-black text-amber-900 px-1">📋 전체 꽃 리스트 (길드전 점수순)</h3>
        <div className="space-y-2">
          {displayFlowersList.map((f) => {
            const isFav = favorites.includes(f.id);
            return (
              <div 
                key={f.id}
                onClick={() => openFlowerDetail(f)}
                className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-amber-50/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  {f.image_url ? (
                    <img src={f.image_url} alt={f.name} className="w-11 h-11 rounded-xl object-cover bg-amber-50" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-sm">🌸</div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-amber-900">{f.name}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                        {f.grade}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-700 font-bold mt-0.5">길드전 점수: <span className="text-amber-900 font-black">{f.score}점</span></p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => toggleFavorite(f.id, e)}
                    className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🌸 꽃 상세 정보 모달 (배너 형태) */}
      {selectedFlower && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FDFBF7] w-full max-w-md max-h-[85vh] rounded-3xl p-5 shadow-2xl overflow-y-auto space-y-4 border-2 border-amber-200">
            {/* 모달 상단 */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {selectedFlower.image_url ? (
                  <img src={selectedFlower.image_url} alt={selectedFlower.name} className="w-14 h-14 rounded-2xl object-cover bg-white border border-amber-200" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-xl">🌸</div>
                )}
                <div>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-black">
                    {selectedFlower.grade}등급
                  </span>
                  <h2 className="text-base font-black text-amber-950 mt-1">{selectedFlower.name}</h2>
                  <p className="text-xs text-amber-800 font-bold">기본 길드전 점수: {selectedFlower.score}점</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedFlower(null)}
                className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 길드원 검색 및 추가 섹션 */}
            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 space-y-2 relative">
              <span className="text-xs font-black text-amber-900">🔍 보유 길드원 추가</span>
              <input 
                type="text" 
                placeholder="길드원 이름 검색 후 추가" 
                value={ownerSearch}
                onChange={(e) => setOwnerSearch(e.target.value)}
                className="w-full p-2.5 border border-amber-200 rounded-xl text-xs font-bold bg-amber-50/50"
              />
              {suggestedMembers.length > 0 && ownerSearch.trim() && (
                <div className="absolute left-3.5 right-3.5 top-full bg-white border border-amber-200 rounded-xl shadow-lg z-10 max-h-32 overflow-y-auto">
                  {suggestedMembers.map((m) => (
                    <div 
                      key={m.id}
                      onClick={() => addFlowerOwner(m)}
                      className="px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50 cursor-pointer flex justify-between items-center border-b border-amber-50"
                    >
                      <span>{m.member_name} <span className="text-[10px] text-gray-500">({m.server_name})</span></span>
                      <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">추가 +</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* [수정됨] 필터 칩스 색상 적용 (전체 / 진행 / 중단 / 완료) */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(['all', '진행', '중단', '완료'] as const).map((st) => {
                let activeStyle = 'bg-amber-800 text-white';
                let inactiveStyle = 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-50';

                if (statusFilter === st) {
                  if (st === '진행') activeStyle = 'bg-sky-100 text-blue-700 border-2 border-sky-300';
                  else if (st === '중단') activeStyle = 'bg-pink-100 text-rose-700 border-2 border-pink-300';
                  else if (st === '완료') activeStyle = 'bg-lime-100 text-emerald-700 border-2 border-lime-300';
                  else activeStyle = 'bg-amber-800 text-white';
                }

                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer shrink-0 ${
                      statusFilter === st ? activeStyle : inactiveStyle
                    }`}
                  >
                    {st === 'all' ? '전체 보기' : `임무 ${st}`}
                  </button>
                );
              })}
            </div>

            {/* 보유 길드원 리스트 */}
            <div className="space-y-2">
              <span className="text-xs font-black text-amber-900">👑 이 꽃을 보유한 길드원 ({owners.length}명)</span>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {owners
                  .filter((o) => {
                    if (statusFilter === 'all') return true;
                    return o.peekaboo_members?.mission_status === statusFilter;
                  })
                  .map((o) => {
                    const member = o.peekaboo_members;
                    if (!member) return null;
                    const totalScore = (selectedFlower.score || 0) + (o.extra_score || 0);

                    return (
                      <div key={o.id} className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-2 shadow-sm">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-amber-900 truncate">{member.member_name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {member.server_name}
                            </span>
                            
                            {/* 임무 상태별 색상 테마 적용 */}
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              member.mission_status === '진행' ? 'bg-sky-100 text-blue-700 border border-sky-300' :
                              member.mission_status === '중단' ? 'bg-pink-100 text-rose-700 border border-pink-300' : 
                              member.mission_status === '완료' ? 'bg-lime-100 text-emerald-700 border border-lime-300' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {member.mission_status}
                            </span>
                          </div>
                          {/* 합산 점수 작게 노출 */}
                          <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                            기본 {selectedFlower.score} + 절품 {o.extra_score} = <span className="text-amber-950 font-black">합산 {totalScore}점</span>
                          </div>
                        </div>

                        {/* 절품 + 점수 수정 및 증감 버튼 컨트롤 영역 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-amber-700 font-black">절품 +</span>
                          
                          <div className="flex items-center bg-amber-50/80 border border-amber-200 rounded-xl overflow-hidden shadow-sm">
                            <input 
                              type="number" 
                              value={o.extra_score === 0 ? '' : o.extra_score} 
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                updateExtraScore(o.id, val);
                              }}
                              className="w-10 py-1 text-xs font-black text-center bg-transparent focus:outline-none text-amber-950 placeholder:text-amber-300"
                            />
                            
                            <div className="flex flex-col border-l border-amber-200">
                              <button 
                                type="button"
                                onClick={() => updateExtraScore(o.id, (o.extra_score || 0) + 1)}
                                className="px-1.5 py-0.5 text-[9px] font-black bg-amber-100/70 hover:bg-amber-200 text-amber-900 transition-colors leading-none"
                              >
                                ▲
                              </button>
                              <button 
                                type="button"
                                onClick={() => updateExtraScore(o.id, Math.max(0, (o.extra_score || 0) - 1))}
                                className="px-1.5 py-0.5 text-[9px] font-black bg-amber-100/40 hover:bg-amber-200 text-amber-900 transition-colors border-t border-amber-200 leading-none"
                              >
                                ▼
                              </button>
                            </div>
                          </div>

                          <button 
                            onClick={() => removeFlowerOwner(o.id)}
                            className="w-7 h-7 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold hover:bg-red-100 ml-1"
                            title="삭제"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}