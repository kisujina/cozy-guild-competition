'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, CheckCircle2, AlertCircle, Clock, X, ChevronRight } from 'lucide-react';

export default function PeekabooMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [searchWord, setSearchWord] = useState('');
  const [serverFilter, setServerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // 길드원 추가 모달 관련 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  // 길드원 상세 정보(보유 꽃 관리) 모달 관련 상태
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberFlowers, setMemberFlowers] = useState<any[]>([]);
  const [flowerSearch, setFlowerSearch] = useState('');
  const [suggestedFlowers, setSuggestedFlowers] = useState<any[]>([]);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('peekaboo_members')
      .select(`
        *,
        peekaboo_flower_owners (
          id,
          extra_score,
          peekaboo_flowers (
            id,
            name,
            grade,
            score,
            image_url
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMembers(data);
    }
  };

  // 길드원 추가 함수
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim() || !newMemberName.trim()) {
      alert('서버 이름과 길드원 이름을 모두 입력해주세요.');
      return;
    }

    const { error } = await supabase.from('peekaboo_members').insert([
      {
        server_name: newServerName.trim(),
        member_name: newMemberName.trim(),
        mission_status: '진행', // 기본값
      },
    ]);

    if (error) {
      alert('길드원 추가 중 오류가 발생했습니다.');
    } else {
      setNewServerName('');
      setNewMemberName('');
      setIsAddModalOpen(false);
      fetchMembers();
    }
  };

  // 임무 상태 변경 함수
  const updateMissionStatus = async (memberId: string, newStatus: string) => {
    // 낙관적 업데이트
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, mission_status: newStatus } : m));

    await supabase
      .from('peekaboo_members')
      .update({ mission_status: newStatus })
      .eq('id', memberId);
  };

  // 길드원 삭제 함수
  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!confirm(`'${memberName}' 길드원을 정말 삭제하시겠습니까? 관련 보유 꽃 데이터도 함께 정리됩니다.`)) return;

    const { error } = await supabase
      .from('peekaboo_members')
      .delete()
      .eq('id', memberId);

    if (!error) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      if (selectedMember?.id === memberId) setSelectedMember(null);
    } else {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 길드원 상세 열기 (보유 꽃 조회)
  const openMemberDetail = (member: any) => {
    setSelectedMember(member);
    setMemberFlowers(member.peekaboo_flower_owners || []);
    setFlowerSearch('');
    setSuggestedFlowers([]);
  };

  // 꽃 검색 힌트 (보유 꽃 추가용)
  useEffect(() => {
    if (!flowerSearch.trim()) {
      setSuggestedFlowers([]);
      return;
    }
    const fetchFlowerHints = async () => {
      const { data } = await supabase
        .from('peekaboo_flowers')
        .select('*')
        .ilike('name', `%${flowerSearch.trim()}%`)
        .limit(5);
      if (data) setSuggestedFlowers(data);
    };
    const timer = setTimeout(fetchFlowerHints, 200);
    return () => clearTimeout(timer);
  }, [flowerSearch]);

  // 길드원에게 꽃 보유 정보 추가
  const addFlowerToMember = async (flower: any) => {
    if (!selectedMember) return;

    const exists = memberFlowers.some((mf) => mf.peekaboo_flowers?.id === flower.id);
    if (exists) {
      alert('이미 해당 길드원이 보유한 꽃으로 등록되어 있습니다.');
      return;
    }

    const { data, error } = await supabase.from('peekaboo_flower_owners').insert([
      {
        member_id: selectedMember.id,
        flower_id: flower.id,
        extra_score: 0,
      },
    ]).select(`
      id,
      extra_score,
      peekaboo_flowers (
        id,
        name,
        grade,
        score,
        image_url
      )
    `);

    if (!error && data) {
      const updatedList = [...memberFlowers, data[0]];
      setMemberFlowers(updatedList);
      setFlowerSearch('');
      setSuggestedFlowers([]);
      // 전체 리스트 상태도 갱신
      fetchMembers();
    } else {
      alert('꽃 등록 중 오류가 발생했습니다.');
    }
  };

  // 절품 추가 점수 실시간 수정 (보유 꽃 관리 탭용)
  const updateExtraScore = async (ownerId: string, newScore: number) => {
    const targetVal = Math.max(0, newScore);

    // 낙관적 업데이트 (모달 내부 리스트)
    setMemberFlowers(prev => prev.map(mf => mf.id === ownerId ? { ...mf, extra_score: targetVal } : mf));

    await supabase
      .from('peekaboo_flower_owners')
      .update({ extra_score: targetVal })
      .eq('id', ownerId);

    // 전체 데이터 리스트 동기화용 갱신
    fetchMembers();
  };

  // 길드원의 보유 꽃 삭제
  const removeMemberFlower = async (ownerId: string) => {
    const { error } = await supabase
      .from('peekaboo_flower_owners')
      .delete()
      .eq('id', ownerId);

    if (!error) {
      const updatedList = memberFlowers.filter((mf) => mf.id !== ownerId);
      setMemberFlowers(updatedList);
      fetchMembers();
    }
  };

  // 필터링된 길드원 리스트
  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.member_name.toLowerCase().includes(searchWord.toLowerCase()) || 
                          m.server_name.toLowerCase().includes(searchWord.toLowerCase());
    const matchesServer = serverFilter === 'all' || m.server_name === serverFilter;
    const matchesStatus = statusFilter === 'all' || m.mission_status === statusFilter;
    return matchesSearch && matchesServer && matchesStatus;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* 🛠️ 상단 제어 배너 (검색, 필터, 추가 버튼) */}
      <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-amber-900">👥 길드원 임무 관리</span>
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold border border-amber-200">
              총 {members.length}명 등록됨
            </span>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-amber-800 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm hover:bg-amber-900 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> 길드원 등록
          </button>
        </div>

        {/* 검색 및 서버 필터 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="길드원 이름 또는 서버 검색"
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="w-full p-2.5 pl-8 border-2 border-amber-200 rounded-xl font-bold bg-[#FDFBF7] text-xs focus:outline-none focus:border-amber-600"
            />
            <Search className="w-3.5 h-3.5 text-amber-500 absolute left-2.5 top-3.5" />
          </div>
        </div>

        {/* [수정됨] 임무 상태 탭 필터 색상 테마 적용 */}
        <div className="flex gap-1.5 overflow-x-auto pt-1">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors shrink-0 cursor-pointer ${
                  statusFilter === st ? activeStyle : inactiveStyle
                }`}
              >
                {st === 'all' ? '전체 보기' : `임무 ${st}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 📋 길드원 리스트 카드 */}
      <div className="space-y-2.5">
        {filteredMembers.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-amber-100 text-center text-xs font-bold text-amber-800">
            등록된 길드원이 없거나 검색 결과가 없습니다.
          </div>
        ) : (
          filteredMembers.map((member) => {
            const flowerCount = member.peekaboo_flower_owners?.length || 0;
            return (
              <div
                key={member.id}
                className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between gap-3 hover:border-amber-400 transition-all"
              >
                {/* 정보 영역 */}
                <div 
                  onClick={() => openMemberDetail(member)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-amber-950">{member.member_name}</span>
                    <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                      {member.server_name}
                    </span>
                    <span className="text-[10px] text-amber-600 font-bold">
                      보유 꽃: <span className="text-amber-900 font-black">{flowerCount}개</span>
                    </span>
                  </div>

                  {/* [수정됨] 임무 상태 뱃지 및 빠른 변경 토글 색상 통일 */}
                  <div className="flex items-center gap-1 mt-2">
                    {(['진행', '중단', '완료'] as const).map((st) => {
                      const isActive = member.mission_status === st;
                      let activeColor = 'bg-sky-100 text-blue-700 border border-sky-300 shadow-sm';
                      if (st === '중단') activeColor = 'bg-pink-100 text-rose-700 border border-pink-300 shadow-sm';
                      if (st === '완료') activeColor = 'bg-lime-100 text-emerald-700 border border-lime-300 shadow-sm';

                      return (
                        <button
                          key={st}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateMissionStatus(member.id, st);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                            isActive
                              ? activeColor
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openMemberDetail(member)}
                    className="p-2 bg-amber-50 text-amber-900 rounded-xl hover:bg-amber-100 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                  >
                    <span>보유꽃 관리</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteMember(member.id, member.member_name)}
                    className="p-2 text-stone-300 hover:text-red-500 transition-colors cursor-pointer"
                    title="길드원 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ➕ 길드원 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 border-2 border-amber-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-amber-900">✨ 새로운 길드원 등록</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-amber-800 block mb-1">서버 이름</label>
                <input
                  type="text"
                  placeholder="예: 루나, 스카니아 등"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  className="w-full p-2.5 border border-amber-200 rounded-xl text-xs font-bold bg-amber-50/30 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-amber-800 block mb-1">길드원 닉네임</label>
                <input
                  type="text"
                  placeholder="캐릭터 닉네임 입력"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full p-2.5 border border-amber-200 rounded-xl text-xs font-bold bg-amber-50/30 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-800 text-white rounded-xl text-xs font-black hover:bg-amber-900 cursor-pointer"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌸 길드원 상세 및 보유 꽃 관리 모달 */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FDFBF7] w-full max-w-md max-h-[85vh] rounded-3xl p-5 shadow-2xl overflow-y-auto space-y-4 border-2 border-amber-200">
            {/* 모달 상단 */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-black">
                    {selectedMember.server_name}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
                    selectedMember.mission_status === '완료' ? 'bg-lime-100 text-emerald-700 border-lime-300' :
                    selectedMember.mission_status === '중단' ? 'bg-pink-100 text-rose-700 border-pink-300' : 'bg-sky-100 text-blue-700 border-sky-300'
                  }`}>
                    {selectedMember.mission_status}
                  </span>
                </div>
                <h2 className="text-base font-black text-amber-950 mt-1">{selectedMember.member_name}님의 보유 꽃 관리</h2>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 꽃 검색 및 추가 입력 상자 */}
            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 space-y-2 relative">
              <span className="text-xs font-black text-amber-900">🌸 보유한 꽃 추가하기</span>
              <input
                type="text"
                placeholder="꽃 이름을 검색해서 추가하세요"
                value={flowerSearch}
                onChange={(e) => setFlowerSearch(e.target.value)}
                className="w-full p-2.5 border border-amber-200 rounded-xl text-xs font-bold bg-amber-50/50 focus:outline-none"
              />
              {suggestedFlowers.length > 0 && flowerSearch.trim() && (
                <div className="absolute left-3.5 right-3.5 top-full bg-white border border-amber-200 rounded-xl shadow-lg z-10 max-h-36 overflow-y-auto">
                  {suggestedFlowers.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => addFlowerToMember(f)}
                      className="px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50 cursor-pointer flex justify-between items-center border-b border-amber-50"
                    >
                      <div className="flex items-center gap-2">
                        <span>{f.name}</span>
                        <span className="text-[10px] text-amber-600">({f.grade})</span>
                      </div>
                      <span className="text-[10px] bg-amber-800 text-white px-2 py-0.5 rounded font-bold">추가 +</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 보유 꽃 리스트 */}
            <div className="space-y-2">
              <span className="text-xs font-black text-amber-900">📋 등록된 보유 꽃 목록 ({memberFlowers.length}개)</span>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {memberFlowers.length === 0 ? (
                  <div className="p-4 bg-white rounded-xl border border-amber-200 text-center text-xs text-amber-700 font-bold">
                    등록된 보유 꽃이 없습니다.
                  </div>
                ) : (
                  [...memberFlowers]
                    .sort((a, b) => {
                      const scoreA = (a.peekaboo_flowers?.score || 0) + (a.extra_score || 0);
                      const scoreB = (b.peekaboo_flowers?.score || 0) + (b.extra_score || 0);
                      return scoreB - scoreA;
                    })
                    .map((mf) => {
                      const flower = mf.peekaboo_flowers;
                      if (!flower) return null;
                      const totalScore = (flower.score || 0) + (mf.extra_score || 0);
                      
                      return (
                        <div key={mf.id} className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-2 shadow-sm">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {flower.image_url ? (
                              <img src={flower.image_url} alt={flower.name} className="w-9 h-9 rounded-lg object-cover bg-amber-50" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-xs">🌸</div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-black text-amber-900 truncate">{flower.name}</span>
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                                  {flower.grade}
                                </span>
                              </div>
                              <p className="text-[10px] text-amber-600 font-bold">
                                기본: {flower.score}점 | 합산: <span className="text-amber-900 font-black">{totalScore}점</span>
                              </p>
                            </div>
                          </div>

                          {/* 절품 추가 점수 수정 및 증감 버튼 영역 */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-amber-700 font-black">절품 +</span>
                            
                            <div className="flex items-center bg-amber-50/80 border border-amber-200 rounded-xl overflow-hidden shadow-sm">
                              <input 
                                type="number" 
                                value={mf.extra_score === 0 ? '' : mf.extra_score} 
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  updateExtraScore(mf.id, val);
                                }}
                                className="w-10 py-1 text-xs font-black text-center bg-transparent focus:outline-none text-amber-950 placeholder:text-amber-300"
                              />
                              
                              <div className="flex flex-col border-l border-amber-200">
                                <button 
                                  type="button"
                                  onClick={() => updateExtraScore(mf.id, (mf.extra_score || 0) + 1)}
                                  className="px-1.5 py-0.5 text-[9px] font-black bg-amber-100/70 hover:bg-amber-200 text-amber-900 transition-colors leading-none cursor-pointer"
                                >
                                  ▲
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => updateExtraScore(mf.id, Math.max(0, (mf.extra_score || 0) - 1))}
                                  className="px-1.5 py-0.5 text-[9px] font-black bg-amber-100/40 hover:bg-amber-200 text-amber-900 transition-colors border-t border-amber-200 leading-none cursor-pointer"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>

                            <button
                              onClick={() => removeMemberFlower(mf.id)}
                              className="w-7 h-7 bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold hover:bg-red-100 shrink-0 ml-1 cursor-pointer"
                              title="보유 꽃 삭제"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}