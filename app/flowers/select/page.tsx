'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import NavigationLayout from '@/components/NavigationLayout';
import { 
  FaSearch, FaHeart, FaRegHeart, FaSeedling, FaChevronRight, FaRegQuestionCircle,
  FaTimes, FaSlidersH, FaSortAmountDown, FaSortAmountUp, FaTrashAlt, FaChevronDown, FaExclamationCircle,
  FaListAlt, FaCheckCircle, FaTimesCircle, FaSpinner
} from 'react-icons/fa';

// ----------------------------------------------------------------------
// [등급 & 상태 스타일 정의]
// ----------------------------------------------------------------------
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

const GRADE_ORDER: { [key: string]: number } = {
  'UR+': 7, 'UR': 6, 'SSR': 5, 'SR+': 4, 'SR': 3, 'R': 2, 'N': 1
};

export default function FlowerSelectPage() {
  const [nickname, setNickname] = useState('');
  const [userId, setUserId] = useState('');
  const [guildId, setGuildId] = useState<number | null>(null);

  const [flowers, setFlowers] = useState<any[]>([]);
  const [flowerSearch, setFlowerSearch] = useState('');
  const [showNoResultNotice, setShowNoResultNotice] = useState(false);
  const [favoriteFlowerIds, setFavoriteFlowerIds] = useState<number[]>([]);
  
  const [mainFilter, setMainFilter] = useState<'all' | 'mine' | 'not_mine'>('all');
  const [subFilter, setSubFilter] = useState<'' | 'guild_mine' | 'guild_not_mine'>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  const [selectedFlower, setSelectedFlower] = useState<any | null>(null);
  const [flowerMembers, setFlowerMembers] = useState<any[]>([]);
  const [modalMemberSearch, setModalMemberSearch] = useState('');
  const [modalMemberSuggestions, setModalMemberSuggestions] = useState<any[]>([]);
  const [modalStatusFilter, setModalStatusFilter] = useState<string>('ALL');

  const [guildMembers, setGuildMembers] = useState<any[]>([]);

  // 페이지 및 모달 전용 로딩 상태 선언
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // 커스텀 삭제 확인 모달 상태 (대상 ID와 함께 닉네임 정보 저장)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; nickname: string } | null>(null);

  // 모달이 열려있을 때 배경 페이지 전체 스크롤 방지
  useEffect(() => {
    if (selectedFlower || deleteTarget !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedFlower, deleteTarget]);

  useEffect(() => {
    const sNick = localStorage.getItem('user_nickname') || '';
    const sId = localStorage.getItem('user_id') || '';
    const sGId = localStorage.getItem('guild_id');

    setNickname(sNick);
    setUserId(sId);
    if (sGId) setGuildId(Number(sGId));

    const savedFavs = JSON.parse(localStorage.getItem(`favorites_${sId}`) || '[]');
    setFavoriteFlowerIds(savedFavs);

    if (sGId && sNick) {
      fetchGuildMembers(Number(sGId));
    }
  }, []);

  useEffect(() => {
    if (nickname) {
      fetchFlowersByQuery();
    }
  }, [mainFilter, subFilter, nickname]);

  const toggleFavorite = (flowerId: number) => {
    const newFavs = favoriteFlowerIds.includes(flowerId)
      ? favoriteFlowerIds.filter(id => id !== flowerId)
      : [...favoriteFlowerIds, flowerId];
    setFavoriteFlowerIds(newFavs);
    localStorage.setItem(`favorites_${userId}`, JSON.stringify(newFavs));
  };

  const fetchGuildMembers = async (gId: number) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('guild_id', gId);
    if (!error && data) setGuildMembers(data);
  };

  const fetchFlowerMembers = async (flowerId: number) => {
    if (!guildId) return;

    try {
      setIsModalLoading(true); // 모달 데이터 로딩 시작
      const { data, error } = await supabase
        .from('user_flowers')
        .select('*, flowers (*), profiles!inner (*)')
        .eq('flower_id', flowerId)
        .eq('is_owned', 'Y')
        .eq('profiles.guild_id', guildId);

      if (!error && data) {
        const sorted = data.sort((a, b) => {
          const scoreA = (a.flowers?.score || 0) + (a.extra_score || 0);
          const scoreB = (b.flowers?.score || 0) + (b.extra_score || 0);
          return scoreB - scoreA;
        });
        setFlowerMembers(sorted);
      } else {
        setFlowerMembers([]);
      }
    } catch (err) {
      console.error('모달 길드원 조회 실패:', err);
      setFlowerMembers([]);
    } finally {
      setIsModalLoading(false); // 모달 데이터 로딩 종료
    }
  };

  const toggleGradeSelection = (grade: string) => {
    if (selectedGrades.includes(grade)) {
      setSelectedGrades(selectedGrades.filter(g => g !== grade));
    } else {
      setSelectedGrades([...selectedGrades, grade]);
    }
  };

  const handleMainFilterClick = (target: 'all' | 'mine' | 'not_mine') => {
    if (target === 'all') {
      setMainFilter('all');
      setSubFilter('');
    } else setMainFilter(target);
  };

  const handleSubFilterClick = (target: 'guild_mine' | 'guild_not_mine') => {
    if (subFilter === target) {
      setSubFilter('');
    } else {
      if (target === 'guild_mine' && mainFilter === 'all') setMainFilter('not_mine');
      else if (target === 'guild_not_mine' && mainFilter === 'all') setMainFilter('mine');
      setSubFilter(target);
    }
  };

  const fetchFlowersByQuery = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_filtered_flowers', {
        p_main_filter: mainFilter,
        p_sub_filter: subFilter,
        p_nickname: nickname
      });
      if (error) throw error;
      if (data) setFlowers(data);
    } catch (err) {
      console.error('꽃 조회 실패:', err);
      setFlowers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateExtraScore = async (recordId: number, newScore: number) => {
    const validatedScore = Math.max(0, newScore);
    setFlowerMembers(prev => prev.map(item => item.id === recordId ? { ...item, extra_score: validatedScore } : item));
    const { error } = await supabase.from('user_flowers').update({ extra_score: validatedScore }).eq('id', recordId);
    if (error && selectedFlower) fetchFlowerMembers(selectedFlower.id); 
  };

  // 커스텀 모달을 통한 삭제 실행 핸들러
  const executeDeleteUserFlower = async () => {
    if (deleteTarget === null) return;
    const { error } = await supabase.from('user_flowers').delete().eq('id', deleteTarget.id);
    if (!error) {
      setDeleteTarget(null);
      if (selectedFlower) fetchFlowerMembers(selectedFlower.id);
    } else {
      alert('삭제 중 오류가 발생했습니다.');
      setDeleteTarget(null);
    }
  };

  const displayedFlowersList = flowers
    .filter(f => {
      if (selectedGrades.length > 0 && !selectedGrades.includes(f.grade?.toUpperCase())) return false;
      if (flowerSearch.trim() !== '' && !f.name.toLowerCase().includes(flowerSearch.toLowerCase().trim())) return false;
      return true;
    })
    .sort((a, b) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      const gradeA = GRADE_ORDER[a.grade?.toUpperCase()] || 0;
      const gradeB = GRADE_ORDER[b.grade?.toUpperCase()] || 0;

      if (sortOrder === 'desc') {
        if (gradeA !== gradeB) return gradeB - gradeA;
        return scoreB - scoreA;
      } else {
        if (gradeA !== gradeB) return gradeA - gradeB;
        return scoreA - scoreB;
      }
    });

  useEffect(() => {
    if (!flowerSearch.trim()) {
      setShowNoResultNotice(false);
      return;
    }

    const timer = setTimeout(() => {
      const currentFiltered = flowers.filter(f => {
        if (selectedGrades.length > 0 && !selectedGrades.includes(f.grade?.toUpperCase())) return false;
        return f.name.toLowerCase().includes(flowerSearch.toLowerCase().trim());
      });

      if (currentFiltered.length === 0) {
        setShowNoResultNotice(true);
      } else {
        setShowNoResultNotice(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [flowerSearch, flowers, selectedGrades]);

  useEffect(() => {
    if (!modalMemberSearch.trim() || !guildId) {
      setModalMemberSuggestions([]);
      return;
    }
    const matched = guildMembers.filter(m => 
      m.nickname.toLowerCase().includes(modalMemberSearch.toLowerCase().trim()) &&
      !flowerMembers.some(fm => fm.user_id === m.id)
    );
    setModalMemberSuggestions(matched);
  }, [modalMemberSearch, guildMembers, flowerMembers, guildId]);

  const favoriteFlowersList = flowers.filter(f => favoriteFlowerIds.includes(f.id));

  const filteredFlowerMembers = flowerMembers.filter(m => {
    if (modalStatusFilter === 'ALL') return true;
    return m.profiles?.mission_status === modalStatusFilter;
  });

  return (
    <NavigationLayout>
      <div className="max-w-md mx-auto h-[calc(100vh-3.5rem)] flex flex-col bg-[#FAF9F6] overflow-hidden overscroll-none">
        
        {/* 상단 고정 영역 */}
        <div className="shrink-0 bg-[#FAF9F6] px-4 pt-3 pb-2 space-y-3 z-10 border-b border-stone-200/40">
          
          <div className="space-y-2">
            {showNoResultNotice && flowerSearch.trim() !== '' && (
              <div className="flex items-start gap-1.5 text-rose-500 text-xs bg-rose-50/90 backdrop-blur-xs p-3.5 rounded-2xl border border-rose-100 shadow-2xs">
                <FaExclamationCircle className="mt-0.5 shrink-0 text-sm" />
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  신규 꽃 추가의 경우 상단의 <FaRegQuestionCircle className="text-sm" />를 눌러 추가 요청 해주시길 바랍니다.
                </span>
              </div>
            )}

            <div className="relative flex items-center">
              <FaSearch className="absolute left-4 text-stone-300 text-sm" />
              <input
                type="text"
                value={flowerSearch}
                onChange={(e) => setFlowerSearch(e.target.value)}
                placeholder="꽃 이름으로 찾아보세요."
                className="w-full pl-11 pr-10 py-3 bg-white rounded-2xl shadow-2xs border border-stone-200/70 focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none text-sm transition"
              />
              {flowerSearch && (
                <button
                  type="button"
                  onClick={() => { setFlowerSearch(''); setShowNoResultNotice(false); }}
                  className="absolute right-3.5 w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 flex items-center justify-center transition cursor-pointer"
                  title="검색어 초기화"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>
          </div>

          {/* 필터 옵션 바 및 내부 서브 필터 칩스 영역 */}
          <div className="bg-white px-3.5 py-3 rounded-2xl border border-stone-200/70 shadow-xs space-y-3">
            
            <div className="flex justify-between items-center">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)} 
                className="flex items-center gap-2 text-xs font-bold text-stone-700 hover:text-pink-500 transition cursor-pointer select-none"
              >
                <span className="w-6 h-6 rounded-xl bg-pink-100 text-pink-500 flex items-center justify-center text-[11px]">
                  <FaSlidersH />
                </span>
                <span className="flex items-center gap-1.5">
                  {isFilterOpen ? '필터 및 정렬 옵션 숨기기' : '필터 및 정렬 옵션 펼치기'}
                  <span className={`text-stone-400 text-xs transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`}>
                    <FaChevronDown />
                  </span>
                </span>
              </button>

              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-50 border border-stone-200/80 text-stone-600 hover:bg-stone-100 transition text-[11px] font-semibold cursor-pointer shadow-2xs"
                title="정렬 기준 전환"
              >
                {sortOrder === 'desc' ? (
                  <>
                    <FaSortAmountDown className="text-amber-500 text-[10px]" />
                    <span>점수 내림차순</span>
                  </>
                ) : (
                  <>
                    <FaSortAmountUp className="text-amber-500 text-[10px]" />
                    <span>점수 오름차순</span>
                  </>
                )}
              </button>
            </div>
            
            {/* 필터 칩스 및 서브 탭 영역 */}
            {isFilterOpen && (
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]" style={{ scrollbarWidth: 'none' }}>
                  <button onClick={() => handleMainFilterClick('all')} className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${mainFilter === 'all' ? 'bg-stone-800 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>all</button>
                  <span className="text-stone-300 mx-0.5 font-light">|</span>
                  <button onClick={() => handleMainFilterClick('mine')} className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${mainFilter === 'mine' ? 'bg-pink-500 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>나의 보유</button>
                  <button onClick={() => handleMainFilterClick('not_mine')} className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${mainFilter === 'not_mine' ? 'bg-pink-500 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>나의 미보유</button>
                  <span className="text-stone-300 mx-0.5 font-light">|</span>
                  <button onClick={() => handleSubFilterClick('guild_mine')} className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${subFilter === 'guild_mine' ? 'bg-purple-500 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>길드원 보유</button>
                  <button onClick={() => handleSubFilterClick('guild_not_mine')} className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer shrink-0 ${subFilter === 'guild_not_mine' ? 'bg-purple-500 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>길드원 미보유</button>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {['UR+', 'UR', 'SSR', 'SR+', 'SR', 'R', 'N'].map((grade) => {
                    const isSelected = selectedGrades.includes(grade);
                    let chipColorStyle = 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100';
                    
                    if (isSelected) {
                      if (grade === 'UR+' || grade === 'UR') chipColorStyle = 'bg-pink-500 text-white border-pink-500 shadow-xs';
                      else if (grade === 'SSR') chipColorStyle = 'bg-amber-400 text-white border-amber-400 shadow-xs';
                      else if (grade === 'SR+' || grade === 'SR') chipColorStyle = 'bg-purple-500 text-white border-purple-500 shadow-xs';
                      else if (grade === 'R') chipColorStyle = 'bg-sky-500 text-white border-sky-500 shadow-xs';
                      else if (grade === 'N') chipColorStyle = 'bg-emerald-500 text-white border-emerald-500 shadow-xs';
                    } else {
                      if (grade === 'UR+' || grade === 'UR') chipColorStyle = 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100';
                      else if (grade === 'SSR') chipColorStyle = 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
                      else if (grade === 'SR+' || grade === 'SR') chipColorStyle = 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
                      else if (grade === 'R') chipColorStyle = 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100';
                      else if (grade === 'N') chipColorStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
                    }

                    return (
                      <button key={grade} onClick={() => toggleGradeSelection(grade)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${chipColorStyle}`}>
                        {grade} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* 즐겨찾는 꽃 및 검색 결과 카운트 영역 */}
          <div className="flex flex-col gap-1.5 pt-0.5">
            {favoriteFlowersList.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-pink-500 px-1">
                  <FaHeart className="text-[10px]" />
                  <span>즐겨찾는 꽃</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {favoriteFlowersList.map(fav => (
                    <div
                      key={fav.id}
                      onClick={() => { setSelectedFlower(fav); fetchFlowerMembers(fav.id); }}
                      className="shrink-0 flex items-center gap-2 bg-white pl-2.5 pr-3 py-1.5 rounded-2xl border border-pink-100 shadow-2xs cursor-pointer hover:border-pink-300 transition"
                    >
                      <div className="w-6 h-6 rounded-xl overflow-hidden bg-stone-100 flex items-center justify-center border border-stone-200/60 shrink-0">
                        {fav.image_url ? <img src={fav.image_url} alt="" className="w-full h-full object-cover" /> : <FaSeedling className="text-[9px] text-stone-300" />}
                      </div>
                      <div className="text-[11px] font-bold text-stone-800">{fav.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600">
                <FaListAlt className="text-pink-500 text-[11px]" />
                <span>검색 결과</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-100 text-xs font-bold text-pink-600 shadow-2xs">
                <span>꽃 수량:</span>
                <span className="text-pink-900">{displayedFlowersList.length}개</span>
              </div>
            </div>
          </div>

        </div>

        {/* 꽃 검색 결과 리스트 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 pb-24 overscroll-none [&::-webkit-scrollbar]:hidden"
             style={{ scrollbarWidth: 'none' }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
              <FaSpinner className="animate-spin text-3xl text-pink-500" />
              <span className="text-xs font-bold text-stone-500">꽃 데이터를 불러오는 중입니다...</span>
            </div>
          ) : displayedFlowersList.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs bg-white rounded-3xl border border-stone-200/50 shadow-2xs">
              조건에 일치하는 꽃이 없습니다.
            </div>
          ) : (
            displayedFlowersList.map((flower) => (
              <div key={flower.id} onClick={() => { setSelectedFlower(flower); fetchFlowerMembers(flower.id); setModalMemberSearch(''); setModalStatusFilter('ALL'); }} className="bg-white p-3.5 rounded-3xl shadow-2xs border border-stone-200/60 hover:border-pink-300 transition flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-stone-50 overflow-hidden flex items-center justify-center border border-stone-100 shrink-0">
                    {flower.image_url ? <img src={flower.image_url} alt={flower.name} className="w-full h-full object-cover" /> : <FaSeedling className="text-stone-300 text-lg" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-800 group-hover:text-pink-500 transition">{flower.name}</h3>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${getGradeBadgeColor(flower.grade)}`}>{flower.grade}</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">기본 임무점수: <span className="font-semibold text-stone-600">{flower.score || 0}점</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleFavorite(flower.id); }} className="p-2 text-pink-400 hover:bg-pink-50 rounded-2xl transition cursor-pointer">
                    {favoriteFlowerIds.includes(flower.id) ? <FaHeart className="text-sm" /> : <FaRegHeart className="text-stone-300 text-sm" />}
                  </button>
                  <FaChevronRight className="text-stone-300 text-xs mr-1 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* 꽃 상세정보 모달 */}
      {selectedFlower && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedFlower(null)}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-[#FFFDF9] rounded-[32px] p-4 sm:p-5 max-w-md w-full max-h-[88vh] overflow-y-auto shadow-2xl border border-amber-100/80 space-y-3 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200/60 pb-3 relative">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-white overflow-hidden flex items-center justify-center border border-amber-200/80 shadow-2xs shrink-0">
                  {selectedFlower.image_url ? <img src={selectedFlower.image_url} alt="" className="w-full h-full object-cover" /> : <FaSeedling className="text-amber-400 text-base" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${getGradeBadgeColor(selectedFlower.grade)}`}>
                      {selectedFlower.grade}등급
                    </span>
                  </div>
                  <h2 className="text-sm font-extrabold text-stone-900 tracking-tight">{selectedFlower.name}</h2>
                  <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">기본 길드전 점수: <span className="font-bold">{selectedFlower.score || 0}점</span></p>
                </div>
              </div>
              <button onClick={() => setSelectedFlower(null)} className="w-7 h-7 rounded-full bg-amber-100/60 hover:bg-amber-200 text-stone-600 flex items-center justify-center transition cursor-pointer">
                <FaTimes className="text-xs" />
              </button>
            </div>

            {/* 길드원 추가 실시간 검색 영역 */}
            <div className="bg-white p-2.5 rounded-2xl border border-amber-200/60 shadow-2xs space-y-1.5 relative">
              <div className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-amber-700">
                <FaSearch className="text-amber-500 text-[10px]" />
                <span>보유 길드원 추가</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={modalMemberSearch}
                  onChange={(e) => setModalMemberSearch(e.target.value)}
                  placeholder="길드원 이름 검색 후 추가"
                  className="w-full px-3 py-2 bg-stone-50/80 rounded-xl outline-none text-xs border border-stone-200/80 focus:bg-white focus:ring-2 focus:ring-amber-200 transition"
                />
                {modalMemberSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-stone-200/80 z-40 overflow-hidden">
                    {modalMemberSuggestions.map(m => (
                      <div
                        key={m.id}
                        onClick={async () => {
                          const { error } = await supabase.from('user_flowers').upsert({ user_id: m.id, flower_id: selectedFlower.id, is_owned: 'Y', extra_score: 0 }, { onConflict: 'user_id,flower_id' });
                          if (!error) { fetchFlowerMembers(selectedFlower.id); setModalMemberSearch(''); setModalMemberSuggestions([]); } else alert('길드원 추가 중 오류가 발생했습니다.');
                        }}
                        className="px-3 py-2 hover:bg-amber-50 cursor-pointer flex items-center justify-between text-xs transition border-b border-stone-100 last:border-none"
                      >
                        <span className="font-bold text-stone-800">{m.nickname}</span>
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">+ 추가하기</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 필터 칩스 크기 및 패딩 축소 적용 */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              {[
                { id: 'ALL', label: '전체 보기', icon: <FaListAlt /> },
                { id: '진행', label: '임무 진행', icon: <FaCheckCircle /> },
                { id: '중단', label: '임무 중단', icon: <FaTimesCircle /> },
                { id: '완료', label: '임무 완료', icon: <FaCheckCircle /> }
              ].map(tab => {
                const isSelected = modalStatusFilter === tab.id;
                let statusChipStyle = '';
                if (isSelected) {
                  if (tab.id === 'ALL') statusChipStyle = 'bg-[#B45309] text-white border-[#B45309] shadow-xs';
                  else if (tab.id === '진행') statusChipStyle = 'bg-blue-600 text-white border-blue-600 shadow-xs';
                  else if (tab.id === '중단') statusChipStyle = 'bg-rose-600 text-white border-rose-600 shadow-xs';
                  else if (tab.id === '완료') statusChipStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
                } else {
                  if (tab.id === 'ALL') statusChipStyle = 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100';
                  else if (tab.id === '진행') statusChipStyle = 'bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100';
                  else if (tab.id === '중단') statusChipStyle = 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100';
                  else if (tab.id === '완료') statusChipStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100';
                }
                return (
                  <button key={tab.id} onClick={() => setModalStatusFilter(tab.id)} className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border shrink-0 flex items-center gap-1 ${statusChipStyle}`}>
                    <span className="text-[10px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 pt-0.5">
              <h3 className="text-[11px] font-bold text-stone-800 flex items-center gap-1 ml-0.5">
                <span>👑 이 꽃을 보유한 길드원 ({filteredFlowerMembers.length}명)</span>
              </h3>

              {/* 모달 데이터 로딩 중일 때 스피너 표시 */}
              {isModalLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <FaSpinner className="animate-spin text-2xl text-amber-600" />
                  <span className="text-[11px] font-bold text-stone-500">길드원 목록을 불러오는 중...</span>
                </div>
              ) : filteredFlowerMembers.length === 0 ? (
                <div className="text-center py-6 text-stone-400 text-xs bg-white/50 rounded-2xl border border-stone-200/50">
                  해당 조건을 만족하는 길드원이 없습니다.
                </div>
              ) : (
                filteredFlowerMembers.map((item) => {
                  const baseScore = selectedFlower.score || 0;
                  const extraScore = item.extra_score ?? 0;
                  const totalScore = baseScore + extraScore; 
                  const memberStatus = item.profiles?.mission_status || '진행';
                  const memberNickname = item.profiles?.nickname || '알 수 없음';
                  return (
                    <div key={item.id} className="bg-white p-3 rounded-2xl shadow-2xs border border-amber-200/70 flex items-center justify-between gap-2.5">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-900 truncate">{memberNickname}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${getStatusBadgeStyle(memberStatus)}`}>{memberStatus}</span>
                        </div>
                        <p className="text-[10px] text-amber-800/80 font-medium">
                          임무 총 점수: <span className="font-extrabold text-amber-900 text-xs">{totalScore}점</span> 
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-extrabold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-lg border border-pink-100 shadow-2xs">절품+</span>
                          
                          <div className="flex items-center bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
                            <input 
                              type="number" 
                              min="0" 
                              value={extraScore === 0 ? '' : extraScore} 
                              placeholder="0"
                              onChange={(e) => { 
                                const val = e.target.value === '' ? 0 : Number(e.target.value); 
                                updateExtraScore(item.id, isNaN(val) ? 0 : val); 
                              }} 
                              className="w-9 py-1 text-center text-xs font-bold text-stone-900 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                            <div className="flex flex-col border-l border-stone-200 bg-stone-50">
                              <button 
                                type="button"
                                onClick={() => updateExtraScore(item.id, extraScore + 1)}
                                className="w-5 h-4 flex items-center justify-center text-[9px] text-stone-600 hover:bg-stone-200 transition cursor-pointer border-b border-stone-200"
                                title="증가"
                              >
                                ▲
                              </button>
                              <button 
                                type="button"
                                onClick={() => updateExtraScore(item.id, extraScore - 1)}
                                className="w-5 h-4 flex items-center justify-center text-[9px] text-stone-600 hover:bg-stone-200 transition cursor-pointer"
                                title="소"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => setDeleteTarget({ id: item.id, nickname: memberNickname })} 
                          className="w-7 h-7 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition cursor-pointer border border-rose-200/60 shadow-2xs"
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
      )}

      {/* [커스텀 삭제 확인 모달] 요청하신 타이틀과 내용 반영 */}
      {deleteTarget !== null && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setDeleteTarget(null)}
        >
          <div 
            className="bg-white rounded-[28px] p-6 max-w-xs w-full shadow-2xl border border-stone-100 space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto text-base shadow-2xs border border-rose-200/60">
              <FaExclamationCircle />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-stone-900">꽃 보유 길드원 삭제</h3>
              <p className="text-xs text-stone-500 font-medium leading-relaxed">
                정말 <span className="font-extrabold text-stone-800">'{selectedFlower?.name || '해당'}'</span> 보유 길드원 목록에서
                <br />
                <span className="font-extrabold text-stone-800">'{deleteTarget.nickname}'</span>님을 삭제하시겠습니까?
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-stone-100 text-stone-600 py-3 rounded-2xl text-xs font-bold hover:bg-stone-200 transition-all cursor-pointer active:scale-95"
              >
                취소
              </button>
              <button
                onClick={executeDeleteUserFlower}
                className="flex-1 bg-rose-500 text-white py-3 rounded-2xl text-xs font-bold hover:bg-rose-600 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </NavigationLayout>
  );
}