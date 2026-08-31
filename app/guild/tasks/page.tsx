'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import NavigationLayout from '@/components/NavigationLayout';
import { 
  FaUsers, FaUserPlus, FaSearch, FaTrashAlt, 
  FaEdit, FaSeedling, FaTimes, 
  FaListUl, FaCheckCircle, FaTimesCircle, FaChevronDown, FaChevronUp, FaCheck,
  FaExclamationTriangle
} from 'react-icons/fa';

// [등급 & 상태 스타일 정의 생략 - 기존과 동일]
const getGradeBadgeColor = (grade: string) => {
  const g = grade?.toUpperCase() || '';
  if (g === 'UR+' || g === 'UR') return 'text-pink-600 font-extrabold';
  if (g === 'SSR') return 'text-amber-600 font-extrabold';
  if (g === 'SR+' || g === 'SR') return 'text-purple-600 font-extrabold';
  if (g === 'R') return 'text-sky-600 font-extrabold';
  if (g === 'N') return 'text-emerald-600 font-extrabold';
  return 'text-stone-600 font-extrabold';
};

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case '진행':
    case '임무 진행': return 'text-blue-600 font-extrabold';
    case '중단':
    case '임무 중단': return 'text-rose-600 font-extrabold';
    case '완료':
    case '임무 완료': return 'text-emerald-600 font-extrabold';
    default: return 'text-stone-600 font-extrabold';
  }
};

const getRoleStyle = (role: string, isSelected: boolean = false) => {
  if (isSelected) {
    switch (role) {
      case '길드장': return 'bg-purple-600 text-white shadow-xs';
      case '부길드장': return 'bg-pink-600 text-white shadow-xs';
      case '임원': return 'bg-yellow-500 text-white shadow-xs';
      case '정예': return 'bg-teal-600 text-white shadow-xs';
      case '멤버': return 'bg-stone-500 text-white shadow-xs';
      default: return 'bg-stone-800 text-white shadow-xs';
    }
  }
  switch (role) {
    case '길드장': return 'text-purple-600 font-extrabold hover:bg-purple-50';
    case '부길드장': return 'text-pink-600 font-extrabold hover:bg-pink-50';
    case '임원': return 'text-yellow-700 font-extrabold hover:bg-yellow-50';
    case '정예': return 'text-teal-600 font-extrabold hover:bg-teal-50';
    case '멤버': return 'text-stone-600 font-extrabold hover:bg-stone-100';
    default: return 'text-stone-500 font-extrabold hover:bg-stone-100';
  }
};

const getFlowerGradeChipStyle = (gradeKey: string, isSelected: boolean) => {
  if (isSelected) {
    switch (gradeKey) {
      case 'UR+':
      case 'UR': return 'bg-pink-500 text-white shadow-xs';
      case 'SSR': return 'bg-amber-400 text-stone-900 shadow-xs font-extrabold';
      case 'SR+':
      case 'SR': return 'bg-purple-500 text-white shadow-xs';
      case 'R': return 'bg-sky-500 text-white shadow-xs';
      case 'N': return 'bg-emerald-500 text-white shadow-xs';
      default: return 'bg-stone-800 text-white shadow-xs';
    }
  }
  switch (gradeKey) {
    case 'UR+':
    case 'UR': return 'text-pink-600 font-bold hover:bg-pink-50';
    case 'SSR': return 'text-amber-700 font-bold hover:bg-amber-50';
    case 'SR+':
    case 'SR': return 'text-purple-600 font-bold hover:bg-purple-50';
    case 'R': return 'text-sky-600 font-bold hover:bg-sky-50';
    case 'N': return 'text-emerald-600 font-bold hover:bg-emerald-50';
    default: return 'text-stone-500 font-bold hover:bg-stone-100';
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
const FLOWER_GRADES = ['UR+', 'UR', 'SSR', 'SR+', 'SR', 'R', 'N'];

export default function GuildTasksPage() {
  const router = useRouter();
  const [guildId, setGuildId] = useState<number | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [memberFlowerCounts, setMemberFlowerCounts] = useState<{ [key: string]: number }>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // 스크롤 방향 및 앱바 노출 상태 감지용
  const [isAppbarVisible, setIsAppbarVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsAppbarVisible(false);
      } else {
        setIsAppbarVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 로딩 및 모달 상태들
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [roleInput, setRoleInput] = useState('멤버');
  const [missionStatusInput, setMissionStatusInput] = useState('진행');
  const [deletingMember, setDeletingMember] = useState<{ id: string; name: string } | null>(null);
  const [selectedMemberForFlowers, setSelectedMemberForFlowers] = useState<any | null>(null);
  const [memberFlowers, setMemberFlowers] = useState<any[]>([]);
  const [allFlowers, setAllFlowers] = useState<any[]>([]);
  const [flowerSearchQuery, setFlowerSearchQuery] = useState('');
  const [flowerSuggestions, setFlowerSuggestions] = useState<any[]>([]);
  const [selectedOwnedFlowerGrades, setSelectedOwnedFlowerGrades] = useState<string[]>([]);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchGrades, setBatchGrades] = useState<string[]>([]);
  const [batchPage, setBatchPage] = useState(1);

  // 모달창 활성화 시 뒤쪽 화면 스크롤 방지 처리
  useEffect(() => {
    const isAnyModalOpen = isMemberModalOpen || deletingMember !== null || selectedMemberForFlowers !== null;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMemberModalOpen, deletingMember, selectedMemberForFlowers]);
  
  useEffect(() => {
    const sGId = localStorage.getItem('guild_id');
    if (!sGId) {
      alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
      router.push('/');
      return;
    }
    const gIdNum = Number(sGId);
    setGuildId(gIdNum);
    
    const initData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchMembers(gIdNum),
        fetchAllFlowers()
      ]);
      setIsLoading(false);
    };

    initData();
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
        if (weightA !== weightB) return weightB - weightA;
        const nameA = a.nickname || '';
        const nameB = b.nickname || '';
        if (nameA !== nameB) return nameA.localeCompare(nameB, 'ko-KR');
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      setMembers(sortedMembers);
      await fetchAllMemberFlowerCounts(sortedMembers);
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
      
      if (!error && count !== null) counts[m.id] = count;
      else counts[m.id] = 0;
    }
    setMemberFlowerCounts(counts);
  };

  const fetchAllFlowers = async () => {
    const { data, error } = await supabase.from('flowers').select('*');
    if (!error && data) setAllFlowers(data);
  };

  const fetchMemberFlowers = async (userId: string) => {
    setIsModalLoading(true);
    const { data, error } = await supabase
      .from('user_flowers')
      .select('*, flowers (*)')
      .eq('user_id', userId)
      .eq('is_owned', 'Y');

    if (!error && data) {
      const sorted = data.sort((a, b) => {
        const scoreA = (a.flowers?.score || 0) + (a.extra_score || 0);
        const scoreB = (b.flowers?.score || 0) + (b.extra_score || 0);
        if (scoreA !== scoreB) return scoreB - scoreA;
        const gradeA = GRADE_ORDER[a.flowers?.grade?.toUpperCase()] || 0;
        const gradeB = GRADE_ORDER[b.flowers?.grade?.toUpperCase()] || 0;
        return gradeB - gradeA;
      });
      setMemberFlowers(sorted);
    } else {
      setMemberFlowers([]);
    }
    setIsModalLoading(false);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId || !nicknameInput.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    const trimmedNickname = nicknameInput.trim();

    if (editingMember) {
      const { data: dupCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('guild_id', guildId)
        .eq('nickname', trimmedNickname)
        .neq('id', editingMember.id);

      if (dupCheck && dupCheck.length > 0) {
        alert(`길드 내에 동일한 닉네임이 존재합니다. [${trimmedNickname}_2] 형식으로 사용을 권장드립니다.`);
        return;
      }

      await supabase
        .from('profiles')
        .update({
          nickname: trimmedNickname,
          role: roleInput,
          mission_status: missionStatusInput
        })
        .eq('id', editingMember.id);
    } else {
      const { data: dupCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('guild_id', guildId)
        .eq('nickname', trimmedNickname);

      if (dupCheck && dupCheck.length > 0) {
        alert(`길드 내에 동일한 닉네임이 존재합니다. [${trimmedNickname}_2] 형식으로 사용을 권장드립니다.`);
        return;
      }

      await supabase
        .from('profiles')
        .insert([{
          guild_id: guildId,
          nickname: trimmedNickname,
          role: roleInput,
          mission_status: missionStatusInput,
          is_basic_only: 'N',
          is_vip: 'N'
        }]);
    }

    setIsMemberModalOpen(false);
    setEditingMember(null);
    setNicknameInput('');
    fetchMembers(guildId);
  };

  const confirmDeleteMember = async () => {
    if (!deletingMember) return;
    const { error } = await supabase.from('profiles').delete().eq('id', deletingMember.id);
    if (!error && guildId) fetchMembers(guildId);
    setDeletingMember(null);
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
    await supabase.from('user_flowers').update({ extra_score: validScore }).eq('id', recordId);
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

  const toggleBatchGradeFilter = (gradeId: string) => {
    setBatchGrades(prev => 
      prev.includes(gradeId) ? prev.filter(g => g !== gradeId) : [...prev, gradeId]
    );
    setBatchPage(1);
  };

  const baseFilteredAllFlowers = allFlowers.filter(f => {
    if (batchGrades.length === 0) return true;
    const flowerGrade = f.grade?.toUpperCase() || '';
    return batchGrades.includes(flowerGrade);
  });

  const sortedBatchFlowers = [...baseFilteredAllFlowers].sort((a, b) => {
    const gradeA = GRADE_ORDER[a.grade?.toUpperCase()] || 0;
    const gradeB = GRADE_ORDER[b.grade?.toUpperCase()] || 0;
    if (gradeA !== gradeB) return gradeB - gradeA;
    return (b.score || 0) - (a.score || 0);
  });

  const pageSize = 5;
  const totalBatchPages = Math.ceil(sortedBatchFlowers.length / pageSize) || 1;
  const paginatedBatchFlowers = sortedBatchFlowers.slice((batchPage - 1) * pageSize, batchPage * pageSize);

  const isAllCurrentPageChecked = paginatedBatchFlowers.length > 0 && paginatedBatchFlowers.every(flower => 
    memberFlowers.some(mf => mf.flower_id === flower.id)
  );

  const handleToggleAllCurrentPage = async (checked: boolean) => {
    if (!selectedMemberForFlowers) return;
    if (checked) {
      for (const flower of paginatedBatchFlowers) {
        await supabase.from('user_flowers').upsert({
          user_id: selectedMemberForFlowers.id,
          flower_id: flower.id,
          is_owned: 'Y',
          extra_score: 0
        }, { onConflict: 'user_id,flower_id' });
      }
    } else {
      for (const flower of paginatedBatchFlowers) {
        const targetRecord = memberFlowers.find(mf => mf.flower_id === flower.id);
        if (targetRecord) {
          await supabase.from('user_flowers').delete().eq('id', targetRecord.id);
        }
      }
    }
    fetchMemberFlowers(selectedMemberForFlowers.id);
    fetchAllMemberFlowerCounts(members);
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
      <div className="flex flex-col min-h-screen px-4 pb-28 space-y-4 animate-in fade-in duration-200">
        
        {/* 상단 고정 영역: 타이틀 제거 및 등록버튼/인원수/필터칩/검색창 통합 배치 */}
        <div className={`sticky z-20 pt-4 pb-2 space-y-3.5 bg-stone-50/90 backdrop-blur-md transition-all duration-200 ${
          isAppbarVisible ? 'top-16' : 'top-0'
        }`}>
          {/* 첫 번째 줄: 총 길드원 수 & 길드원 등록 버튼 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center shrink-0">
                <FaUsers className="text-sm" />
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-500">총 길드원</span>
                <span className="text-xs sm:text-sm font-extrabold text-stone-900 tracking-tight">{members.length}명</span>
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

          <div className="space-y-3">
            {/* 두 번째 줄: 전체 보기, 임무 진행, 임무 중단, 임무 완료 필터 칩들 나란히 배치 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {[
                { id: 'ALL', label: '전체 보기', icon: <FaListUl className="text-[10px]" /> },
                { id: '진행', label: '임무 진행', icon: <FaCheckCircle className="text-[10px]" /> },
                { id: '중단', label: '임무 중단', icon: <FaTimesCircle className="text-[10px]" /> },
                { id: '완료', label: '임무 완료', icon: <FaCheckCircle className="text-[10px]" /> }
              ].map(tab => {
                const isSelected = statusFilter === tab.id;
                let statusChipStyle = '';
                if (isSelected) {
                  if (tab.id === 'ALL') statusChipStyle = 'bg-[#C2621C] text-white shadow-xs';
                  else if (tab.id === '진행') statusChipStyle = 'bg-blue-600 text-white shadow-xs';
                  else if (tab.id === '중단') statusChipStyle = 'bg-rose-600 text-white shadow-xs';
                  else if (tab.id === '완료') statusChipStyle = 'bg-emerald-600 text-white shadow-xs';
                } else {
                  if (tab.id === 'ALL') statusChipStyle = 'text-stone-600 hover:bg-stone-100 bg-white border border-stone-200/60';
                  else if (tab.id === '진행') statusChipStyle = 'text-blue-700 hover:bg-blue-50 bg-white border border-stone-200/60';
                  else if (tab.id === '중단') statusChipStyle = 'text-rose-700 hover:bg-rose-50 bg-white border border-stone-200/60';
                  else if (tab.id === '완료') statusChipStyle = 'text-emerald-700 hover:bg-emerald-50 bg-white border border-stone-200/60';
                }
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${statusChipStyle}`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 세 번째 줄: 길드원 닉네임 검색 창 */}
            <div className="relative flex items-center">
              <FaSearch className="absolute left-3.5 text-stone-400 text-xs pointer-events-none" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="길드원 닉네임 검색"
                className="w-full pl-9 pr-10 py-2.5 bg-stone-100/80 rounded-xl outline-none text-xs font-medium border border-stone-200/60 focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-3 w-6 h-6 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200/65 flex items-center justify-center transition-all cursor-pointer text-[10px]"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 본문 리스트 영역 */}
        <div className="flex-1 space-y-2 relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-stone-500">길드원 데이터를 불러오는 중입니다...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-16 text-stone-400 text-xs font-medium">
              등록된 길드원이 없거나 검색 결과가 없습니다.
            </div>
          ) : (
            filteredMembers.map(member => {
              const currentStatus = member.mission_status || '진행';
              const roleName = member.role || '멤버';
              const flowerCount = memberFlowerCounts[member.id] || 0;

              return (
                <div key={member.id} className="py-3 px-2 border-b border-stone-100 flex items-center justify-between gap-3 hover:bg-stone-50/60 transition-all rounded-xl">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-extrabold text-stone-900 tracking-tight">{member.nickname}</span>
                      <span className={`text-xs ${getRoleStyle(roleName, false)}`}>
                        {roleName}
                      </span>
                      <button
                        onClick={() => handleUpdateStatus(member.id, currentStatus)}
                        className={`text-xs cursor-pointer transition-all hover:scale-105 active:scale-95 ${getStatusBadgeStyle(currentStatus)}`}
                      >
                        {currentStatus} ↻
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-stone-500 font-medium">
                      <span className="flex items-center gap-1 text-amber-700 font-bold">
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
                        setIsBatchOpen(false);
                        setBatchGrades([]);
                        setBatchPage(1);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
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
                    >
                      <FaEdit className="text-xs" />
                    </button>

                    <button
                      onClick={() => setDeletingMember({ id: member.id, name: member.nickname })}
                      className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-all cursor-pointer border border-rose-200 active:scale-95"
                    >
                      <FaTrashAlt className="text-xs" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 길드원 등록/수정 모달 */}
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
                      let modalChipStyle = '';
                      if (isSelected) {
                        if (s === '진행') modalChipStyle = 'bg-blue-600 text-white shadow-xs';
                        else if (s === '중단') modalChipStyle = 'bg-rose-600 text-white shadow-xs';
                        else if (s === '완료') modalChipStyle = 'bg-emerald-600 text-white shadow-xs';
                      } else {
                        if (s === '진행') modalChipStyle = 'text-blue-700 hover:bg-blue-50';
                        else if (s === '중단') modalChipStyle = 'text-rose-700 hover:bg-rose-50';
                        else if (s === '완료') modalChipStyle = 'text-emerald-700 hover:bg-emerald-50';
                      }

                      const icon = s === '진행' ? <FaCheckCircle className="text-[10px]" /> : s === '중단' ? <FaTimesCircle className="text-[10px]" /> : <FaCheckCircle className="text-[10px]" />;

                      return (
                        <button
                          type="button"
                          key={s}
                          onClick={() => setMissionStatusInput(s)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${modalChipStyle}`}
                        >
                          {icon}
                          <span>{s}</span>
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

        {/* 길드원 삭제 경고 모달 */}
        {deletingMember && (
          <div 
            onClick={() => setDeletingMember(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[28px] p-6 max-w-xs w-full shadow-2xl border border-stone-100 text-center space-y-4 relative"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto border border-rose-100 shadow-inner">
                <FaExclamationTriangle className="text-xl" />
              </div>

              <div>
                <h3 className="text-base font-extrabold text-stone-900">길드원 삭제</h3>
                <p className="text-xs text-stone-500 mt-1.5 font-medium leading-relaxed">
                  <span className="font-extrabold text-stone-800">'{deletingMember.name}'</span> 님을 정말 삭제하시겠습니까?
                  <br />
                  <span className="text-rose-500 text-[11px]">삭제된 길드원 정보는 복구할 수 없습니다.</span>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setDeletingMember(null)}
                  className="flex-1 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={confirmDeleteMember}
                  className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 보유 꽃 관리 모달 */}
        {selectedMemberForFlowers && (
          <div 
            onClick={() => setSelectedMemberForFlowers(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-hidden animate-in fade-in duration-200"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FFFDF9] rounded-[28px] p-5 w-full max-w-sm h-[54vh] flex flex-col shadow-2xl border border-amber-100 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-stone-200/60 pb-3.5 shrink-0">
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900">{selectedMemberForFlowers.nickname}님의 보유 꽃 관리</h3>
                  <p className="text-xs text-amber-800/80 font-medium mt-0.5">보유 목록 추가 및 절품 점수를 관리하세요.</p>
                </div>
                <button onClick={() => setSelectedMemberForFlowers(null)} className="w-8 h-8 rounded-full bg-amber-100/60 flex items-center justify-center text-stone-600 hover:bg-amber-200 transition-all cursor-pointer">
                  <FaTimes className="text-xs" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 relative" style={{ scrollbarWidth: 'none' }}>
                {isModalLoading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex flex-col items-center justify-center z-20 space-y-2.5 rounded-2xl">
                    <div className="w-7 h-7 border-3 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                    <p className="text-[11px] font-bold text-amber-800">꽃 목록을 불러오는 중...</p>
                  </div>
                )}

                <div>
                  <button
                    onClick={() => setIsBatchOpen(!isBatchOpen)}
                    className="w-full flex items-center justify-between py-2 text-xs font-bold text-amber-900 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <FaSeedling className="text-amber-500 text-xs" />
                      <span className="text-xs font-bold text-amber-900">꽃 일괄 등록하기</span>
                    </div>
                    {isBatchOpen ? <FaChevronUp className="text-xs text-amber-700" /> : <FaChevronDown className="text-xs text-amber-700" />}
                  </button>

                  {isBatchOpen && (
                    <div className="pt-2 space-y-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-stone-400">등급 필터:</span>
                          {batchGrades.length > 0 && (
                            <button 
                              onClick={() => { setBatchGrades([]); setBatchPage(1); }}
                              className="text-[11px] text-pink-600 font-bold hover:underline cursor-pointer px-1 py-0.5"
                            >
                              초기화
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {FLOWER_GRADES.map(fg => {
                            const isSelected = batchGrades.includes(fg);
                            return (
                              <button
                                type="button"
                                key={fg}
                                onClick={() => toggleBatchGradeFilter(fg)}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${getFlowerGradeChipStyle(fg, isSelected)}`}
                              >
                                {fg}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {paginatedBatchFlowers.length > 0 && (
                        <div className="flex items-center justify-between px-1 py-1">
                          <span className="text-[11px] font-bold text-amber-900">현재 페이지 전체 선택</span>
                          <label className="relative flex items-center cursor-pointer select-none">
                            <input 
                              type="checkbox"
                              checked={isAllCurrentPageChecked}
                              onChange={(e) => handleToggleAllCurrentPage(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-5 h-5 bg-white border-2 border-stone-300 rounded-md peer-checked:bg-pink-500 peer-checked:border-pink-500 transition-all flex items-center justify-center shadow-2xs">
                              <FaCheck className={`w-3 h-3 text-white transition-opacity ${isAllCurrentPageChecked ? 'opacity-100' : 'opacity-0'}`} />
                            </div>
                          </label>
                        </div>
                      )}

                      <div className="space-y-1">
                        {paginatedBatchFlowers.length === 0 ? (
                          <div className="text-center py-6 text-stone-400 text-xs font-medium">
                            조건에 해당하는 꽃이 없습니다.
                          </div>
                        ) : (
                          paginatedBatchFlowers.map(flower => {
                            const isOwned = memberFlowers.some(mf => mf.flower_id === flower.id);

                            return (
                              <div key={flower.id} className="py-2 px-1 border-b border-stone-100 flex items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className="w-7 h-7 rounded-lg bg-stone-100 overflow-hidden flex items-center justify-center shrink-0">
                                    {flower.image_url ? <img src={flower.image_url} alt="" className="w-full h-full object-cover" /> : <FaSeedling className="text-amber-300 text-xs" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                                      <span className={`text-[10px] shrink-0 ${getGradeBadgeColor(flower.grade)}`}>{flower.grade}</span>
                                      <span className="text-xs font-bold text-stone-900 truncate">{flower.name}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] text-stone-500 font-medium">기본: {flower.score || 0}점</span>
                                  <label className="relative flex items-center cursor-pointer select-none">
                                    <input 
                                      type="checkbox"
                                      checked={isOwned}
                                      onChange={async (e) => {
                                        const checked = e.target.checked;
                                        if (checked) {
                                          await supabase.from('user_flowers').upsert({
                                            user_id: selectedMemberForFlowers.id,
                                            flower_id: flower.id,
                                            is_owned: 'Y',
                                            extra_score: 0
                                          }, { onConflict: 'user_id,flower_id' });
                                        } else {
                                          const targetRecord = memberFlowers.find(mf => mf.flower_id === flower.id);
                                          if (targetRecord) {
                                            await supabase.from('user_flowers').delete().eq('id', targetRecord.id);
                                          }
                                        }
                                        fetchMemberFlowers(selectedMemberForFlowers.id);
                                        fetchAllMemberFlowerCounts(members);
                                      }}
                                      className="sr-only peer"
                                    />
                                    <div className="w-5 h-5 bg-white border-2 border-stone-300 rounded-md peer-checked:bg-pink-500 peer-checked:border-pink-500 transition-all flex items-center justify-center shadow-2xs">
                                      <FaCheck className={`w-3 h-3 text-white transition-opacity ${isOwned ? 'opacity-100' : 'opacity-0'}`} />
                                    </div>
                                  </label>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {totalBatchPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-1 text-xs">
                          <button
                            type="button"
                            disabled={batchPage === 1}
                            onClick={() => setBatchPage(prev => Math.max(prev - 1, 1))}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 font-bold disabled:opacity-40 cursor-pointer"
                          >
                            이전
                          </button>
                          <span className="font-bold text-stone-700">
                            {batchPage} / {totalBatchPages}
                          </span>
                          <button
                            type="button"
                            disabled={batchPage === totalBatchPages}
                            onClick={() => setBatchPage(prev => Math.min(prev + 1, totalBatchPages))}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 font-bold disabled:opacity-40 cursor-pointer"
                          >
                            다음
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative space-y-2 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <FaSearch className="text-amber-500 text-[11px]" />
                    <span>보유 꽃 추가 검색</span>
                  </div>
                  
                  <input
                    type="text"
                    value={flowerSearchQuery}
                    onChange={(e) => setFlowerSearchQuery(e.target.value)}
                    placeholder="추가할 꽃 이름을 입력하세요"
                    className="w-full px-3.5 py-2.5 bg-stone-100/80 rounded-xl outline-none text-xs border border-stone-200/60 focus:bg-white focus:ring-2 focus:ring-amber-200 transition-all"
                  />

                  {flowerSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-stone-200 z-40 overflow-hidden max-h-56 overflow-y-auto">
                      {flowerSuggestions.map((f: any) => (
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
                            <span className={`text-[10px] ${getGradeBadgeColor(f.grade)}`}>{f.grade}</span>
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
                  </div>

                  <div className="flex flex-col gap-1.5 py-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-400">등급 필터:</span>
                      {selectedOwnedFlowerGrades.length > 0 && (
                        <button 
                          onClick={() => setSelectedOwnedFlowerGrades([])}
                          className="text-[11px] text-pink-600 font-bold hover:underline cursor-pointer px-1 py-0.5"
                        >
                          초기화
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {FLOWER_GRADES.map(fg => {
                        const isSelected = selectedOwnedFlowerGrades.includes(fg);
                        return (
                          <button
                            type="button"
                            key={fg}
                            onClick={() => toggleOwnedFlowerGradeFilter(fg)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${getFlowerGradeChipStyle(fg, isSelected)}`}
                          >
                            {fg}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {filteredMemberFlowers.length === 0 ? (
                    <div className="text-center py-10 text-stone-400 text-xs font-medium">
                      {memberFlowers.length === 0 ? '등록된 보유 꽃이 없습니다.' : '선택한 등급에 해당하는 보유 꽃이 없습니다.'}
                    </div>
                  ) : (
                    filteredMemberFlowers.map(item => {
                      const flower = item.flowers || {};
                      const baseScore = flower.score || 0;
                      const extraScore = item.extra_score || 0;
                      const totalScore = baseScore + extraScore;

                      return (
                        <div key={item.id} className="py-2 px-1 border-b border-stone-100 flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-stone-100 overflow-hidden flex items-center justify-center shrink-0">
                              {flower.image_url ? <img src={flower.image_url} alt="" className="w-full h-full object-cover" /> : <FaSeedling className="text-amber-300 text-xs" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                                <span className={`text-[10px] shrink-0 ${getGradeBadgeColor(flower.grade)}`}>{flower.grade}</span>
                                <span className="text-xs font-bold text-stone-900 truncate">{flower.name}</span>
                              </div>
                              <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">
                                합산: <span className="font-extrabold text-amber-900">{totalScore}점</span> 
                                <span className="text-stone-400 text-[11px] ml-1 font-normal">기본: {baseScore}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-extrabold text-[#C2621C] tracking-tight">
                              절품+
                            </span>
                            
                            <div className="flex items-center bg-stone-50 border border-stone-200 rounded-lg overflow-hidden">
                              <input
                                type="number"
                                min="0"
                                value={extraScore}
                                onChange={(e) => handleUpdateExtraScore(item.id, parseInt(e.target.value) || 0)}
                                className="w-8 py-1 text-center text-xs font-bold text-stone-900 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <div className="flex flex-col border-l border-stone-200 bg-stone-100">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateExtraScore(item.id, extraScore + 1)}
                                  className="w-4 h-3.5 flex items-center justify-center text-[8px] text-stone-600 hover:bg-stone-200 transition cursor-pointer border-b border-stone-200"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateExtraScore(item.id, extraScore - 1)}
                                  className="w-4 h-3.5 flex items-center justify-center text-[8px] text-stone-600 hover:bg-stone-200 transition cursor-pointer"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteUserFlower(item.id)}
                              className="w-7 h-7 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-600 flex items-center justify-center transition cursor-pointer"
                            >
                              <FaTrashAlt className="text-[10px]" />
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
    </NavigationLayout>
  );
}