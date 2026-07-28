'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function MemberManagePage() {
  const router = useRouter();
  const [searchWord, setSearchWord] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  
  // 실시간 닉네임 검색 힌트 리스트 상태 및 팝업 제어 플래그
  const [suggestedMembers, setSuggestedMembers] = useState<any[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  
  // 현재 길드의 ID를 담을 상태
  const [guildId, setGuildId] = useState<string | null>(null);

  // 경쟁전 모드 토글 상태 ('normal' | 'pvp') - 초기값은 기본('normal')으로 설정 후 시간 조건에 따라 변경
  const [mode, setMode] = useState<'normal' | 'pvp'>('normal');

  // 경쟁전 모드 '임무 횟수' 전용 정렬 상태 ('desc': 내림차순, 'asc': 오름차순)
  const [completedSortOrder, setCompletedSortOrder] = useState<'desc' | 'asc'>('desc');

  // 경쟁전 모드 '임무 점수' 전용 정렬 상태 ('desc': 내림차순, 'asc': 오름차순)
  const [scoreSortOrder, setScoreSortOrder] = useState<'desc' | 'asc'>('desc');

  // 어떤 정렬 버튼을 가장 최근에 눌렀는지 추적하여 독립적으로 정렬하기 위한 상태 ('completed' | 'score')
  const [activeSortKey, setActiveSortKey] = useState<'completed' | 'score'>('completed');

  const [localData, setLocalData] = useState<Record<string, { role: string; nickname: string; basic: string; vip: string; completed: number; totalScore: number }>>({});
  
  const limit = 10;

  // 대한민국 서울 시간 기준( 화요일 오전 9시 ~ 월요일 오전 1시 ) 체크 함수
  const checkIsPvpPeriod = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const kstDiff = 9 * 60 * 60 * 1000;
    const kstDate = new Date(utc + kstDiff);

    const day = kstDate.getDay(); // 0: 일요일, 1: 월요일, 2: 화요일, ..., 6: 토요일
    const hour = kstDate.getHours();

    // 월요일 오전 1시 이전 (00:00 ~ 00:59)
    if (day === 1 && hour < 1) {
      return true;
    }
    // 화요일 오전 9시 이후부터 토요일, 일요일 전체
    if (day > 2 || (day === 2 && hour >= 9)) {
      return true;
    }

    return false;
  };

  useEffect(() => {
    const session = sessionStorage.getItem('guild_user');
    if (!session) {
      router.push('/');
      return;
    }
    const curUser = JSON.parse(session);
    if (curUser.role !== '길드장' && curUser.role !== '부길드장') {
      alert('운영진 전용 관리 영역입니다.');
      router.push('/list');
      return;
    }

    if (!curUser.guild_id) {
      alert('길드 정보가 유효하지 않습니다. 다시 로그인해주세요.');
      router.push('/');
      return;
    }

    // 대한민국 서울 시간 기준 조건에 따라 첫 화면 모드 설정 (화요일 09:00 ~ 월요일 01:00)
    if (checkIsPvpPeriod()) {
      setMode('pvp');
    }

    setGuildId(curUser.guild_id);
    fetchMembers(curUser.guild_id);
  }, []);

  // 실시간 닉네임 자동완성/추천 검색어 조회
  useEffect(() => {
    if (isSelecting || !guildId) {
      setSuggestedMembers([]);
      return;
    }

    const fetchMemberHints = async () => {
      if (!searchWord.trim()) {
        setSuggestedMembers([]);
        return;
      }

      const cleanKeyword = searchWord.trim().replace(/\s+/g, '');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('guild_id', guildId);

      if (!error && data) {
        const filtered = data.filter((m: any) => 
          m.nickname.replace(/\s+/g, '').includes(cleanKeyword)
        );
        setSuggestedMembers(filtered);
      }
    };

    const timer = setTimeout(() => {
      fetchMemberHints();
    }, 200);

    return () => clearTimeout(timer);
  }, [searchWord, isSelecting, guildId]);

  const rolePriority: Record<string, number> = {
    '길드장': 1,
    '부길드장': 2,
    '임원': 3,
    '정예': 4,
    '멤버': 5
  };

  // 독립적인 정렬 로직: 선택된 activeSortKey에 따라 해당 기준만 단독으로 정렬 수행
  const sortMemberList = (dataList: any[], currentMode: 'normal' | 'pvp', currentCompletedSort: 'desc' | 'asc', currentScoreSort: 'desc' | 'asc', sortKey: 'completed' | 'score') => {
    return [...dataList].sort((a, b) => {
      if (currentMode === 'pvp') {
        if (sortKey === 'completed') {
          const completedA = localData[a.id]?.completed ?? a.completed_missions ?? 0;
          const completedB = localData[b.id]?.completed ?? b.completed_missions ?? 0;

          if (completedA !== completedB) {
            return currentCompletedSort === 'desc' ? completedB - completedA : completedA - completedB;
          }
          return a.nickname.localeCompare(b.nickname, 'ko');
        } else {
          const scoreA = localData[a.id]?.totalScore ?? a.total_mission_score ?? 0;
          const scoreB = localData[b.id]?.totalScore ?? b.total_mission_score ?? 0;

          if (scoreA !== scoreB) {
            return currentScoreSort === 'desc' ? scoreB - scoreA : scoreA - scoreB;
          }
          return a.nickname.localeCompare(b.nickname, 'ko');
        }
      } else {
        const priorityA = rolePriority[a.role] || 99;
        const priorityB = rolePriority[b.role] || 99;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.nickname.localeCompare(b.nickname, 'ko');
      }
    });
  };

  const fetchMembers = async (targetGuildId?: string) => {
    setIsSelecting(true);
    setSuggestedMembers([]);

    const currentGuildId = targetGuildId || guildId;
    if (!currentGuildId) return;

    let query = supabase.from('profiles').select('*').eq('guild_id', currentGuildId);
    
    if (searchWord.trim()) {
      query = query.ilike('nickname', `%${searchWord.trim()}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('길드원 목록 조회 실패:', error);
      return;
    }

    if (data) {
      const buffer: any = {};
      data.forEach((m) => {
        buffer[m.id] = {
          role: m.role,
          nickname: m.nickname,
          basic: m.is_basic_only,
          vip: m.is_vip,
          completed: m.completed_missions,
          totalScore: m.total_mission_score ?? 0,
        };
      });
      setLocalData(buffer);

      const sortedMembers = sortMemberList(data, mode, completedSortOrder, scoreSortOrder, activeSortKey);
      setMembers(sortedMembers);
    }
  };

  // 모드 변경 시에만 리스트 재정렬
  useEffect(() => {
    if (members.length > 0) {
      const sorted = sortMemberList(members, mode, completedSortOrder, scoreSortOrder, activeSortKey);
      setMembers(sorted);
    }
  }, [mode]);

  // 검색창 데이터 초기화 함수
  const handleResetSearch = () => {
    setSearchWord('');
    setSuggestedMembers([]);
    setIsSelecting(false);
    setPage(1);
    fetchMembers();
  };

  // 임무 횟수 및 점수 일괄 초기화 함수 (현재 길드원 대상 0회 및 0점)
  const handleResetMissions = async () => {
    if (!guildId) return;
    if (!confirm('정말로 우리 길드원들의 임무 완료 횟수와 점수를 모두 0으로 초기화하시겠습니까?')) {
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
        completed_missions: 0,
        total_mission_score: 0 
      })
      .eq('guild_id', guildId);

    if (error) {
      alert('임무 초기화 중 오류가 발생했습니다.');
      return;
    }

    alert('우리 길드원들의 임무 횟수와 점수가 모두 초기화되었습니다. ✨');
    fetchMembers();
  };

  const handleUpdate = async () => {
    const activeIds = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (activeIds.length === 0) {
      alert('선택된 데이터가 없습니다');
      return;
    }

    for (const id of activeIds) {
      const original = members.find((m) => m.id === id);
      const edited = localData[id];

      if (!edited.nickname.trim()) {
        alert('공백 닉네임으로는 수정할 수 없습니다.');
        return;
      }

      if (
        original.nickname === edited.nickname &&
        original.role === edited.role &&
        original.is_basic_only === edited.basic &&
        original.is_vip === edited.vip
      ) {
        alert(`[${original.nickname}] 변경된 데이터 내역이 동일하여 변경할 필요가 없습니다.`);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          role: edited.role,
          nickname: edited.nickname.trim(),
          is_basic_only: edited.basic,
          is_vip: edited.vip,
        })
        .eq('id', id)
        .eq('guild_id', guildId);

      if (error) {
        alert('닉네임 중복 오류 등으로 데이터 업데이트에 실패했습니다.');
        return;
      }
    }

    alert('수정되었습니다.');
    setSelectedIds({});
    fetchMembers();
  };

  const handleDelete = async () => {
    const activeIds = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (activeIds.length === 0) {
      alert('선택된 데이터가 없습니다');
      return;
    }

    const list = members.filter((m) => selectedIds[m.id]);
    const listString = list.map((m) => m.nickname).join(', ');

    if (confirm(`'${listString}' 정말 길드에서 삭제 하시겠습니까?`)) {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', activeIds)
        .eq('guild_id', guildId);

      if (!error) {
        alert('성공적으로 삭제되었습니다.');
        setSelectedIds({});
        setPage(1);
        fetchMembers();
      } else {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 경쟁전 모드에서 임무 횟수(-/+) 버튼 클릭 시 값 변경 함수 (행 위치는 점수 수정/새로고침 전까지 유지)
  const handleDirectMissionUpdate = async (id: string, newCompleted: number) => {
    const targetVal = Math.max(0, newCompleted);

    setLocalData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        completed: targetVal,
      },
    }));

    const { error } = await supabase
      .from('profiles')
      .update({ completed_missions: targetVal })
      .eq('id', id)
      .eq('guild_id', guildId);

    if (error) {
      console.error('임무 횟수 수정 실패:', error);
    } else {
      setMembers((prevMembers) => 
        prevMembers.map((m) => (m.id === id ? { ...m, completed_missions: targetVal } : m))
      );
    }
  };

  // 경쟁전 모드에서 임무 점수(input 직접 입력) 값 변경 함수 (행 위치는 점수 수정/새로고침 전까지 유지)
  const handleDirectScoreUpdate = async (id: string, rawVal: string) => {
    const numericVal = rawVal === '' ? 0 : parseInt(rawVal, 10);
    const targetVal = isNaN(numericVal) ? 0 : Math.max(0, numericVal);

    setLocalData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        totalScore: targetVal,
      },
    }));

    const { error } = await supabase
      .from('profiles')
      .update({ total_mission_score: targetVal })
      .eq('id', id)
      .eq('guild_id', guildId);

    if (error) {
      console.error('임무 점수 수정 실패:', error);
    } else {
      setMembers((prevMembers) => 
        prevMembers.map((m) => (m.id === id ? { ...m, total_mission_score: targetVal } : m))
      );
    }
  };

  // 경쟁전 모드에서 '기본 임무만 진행' 값 변경 시 반영 함수
  const handleDirectBasicOnlyUpdate = async (id: string, newVal: string) => {
    setLocalData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        basic: newVal,
      },
    }));

    const { error } = await supabase
      .from('profiles')
      .update({ is_basic_only: newVal })
      .eq('id', id)
      .eq('guild_id', guildId);

    if (error) {
      console.error('기본 임무만 진행 상태 수정 실패:', error);
    } else {
      setMembers((prevMembers) => 
        prevMembers.map((m) => (m.id === id ? { ...m, is_basic_only: newVal } : m))
      );
    }
  };

  const totalPages = Math.ceil(members.length / limit) || 1;
  const pagedMembers = members.slice((page - 1) * limit, page * limit);

  const isAllPageChecked = pagedMembers.length > 0 && pagedMembers.every((m) => selectedIds[m.id]);

  const handleToggleAll = (checked: boolean) => {
    const newSelectedIds = { ...selectedIds };
    pagedMembers.forEach((m) => {
      newSelectedIds[m.id] = checked;
    });
    setSelectedIds(newSelectedIds);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12 overflow-x-hidden box-border">
      <Header />

      <div className="px-4 flex-1 space-y-4 w-full box-border pt-2">
        {/* 상단 설명 문구 카드 */}
        <div className="bg-amber-50 border-2 border-amber-200 p-3.5 rounded-2xl shadow-sm text-center">
          <p className="text-xs font-bold text-amber-900 leading-relaxed">
            🛡️ 길드원들의 정보와 임무 횟수를 관리할 수 있는 화면 입니다.<br />
          </p>
        </div>

        {/* 상단 뉴비 등록 안내 카드 & 일괄 초기화 버튼 */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-amber-100 shadow-sm space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => router.push('/guild/members/create')} 
              className="w-full py-3 bg-sky-500 text-white font-black text-sm rounded-xl hover:bg-sky-600 transition-colors shadow-sm cursor-pointer"
            >
              👥 뉴비 등록하기
            </button>
            <button 
              onClick={handleResetMissions} 
              className="w-full py-3 bg-amber-600 text-white font-black text-sm rounded-xl hover:bg-amber-700 transition-colors shadow-sm cursor-pointer"
            >
              🔄 임무횟수/점수 초기화
            </button>
          </div>
        </div>

        {/* 모드 토글 스위치 & 검색 영역 */}
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm space-y-3">
          {/* 토글 버튼 */}
          <div className="flex bg-amber-50 p-1 rounded-xl border border-amber-200">
            <button
              onClick={() => {
                setMode('normal');
                setSelectedIds({});
              }}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-colors cursor-pointer ${
                mode === 'normal' ? 'bg-[#556B2F] text-white shadow-sm' : 'text-amber-900 hover:bg-amber-100'
              }`}
            >
              📋 기본 관리 모드
            </button>
            <button
              onClick={() => {
                setMode('pvp');
                setSelectedIds({});
              }}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-colors cursor-pointer ${
                mode === 'pvp' ? 'bg-orange-600 text-white shadow-sm' : 'text-amber-900 hover:bg-amber-100'
              }`}
            >
              ⚔️ 경쟁전 모드
            </button>
          </div>

          <div className="relative">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="길드원 닉네임 검색" 
                value={searchWord}
                onChange={(e) => {
                  setIsSelecting(false);
                  setSearchWord(e.target.value);
                }}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter') { 
                    setPage(1); 
                    fetchMembers(); 
                  } 
                }}
                className="flex-1 p-3.5 border-2 border-amber-200 rounded-2xl font-bold bg-white text-sm focus:outline-none focus:border-[#556B2F]"
                autoComplete="off"
              />
              <button 
                onClick={handleResetSearch} 
                className="w-14 h-14 bg-gray-200 text-gray-700 rounded-2xl flex items-center justify-center hover:bg-gray-300 transition-colors shadow-sm shrink-0 cursor-pointer"
                title="초기화"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 실시간 닉네임 추천(자동완성) 리스트 팝업 */}
            {suggestedMembers.length > 0 && !isSelecting && (
              <div className="absolute left-0 right-28 top-full mt-1 bg-white border-2 border-amber-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                <p className="px-3 py-1.5 text-[10px] font-black text-amber-700 bg-amber-50 border-b border-amber-100">
                  👥 검색된 길드원 목록 (클릭 시 바로 조회)
                </p>
                {suggestedMembers.map((member, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsSelecting(true);
                      setSearchWord(member.nickname);
                      
                      supabase
                        .from('profiles')
                        .select('*')
                        .eq('guild_id', guildId)
                        .ilike('nickname', `%${member.nickname}%`)
                        .then(({ data }) => {
                          if (data) {
                            const sortedMembers = sortMemberList(data, mode, completedSortOrder, scoreSortOrder, activeSortKey);
                            setMembers(sortedMembers);
                            setPage(1);

                            const buffer: any = {};
                            sortedMembers.forEach((m) => {
                              buffer[m.id] = {
                                role: m.role,
                                nickname: m.nickname,
                                basic: m.is_basic_only,
                                vip: m.is_vip,
                                completed: m.completed_missions,
                                totalScore: m.total_mission_score ?? 0,
                              };
                            });
                            setLocalData(buffer);
                          }
                        });
                      setSuggestedMembers([]);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-lime-50 transition-colors border-b border-amber-50 last:border-b-0 flex items-center justify-between"
                  >
                    <span>{member.nickname}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      {member.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 멤버 테이블 영역 */}
        <div className="space-y-1.5">
          {mode === 'normal' && (
            <div className="flex justify-between items-center px-1">
              <p className="text-xs font-bold text-red-500">
                ❤️ 체크박스 선택 후에 수정/삭제 버튼을 눌러야 정보가 저장됩니다.
              </p>
            </div>
          )}
          
          <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm overflow-hidden font-bold w-full">
            <div className="overflow-x-auto w-full">
              {mode === 'normal' ? (
                /* ---------------- [기본 관리 모드 테이블] ---------------- */
                <table className="w-full text-center table-fixed text-xs">
                  <thead>
                    <tr className="bg-amber-50 text-amber-900 border-b border-amber-100 font-extrabold h-9">
                      <th className="w-[12%] px-0.5">
                        <input 
                          type="checkbox" 
                          checked={isAllPageChecked}
                          onChange={(e) => handleToggleAll(e.target.checked)}
                          className="w-4 h-4 accent-[#556B2F] cursor-pointer"
                        />
                      </th>
                      <th className="w-[28%] px-0.5">직급</th>
                      <th className="w-[36%] px-0.5">닉네임</th>
                      <th className="w-[24%] px-0.5">VIP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedMembers.map((m) => (
                      <tr key={m.id} className="border-b border-amber-50 h-12 hover:bg-lime-50/20">
                        <td className="px-0.5">
                          <input 
                            type="checkbox" 
                            checked={!!selectedIds[m.id]} 
                            onChange={() => setSelectedIds({ ...selectedIds, [m.id]: !selectedIds[m.id] })}
                            className="w-4 h-4 accent-[#556B2F] cursor-pointer"
                          />
                        </td>
                        <td className="px-0.5">
                          <select 
                            value={localData[m.id]?.role || m.role} 
                            onChange={(e) => setLocalData({ ...localData, [m.id]: { ...localData[m.id], role: e.target.value } })}
                            className="w-full border border-amber-200 p-1 text-xs rounded-lg bg-white focus:outline-none focus:border-[#556B2F] cursor-pointer"
                          >
                            {['길드장', '부길드장', '임원', '정예', '멤버'].map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-0.5">
                          <input 
                            type="text" 
                            value={localData[m.id]?.nickname || ''} 
                            onChange={(e) => setLocalData({ ...localData, [m.id]: { ...localData[m.id], nickname: e.target.value } })}
                            className="w-full border-b border-dashed border-amber-300 px-0.5 text-center text-xs font-bold text-amber-900 bg-transparent focus:outline-none focus:border-[#556B2F]"
                          />
                        </td>
                        <td className="px-0.5">
                          <select 
                            value={localData[m.id]?.vip || m.is_vip} 
                            onChange={(e) => setLocalData({ ...localData, [m.id]: { ...localData[m.id], vip: e.target.value } })}
                            className="w-full border border-amber-200 p-1 text-xs rounded-lg bg-white focus:outline-none focus:border-[#556B2F] cursor-pointer"
                          >
                            <option value="Y">Y</option>
                            <option value="N">N</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* ---------------- [경쟁전 모드 테이블] ---------------- */
                <table className="w-full text-center table-fixed text-xs">
                  <thead>
                    <tr className="bg-orange-50 text-orange-900 border-b border-orange-100 font-extrabold h-11">
                      <th className="w-[17%] px-0.5">직급</th>
                      <th className="w-[21%] px-0.5">닉네임</th>
                      <th className="w-[16%] px-0.5">
                        <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                          <span>임무</span>
                          <span>기본만</span>
                        </div>
                      </th>
                      <th className="w-[23%] px-0.5">
                        <div className="flex flex-col items-center justify-center gap-0.5 py-0.5">
                          <span className="text-[11px]">임무 횟수</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSortKey('completed');
                              const nextOrder = completedSortOrder === 'desc' ? 'asc' : 'desc';
                              setCompletedSortOrder(nextOrder);
                              // 버튼 클릭 시 수동으로 리스트 정렬 실행
                              const sorted = sortMemberList(members, mode, nextOrder, scoreSortOrder, 'completed');
                              setMembers(sorted);
                            }}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border transition-colors cursor-pointer shadow-xs ${
                              activeSortKey === 'completed' 
                                ? 'bg-orange-600 text-white border-orange-700' 
                                : 'bg-white text-orange-800 border-orange-300 hover:bg-orange-100'
                            }`}
                          >
                            {completedSortOrder === 'desc' ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUp className="w-2.5 h-2.5" />}
                            <span>{completedSortOrder === 'desc' ? '내림차순' : '오름차순'}</span>
                          </button>
                        </div>
                      </th>
                      <th className="w-[23%] px-0.5">
                        <div className="flex flex-col items-center justify-center gap-0.5 py-0.5">
                          <span className="text-[11px]">임무 점수</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSortKey('score');
                              const nextOrder = scoreSortOrder === 'desc' ? 'asc' : 'desc';
                              setScoreSortOrder(nextOrder);
                              // 버튼 클릭 시 수동으로 리스트 정렬 실행
                              const sorted = sortMemberList(members, mode, completedSortOrder, nextOrder, 'score');
                              setMembers(sorted);
                            }}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border transition-colors cursor-pointer shadow-xs ${
                              activeSortKey === 'score' 
                                ? 'bg-orange-600 text-white border-orange-700' 
                                : 'bg-white text-orange-800 border-orange-300 hover:bg-orange-100'
                            }`}
                          >
                            {scoreSortOrder === 'desc' ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUp className="w-2.5 h-2.5" />}
                            <span>{scoreSortOrder === 'desc' ? '내림차순' : '오름차순'}</span>
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedMembers.map((m) => {
                      const currentCompleted = localData[m.id]?.completed ?? m.completed_missions;
                      const currentBasic = localData[m.id]?.basic ?? m.is_basic_only;
                      const rawScore = localData[m.id]?.totalScore ?? m.total_mission_score ?? 0;
                      const currentScore = rawScore === 0 ? '' : rawScore;

                      return (
                        <tr key={m.id} className="border-b border-orange-50 h-12 hover:bg-orange-50/20">
                          <td className="px-0.5 text-amber-900 truncate text-[11px]">{m.role}</td>
                          <td className="px-0.5 text-amber-900 truncate font-bold text-[11px]">{m.nickname}</td>
                          <td className="px-0.5">
                            <select 
                              value={currentBasic} 
                              onChange={(e) => handleDirectBasicOnlyUpdate(m.id, e.target.value)}
                              className="w-full border border-orange-200 p-0.5 text-xs rounded-lg bg-white focus:outline-none focus:border-orange-500 cursor-pointer font-bold text-orange-900"
                            >
                              <option value="Y">Y</option>
                              <option value="N">N</option>
                            </select>
                          </td>
                          {/* 임무 횟수 컬럼 (-/+ 버튼 제어) */}
                          <td className="px-0.5">
                            <div className="flex items-center justify-center gap-0.5">
                              <button 
                                type="button"
                                onClick={() => handleDirectMissionUpdate(m.id, currentCompleted - 1)}
                                className="w-5 h-6 bg-orange-100 text-orange-800 rounded font-black hover:bg-orange-200 transition-colors flex items-center justify-center cursor-pointer text-[10px]"
                              >
                                -
                              </button>
                              <input 
                                type="text" 
                                disabled 
                                value={currentCompleted} 
                                className="w-6 border border-orange-200 p-0.5 text-[11px] rounded text-center bg-gray-100 text-gray-700 font-bold cursor-not-allowed"
                              />
                              <button 
                                type="button"
                                onClick={() => handleDirectMissionUpdate(m.id, currentCompleted + 1)}
                                className="w-5 h-6 bg-orange-500 text-white rounded font-black hover:bg-orange-600 transition-colors flex items-center justify-center cursor-pointer text-[10px] shadow-sm"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          {/* 임무 점수 컬럼 (숫자만 입력 가능한 input 필드, 0일 때 빈칸 처리) */}
                          <td className="px-0.5">
                            <input 
                              type="number"
                              min="0"
                              value={currentScore}
                              onChange={(e) => handleDirectScoreUpdate(m.id, e.target.value)}
                              className="w-full border border-orange-200 p-1 text-xs rounded-lg text-center bg-white text-orange-900 font-bold focus:outline-none focus:border-orange-500"
                              placeholder="점수"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* 페이징 */}
            <div className="flex justify-between items-center p-3 bg-amber-50">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)} 
                className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl disabled:opacity-50 text-xs font-black cursor-pointer shadow-sm"
              >
                이전
              </button>
              <span className="text-amber-950 font-bold text-xs">
                {page} / {totalPages} (총 {members.length}명)
              </span>
              <button 
                disabled={page >= totalPages} 
                onClick={() => setPage(page + 1)} 
                className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl disabled:opacity-50 text-xs font-black cursor-pointer shadow-sm"
              >
                다음
              </button>
            </div>
          </div>
        </div>

        {/* 액션 제어 버튼 (기본 관리 모드일 때만 노출) */}
        {mode === 'normal' && (
          <div className="grid grid-cols-2 gap-2 text-sm font-black pt-2">
            <button 
              onClick={handleDelete} 
              className="py-3.5 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
            >
              탈퇴/추방 삭제
            </button>
            <button 
              onClick={handleUpdate} 
              className="py-3.5 bg-[#556B2F] text-white rounded-2xl hover:bg-[#445823] transition-colors shadow-sm cursor-pointer"
            >
              정보 수정하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}