'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NavigationLayout from '@/components/NavigationLayout';
import { 
  FaUsers, FaUserPlus, FaSearch, FaTrashAlt, 
  FaEdit, FaSeedling, FaTimes, FaChevronUp, FaChevronDown 
} from 'react-icons/fa';

// [등급 & 상태 스타일 정의]
const getGradeBadgeColor = (grade: string) => {
  const g = grade?.toUpperCase() || '';
  if (g === 'UR+' || g === 'UR') return 'bg-pink-100 text-pink-700 border-pink-200';
  if (g === 'SSR') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (g === 'SR+' || g === 'SR') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (g === 'R') return 'bg-sky-100 text-sky-700 border-sky-200';
  if (g === 'N') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return 'bg-stone-100 text-stone-600 border-stone-200';
};

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case '진행':
    case '임무 진행': return 'bg-blue-100 text-blue-700 border-blue-200';
    case '중단':
    case '임무 중단': return 'bg-rose-100 text-rose-700 border-rose-200';
    case '완료':
    case '임무 완료': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default: return 'bg-stone-100 text-stone-600 border-stone-200';
  }
};

const getRoleStyle = (role: string, isSelected: boolean = false) => {
  if (isSelected) {
    switch (role) {
      case '길드장': return 'bg-purple-600 text-white border-purple-600 shadow-xs';
      case '부길드장': return 'bg-pink-600 text-white border-pink-600 shadow-xs';
      case '임원': return 'bg-yellow-500 text-white border-yellow-500 shadow-xs';
      case '정예': return 'bg-teal-600 text-white border-teal-600 shadow-xs';
      case '멤버': return 'bg-stone-500 text-white border-stone-500 shadow-xs';
      default: return 'bg-stone-800 text-white border-stone-800 shadow-xs';
    }
  }
  switch (role) {
    case '길드장': return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
    case '부길드장': return 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100';
    case '임원': return 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
    case '정예': return 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100';
    case '멤버': return 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200';
    default: return 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100';
  }
};

const getStatusChipStyle = (status: string, isSelected: boolean) => {
  if (isSelected) {
    switch (status) {
      case '진행': return 'bg-blue-600 text-white border-blue-600 shadow-xs';
      case '중단': return 'bg-rose-600 text-white border-rose-600 shadow-xs';
      case '완료': return 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
      default: return 'bg-stone-800 text-white border-stone-800 shadow-xs';
    }
  }
  switch (status) {
    case '진행': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    case '중단': return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
    case '완료': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    default: return 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100';
  }
};

const getFlowerGradeChipStyle = (gradeKey: string, isSelected: boolean) => {
  if (isSelected) {
    switch (gradeKey) {
      case 'UR+':
      case 'UR': return 'bg-pink-500 text-white border-pink-500 shadow-xs';
      case 'SSR': return 'bg-amber-400 text-stone-900 border-amber-400 shadow-xs font-extrabold';
      case 'SR+':
      case 'SR': return 'bg-purple-500 text-white border-purple-500 shadow-xs';
      case 'R': return 'bg-sky-500 text-white border-sky-500 shadow-xs';
      case 'N': return 'bg-emerald-500 text-white border-emerald-500 shadow-xs';
      default: return 'bg-stone-800 text-white border-stone-800 shadow-xs';
    }
  }
  switch (gradeKey) {
    case 'UR+':
    case 'UR': return 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100';
    case 'SSR': return 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
    case 'SR+':
    case 'SR': return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
    case 'R': return 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100';
    case 'N': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    default: return 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100';
  }
};

const GRADE_ORDER: { [key: string]: number } = {
  'UR+': 7, 'UR': 6, 'SSR': 5, 'SR+': 4, 'SR': 3, 'R': 2, 'N': 1
};

const ROLE_WEIGHT: { [key: string]: number } = {
  '길드장': 5,
  '부길드장': 4,
  '임원': 3,
  '정예': 2,
  '멤버': 1
};

const ROLES = ['길드장', '부길드장', '임원', '정예', '멤버'];
const STATUSES = ['진행', '중단', '완료'];
const FLOWER_GRADES = ['UR+', 'UR', 'SSR', 'SR+', 'SR', 'R'];

export default function GuildTasksPage() {
  const router = useRouter();
  const [guildId, setGuildId] = useState<number | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [memberFlowerCounts, setMemberFlowerCounts] = useState<{ [key: string]: number }>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [roleInput, setRoleInput] = useState('멤버');
  const [missionStatusInput, setMissionStatusInput] = useState('진행');

  const [selectedMemberForFlowers, setSelectedMemberForFlowers] = useState<any | null>(null);
  const [memberFlowers, setMemberFlowers] = useState<any[]>([]);
  const [allFlowers, setAllFlowers] = useState<any[]>([]);
  const [flowerSearchQuery, setFlowerSearchQuery] = useState('');
  const [flowerSuggestions, setFlowerSuggestions] = useState<any[]>([]);
  
  const [selectedOwnedFlowerGrades, setSelectedOwnedFlowerGrades] = useState<string[]>([]);

  useEffect(() => {
    const sGId = localStorage.getItem('guild_id');
    if (!sGId) {
      alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
      router.push('/');
      return;
    }
    const gIdNum = Number(sGId);
    setGuildId(gIdNum);
    fetchMembers(gIdNum);
    fetchAllFlowers();
  }, [router]);

  const fetchMembers = async (gId: number) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('guild_id', gId);
    
    if (!error && data) {
      const sortedMembers = data.sort((a, b) => {
        const weightA = ROLE_WEIGHT[a.role] || 1;
        const weightB = ROLE_WEIGHT[b.role] || 1;
        if (weightA !== weightB) {
          return weightB - weightA;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setMembers(sortedMembers);
      fetchAllMemberFlowerCounts(sortedMembers);
    }
  };

  const fetchAllMemberFlowerCounts = async (memberList: any[]) => {
    const counts: { [key: string]: number } = {};
    for (const m of memberList) {
      const { count, error } = await supabase
        .from('user_flowers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', m.id)
        .eq('is_owned', 'Y');
      
      if (!error && count !== null) {
        counts[m.id] = count;
      } else {
        counts[m.id] = 0;
      }
    }
    setMemberFlowerCounts(counts);
  };

  const fetchAllFlowers = async () => {
    const { data, error } = await supabase.from('flowers').select('*');
    if (!error && data) setAllFlowers(data);
  };

  const fetchMemberFlowers = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_flowers')
      .select('*, flowers (*)')
      .eq('user_id', userId)
      .eq('is_owned', 'Y');

    if (!error && data) {
      const sorted = data.sort((a, b) => {
        const gradeA = GRADE_ORDER[a.flowers?.grade?.toUpperCase()] || 0;
        const gradeB = GRADE_ORDER[b.flowers?.grade?.toUpperCase()] || 0;
        if (gradeA !== gradeB) return gradeB - gradeA;
        return (b.flowers?.score || 0) - (a.flowers?.score || 0);
      });
      setMemberFlowers(sorted);
    } else {
      setMemberFlowers([]);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId || !nicknameInput.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    const trimmedNickname = nicknameInput.trim();

    if (editingMember) {
      // [수정 시] 현재 수정 중인 본인을 제외하고, 동일 길드 내에 같은 닉네임이 있는지 확인
      const { data: dupCheck, error: dupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('guild_id', guildId)
        .eq('nickname', trimmedNickname)
        .neq('id', editingMember.id);

      if (dupError) {
        alert('중복 닉네임 확인 중 오류가 발생했습니다: ' + dupError.message);
        return;
      }

      if (dupCheck && dupCheck.length > 0) {
        alert(`길드 내에 동일한 닉네임이 존재합니다. [${trimmedNickname}_2] 형식으로 사용을 권장드립니다.`);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: trimmedNickname,
          role: roleInput,
          mission_status: missionStatusInput
        })
        .eq('id', editingMember.id);

      if (error) {
        alert('길드원 정보 수정 실패: ' + error.message);
        return;
      }
    } else {
      // [등록 시] 동일 길드 내에 같은 닉네임이 있는지 확인
      const { data: dupCheck, error: dupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('guild_id', guildId)
        .eq('nickname', trimmedNickname);

      if (dupError) {
        alert('중복 닉네임 확인 중 오류가 발생했습니다: ' + dupError.message);
        return;
      }

      if (dupCheck && dupCheck.length > 0) {
        alert(`길드 내에 동일한 닉네임이 존재합니다. [${trimmedNickname}_2] 형식으로 사용을 권장드립니다.`);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .insert([{
          guild_id: guildId,
          nickname: trimmedNickname,
          role: roleInput,
          mission_status: '진행',
          is_basic_only: 'N',
          is_vip: 'N'
        }]);

      if (error) {
        alert('길드원 등록 실패: ' + error.message);
        return;
      }
    }

    setIsMemberModalOpen(false);
    setEditingMember(null);
    setNicknameInput('');
    fetchMembers(guildId);
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`'${name}' 길드원을 정말 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error && guildId) fetchMembers(guildId);
    else alert('삭제 중 오류가 발생했습니다.');
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === '진행' ? '중단' : currentStatus === '중단' ? '완료' : '진행';
    const { error } = await supabase
      .from('profiles')
      .update({ mission_status: nextStatus })
      .eq('id', id);
    if (!error && guildId) fetchMembers(guildId);
  };

  const handleUpdateExtraScore = async (recordId: number, newScore: number) => {
    const validScore = Math.max(0, newScore);
    setMemberFlowers(prev => prev.map(item => item.id === recordId ? { ...item, extra_score: validScore } : item));

    await supabase
      .from('user_flowers')
      .update({ extra_score: validScore })
      .eq('id', recordId);
  };

  const handleDeleteUserFlower = async (recordId: number) => {
    const { error } = await supabase.from('user_flowers').delete().eq('id', recordId);
    if (!error && selectedMemberForFlowers) {
      fetchMemberFlowers(selectedMemberForFlowers.id);
      fetchAllMemberFlowerCounts(members);
    }
  };

  useEffect(() => {
    const ownedFlowerIds = memberFlowers.map(mf => mf.flower_id);
    let filtered = allFlowers.filter(f => !ownedFlowerIds.includes(f.id));

    if (flowerSearchQuery.trim()) {
      filtered = filtered.filter(f => f.name.toLowerCase().includes(flowerSearchQuery.toLowerCase()));
      setFlowerSuggestions(filtered.slice(0, 10));
    } else {
      setFlowerSuggestions([]);
    }
  }, [flowerSearchQuery, allFlowers, memberFlowers]);

  const toggleOwnedFlowerGradeFilter = (gradeId: string) => {
    setSelectedOwnedFlowerGrades(prev => 
      prev.includes(gradeId) ? prev.filter(g => g !== gradeId) : [...prev, gradeId]
    );
  };

  const filteredMemberFlowers = memberFlowers.filter(item => {
    if (selectedOwnedFlowerGrades.length === 0) return true;
    const flowerGrade = item.flowers?.grade?.toUpperCase() || '';
    return selectedOwnedFlowerGrades.includes(flowerGrade);
  });

  const filteredMembers = members.filter(m => {
    if (searchKeyword && !m.nickname.toLowerCase().includes(searchKeyword.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && m.mission_status !== statusFilter) return false;
    return true;
  });

  return (
    <NavigationLayout>
      <div className="px-4 space-y-4 animate-in fade-in duration-200 pb-10">
        
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-stone-200/80 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-pink-100 text-pink-500 flex items-center justify-center shadow-2xs shrink-0">
                <FaUsers className="text-xs" />
              </span> 
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-extrabold text-stone-900 tracking-tight">길드원 보유 꽃 & 임무 관리</h2>
                <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-bold border border-stone-200">
                  총 {members.length}명
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingMember(null);
                setNicknameInput('');
                setRoleInput('멤버');
                setMissionStatusInput('진행');
                setIsMemberModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-pink-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs hover:bg-pink-600 transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
            >
              <FaUserPlus className="text-xs" /> 길드원 등록
            </button>
          </div>

          <div className="border-t border-stone-100" />

          <div className="space-y-3">
            <div className="relative flex items-center">
              <FaSearch className="absolute left-4 text-stone-300 text-sm pointer-events-none" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="길드원 닉네임 검색..."
                className="w-full pl-11 pr-4 py-2.5 bg-stone-50 rounded-xl outline-none text-xs font-medium border border-stone-200 focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {[
                { id: 'ALL', label: '전체보기' },
                { id: '진행', label: '임무진행' },
                { id: '중단', label: '임무중단' },
                { id: '완료', label: '임무완료' }
              ].map(tab => {
                const isSelected = statusFilter === tab.id;
                let statusChipStyle = '';
                if (isSelected) {
                  if (tab.id === 'ALL') statusChipStyle = 'bg-stone-800 text-white border-stone-800 shadow-xs';
                  else if (tab.id === '진행') statusChipStyle = 'bg-blue-600 text-white border-blue-600 shadow-xs';
                  else if (tab.id === '중단') statusChipStyle = 'bg-rose-600 text-white border-rose-600 shadow-xs';
                  else if (tab.id === '완료') statusChipStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
                } else {
                  if (tab.id === 'ALL') statusChipStyle = 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200';
                  else if (tab.id === '진행') statusChipStyle = 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
                  else if (tab.id === '중단') statusChipStyle = 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
                  else if (tab.id === '완료') statusChipStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
                }
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${statusChipStyle}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-16 text-stone-400 text-xs bg-white rounded-2xl border border-stone-200/80 shadow-xs font-medium">
              등록된 길드원이 없거나 검색 결과가 없습니다.
            </div>
          ) : (
            filteredMembers.map(member => {
              const currentStatus = member.mission_status || '진행';
              const roleName = member.role || '멤버';
              const flowerCount = memberFlowerCounts[member.id] || 0;

              return (
                <div key={member.id} className="bg-white p-4 rounded-2xl shadow-xs border border-stone-200/80 flex items-center justify-between gap-3 hover:border-pink-300 transition-all">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-stone-900 tracking-tight">{member.nickname}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRoleStyle(roleName, false)}`}>
                        {roleName}
                      </span>
                      <button
                        onClick={() => handleUpdateStatus(member.id, currentStatus)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-all hover:scale-105 active:scale-95 ${getStatusBadgeStyle(currentStatus)}`}
                        title="클릭하여 상태 변경"
                      >
                        {currentStatus} ↻
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-stone-500 font-medium">
                      <span className="flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                        <FaSeedling className="text-[10px]" /> 보유 꽃: {flowerCount}개
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedMemberForFlowers(member);
                        fetchMemberFlowers(member.id);
                        setFlowerSearchQuery('');
                        setSelectedOwnedFlowerGrades([]);
                        setFlowerSuggestions([]);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 text-[11px] font-bold border border-pink-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="보유 꽃 관리"
                    >
                      <FaSeedling className="text-xs text-pink-500" /> <span>보유 꽃</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingMember(member);
                        setNicknameInput(member.nickname);
                        setRoleInput(roleName);
                        setMissionStatusInput(currentStatus);
                        setIsMemberModalOpen(true);
                      }}
                      className="w-8 h-8 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-500 flex items-center justify-center transition-all cursor-pointer border border-stone-200 active:scale-95"
                      title="수정"
                    >
                      <FaEdit className="text-xs" />
                    </button>

                    <button
                      onClick={() => handleDeleteMember(member.id, member.nickname)}
                      className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-all cursor-pointer border border-rose-200 active:scale-95"
                      title="삭제"
                    >
                      <FaTrashAlt className="text-xs" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {isMemberModalOpen && (
          <div 
            onClick={() => setIsMemberModalOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-stone-100 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-stone-900">{editingMember ? '길드원 정보 수정' : '신규 길드원 등록'}</h3>
                <button onClick={() => setIsMemberModalOpen(false)} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-all cursor-pointer">
                  <FaTimes className="text-xs" />
                </button>
              </div>

              <form onSubmit={handleSaveMember} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-stone-500 mb-1.5 ml-0.5">닉네임 (캐릭터명)</label>
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder="닉네임 입력"
                    className="w-full px-4 py-3 bg-stone-50 rounded-2xl outline-none font-medium border border-stone-200 focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-500 mb-1.5 ml-0.5">직급</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLES.map(r => {
                      const isSelected = roleInput === r;
                      return (
                        <button
                          type="button"
                          key={r}
                          onClick={() => setRoleInput(r)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${getRoleStyle(r, isSelected)}`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-500 mb-1.5 ml-0.5">임무 상태</label>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map(s => {
                      const isSelected = missionStatusInput === s;
                      return (
                        <button
                          type="button"
                          key={s}
                          onClick={() => setMissionStatusInput(s)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${getStatusChipStyle(s, isSelected)}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-pink-500 text-white font-bold py-3.5 rounded-2xl hover:bg-pink-600 transition-all cursor-pointer shadow-xs active:scale-95 mt-2"
                >
                  저장하기
                </button>
              </form>
            </div>
          </div>
        )}

        {selectedMemberForFlowers && (
          <div 
            onClick={() => setSelectedMemberForFlowers(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FFFDF9] rounded-[28px] p-5 max-w-md w-full max-h-[88vh] overflow-y-auto shadow-2xl border border-amber-100 space-y-4" 
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="flex justify-between items-center border-b border-stone-200/60 pb-3.5">
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900">{selectedMemberForFlowers.nickname}님의 보유 꽃 관리</h3>
                  <p className="text-xs text-amber-800/80 font-medium mt-0.5">보유 목록 추가 및 절품 점수를 관리하세요.</p>
                </div>
                <button onClick={() => setSelectedMemberForFlowers(null)} className="w-8 h-8 rounded-full bg-amber-100/60 flex items-center justify-center text-stone-600 hover:bg-amber-200 transition-all cursor-pointer">
                  <FaTimes className="text-xs" />
                </button>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-xs space-y-2 relative">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                  <FaSearch className="text-amber-500 text-[11px]" />
                  <span>보유 꽃 추가 검색</span>
                </div>
                
                <input
                  type="text"
                  value={flowerSearchQuery}
                  onChange={(e) => setFlowerSearchQuery(e.target.value)}
                  placeholder="추가할 꽃 이름을 입력하세요"
                  className="w-full px-3.5 py-2.5 bg-stone-50 rounded-xl outline-none text-xs border border-stone-200 focus:bg-white focus:ring-2 focus:ring-amber-200 transition-all"
                />

                {flowerSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-stone-200 z-40 overflow-hidden max-h-56 overflow-y-auto">
                    {flowerSuggestions.map(f => (
                      <div
                        key={f.id}
                        onClick={async () => {
                          await supabase.from('user_flowers').upsert({
                            user_id: selectedMemberForFlowers.id,
                            flower_id: f.id,
                            is_owned: 'Y',
                            extra_score: 0
                          }, { onConflict: 'user_id,flower_id' });

                          fetchMemberFlowers(selectedMemberForFlowers.id);
                          fetchAllMemberFlowerCounts(members);
                          setFlowerSearchQuery('');
                          setFlowerSuggestions([]);
                        }}
                        className="px-3.5 py-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between text-xs transition-all border-b border-stone-100 last:border-none"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getGradeBadgeColor(f.grade)}`}>{f.grade}</span>
                          <span className="font-bold text-stone-800">{f.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">+ 추가하기</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-800 ml-1">
                    등록된 보유 꽃 목록 ({filteredMemberFlowers.length}/{memberFlowers.length}개)
                  </h4>
                  {selectedOwnedFlowerGrades.length > 0 && (
                    <button 
                      onClick={() => setSelectedOwnedFlowerGrades([])}
                      className="text-[11px] text-pink-600 font-bold hover:underline cursor-pointer mr-1"
                    >
                      필터 초기화
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-wrap bg-white p-2.5 rounded-2xl border border-amber-200/60 shadow-xs">
                  <span className="text-[11px] font-bold text-stone-400 mr-1">등급 필터:</span>
                  {FLOWER_GRADES.map(fg => {
                    const isSelected = selectedOwnedFlowerGrades.includes(fg);
                    return (
                      <button
                        type="button"
                        key={fg}
                        onClick={() => toggleOwnedFlowerGradeFilter(fg)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${getFlowerGradeChipStyle(fg, isSelected)}`}
                      >
                        {fg}
                      </button>
                    );
                  })}
                </div>

                {filteredMemberFlowers.length === 0 ? (
                  <div className="text-center py-10 text-stone-400 text-xs bg-white/50 rounded-2xl border border-amber-200/40 font-medium">
                    {memberFlowers.length === 0 ? '등록된 보유 꽃이 없습니다.' : '선택한 등급에 해당하는 보유 꽃이 없습니다.'}
                  </div>
                ) : (
                  filteredMemberFlowers.map(item => {
                    const flower = item.flowers || {};
                    const baseScore = flower.score || 0;
                    const extraScore = item.extra_score || 0;
                    const totalScore = baseScore + extraScore;

                    return (
                      <div key={item.id} className="bg-white p-3.5 rounded-2xl shadow-xs border border-amber-200/70 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-xl bg-amber-50 overflow-hidden flex items-center justify-center border border-amber-200 shrink-0 shadow-2xs">
                            {flower.image_url ? <img src={flower.image_url} alt="" className="w-full h-full object-cover" /> : <FaSeedling className="text-amber-300" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getGradeBadgeColor(flower.grade)}`}>{flower.grade}</span>
                              <span className="text-xs font-bold text-stone-900 truncate">{flower.name}</span>
                            </div>
                            <p className="text-[11px] text-amber-800/80 font-medium mt-1">
                              합산: <span className="font-extrabold text-amber-900">{totalScore}점</span> 
                              <span className="text-stone-400 text-[10px] ml-1 font-normal">(기본 {baseScore} + 절품 {extraScore})</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
                            <input
                              type="number"
                              min="0"
                              value={extraScore}
                              onChange={(e) => handleUpdateExtraScore(item.id, parseInt(e.target.value) || 0)}
                              className="w-10 py-1.5 text-center text-xs font-bold text-stone-800 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <div className="flex flex-col border-l border-stone-200 bg-white">
                              <button onClick={() => handleUpdateExtraScore(item.id, extraScore + 1)} className="px-1.5 py-0.5 hover:bg-amber-100 text-stone-500 transition cursor-pointer">
                                <FaChevronUp className="text-[9px]" />
                              </button>
                              <button onClick={() => handleUpdateExtraScore(item.id, extraScore - 1)} className="px-1.5 py-0.5 hover:bg-amber-100 text-stone-500 transition cursor-pointer border-t border-stone-100">
                                <FaChevronDown className="text-[9px]" />
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteUserFlower(item.id)}
                            className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition cursor-pointer border border-rose-200 shadow-2xs"
                            title="삭제"
                          >
                            <FaTrashAlt className="text-xs" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </NavigationLayout>
  );
}