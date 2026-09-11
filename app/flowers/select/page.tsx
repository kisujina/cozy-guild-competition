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
  if (g === 'UR') return 'bg-pink-100 text-pink-700 border-pink-200';
  if (g === 'SSR') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (g === 'SR') return 'bg-purple-100 text-purple-700 border-purple-200';
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
  'UR': 5, 'SSR': 4, 'SR': 3, 'R': 2, 'N': 1
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
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [selectedFlower, setSelectedFlower] = useState<any | null>(null);
  const [flowerMembers, setFlowerMembers] = useState<any[]>([]);
  const [modalMemberSearch, setModalMemberSearch] = useState('');
  const [modalMemberSuggestions, setModalMemberSuggestions] = useState<any[]>([]);
  const [modalStatusFilter, setModalStatusFilter] = useState<string>('ALL');

  /**꽃 확대 보기 모달 */
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [guildMembers, setGuildMembers] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; nickname: string } | null>(null);

  //유저의 role 
  const [userRole, setUserRole] = useState<string | null>(null);
  // 꽃 등록, 수정 모달
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlower, setEditingFlower] = useState<any | null>(null); // 수정할 꽃 데이터 (null이면 신규 등록)
  // 폼 입력 필드 상태
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('UR'); // 기본 등급 예시
  const [score, setScore] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null); // 업로드할 리스트용 이미지 파일
  const [previewUrl, setPreviewUrl] = useState(''); // 이미지 미리보기용
  const [largeImageFile, setLargeImageFile] = useState<File | null>(null); // 업로드할 확대용 이미지 파일
  const [previewUrlLarge, setPreviewUrlLarge] = useState(''); // 이미지 미리보기용
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    /**재접속 안내 경고창 추가 */
    if (!sNick) {
      alert('재접속이 필요합니다.');
      window.location.href = "/";
      return;
    }
    
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

  // 유저 정보(profiles 테이블)를 가져오는 로직 예시
  useEffect(() => {
    const fetchUserRole = async () => {
      const userNick = localStorage.getItem('user_nickname'); // 혹은 세션/auth 정보
      if (!userNick) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('nickname', userNick)
        .single();

      if (!error && data) {
        setUserRole(data.role); // '관리자', '길드장', '부길드장', '임원', '정예' 등
      }
    };

    fetchUserRole();
  }, []);

  // 권한 확인 함수... (꽃의 등록&수정&삭제는 오직 관리자만 가능하다. 일단은 신규 꽃 등록 기능만 오픈)
  const isSuManager = userRole === '관리자' ;
  const isManager = userRole === '길드장' || userRole === '부길드장';
  
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
      setIsModalLoading(true);
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
      setIsModalLoading(false);
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

  // 신규 꽃 등록 모달 열기
  const handleOpenCreateModal = () => {
    setEditingFlower(null);
    setName('');
    setGrade('UR');
    setScore('');
    setImageFile(null);
    setPreviewUrl('');
    setPreviewUrlLarge('');
    setIsModalOpen(true);
  };

  // 꽃 수정 모달 열기 (기존 꽃 데이터를 인자로 전달받음)
  const handleOpenEditModal = (flower: any) => {
    setEditingFlower(flower);
    setName(flower.name || '');
    setGrade(flower.grade || 'UR');
    setScore(flower.score ? String(flower.score) : '');
    setImageFile(null);
    setPreviewUrl(flower.image_url || ''); // 기존 이미지 경로 설정
    setPreviewUrlLarge(flower.large_image_url || '');
    setIsModalOpen(true);
  };

  const handleSaveFlower = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !score.trim()) {
      alert('꽃 이름과 점수를 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 공백을 모두 제거한 입력 이름 정규화
      const normalizedInputName = name.replace(/[^a-zA-Z0-9가-힣]/g, '');

      // 2. DB에 존재하는 기존 꽃들의 이름 조회
      const { data: existingFlowers, error: fetchError } = await supabase
        .from('flowers')
        .select('id, name');

      if (fetchError) throw fetchError;

      // 3. 공백을 제외한 이름이 중복되는지 검사
      const isDuplicate = existingFlowers?.some((flower) => {
        // 수정 중일 때 자기 자신의 이름은 중복 검사에서 제외
        if (editingFlower && flower.id === editingFlower.id) return false;
        return flower.name.replace(/[^a-zA-Z0-9가-힣]/g, '') === normalizedInputName;
      });

      if (isDuplicate) {
        alert('이미 존재하는 꽃 이름입니다. 확인 후 등록 바랍니다.');
        setIsSubmitting(false);
        return;
      }

      let imageUrl = previewUrl; // 수정 시 새 이미지를 안 고르면 기존 URL 유지
      let largeImageUrl = previewUrlLarge; 

      // 4. 새 이미지 파일(리스트 이미지) 선택된 경우 Supabase Storage에 업로드
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        // 1. 숫자를 먼저 문자열로 바꾼 뒤 substring 사용 (권장)
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('flowers') // 아까 생성한 스토리지 버킷 이름
          .upload(fileName, imageFile);

        if (uploadError) {
          throw new Error('이미지 업로드 실패: ' + uploadError.message);
        }

        // 공개 URL 가져오기
        const { data: publicUrlData } = supabase.storage
          .from('flowers')
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      // 5. 새 이미지 파일(확대용이미지) 선택된 경우 Supabase Storage에 업로드
      if (largeImageFile) {
        const fileExt = largeImageFile.name.split('.').pop();
        // 1. 숫자를 먼저 문자열로 바꾼 뒤 substring 사용 (권장)
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('flowers') // 아까 생성한 스토리지 버킷 이름
          .upload(fileName, largeImageFile);

        if (uploadError) {
          throw new Error('이미지 업로드 실패: ' + uploadError.message);
        }

        // 공개 URL 가져오기
        const { data: publicUrlData } = supabase.storage
          .from('flowers')
          .getPublicUrl(fileName);

        largeImageUrl = publicUrlData.publicUrl;
      }

      // 5. flowers 테이블에 INSERT 또는 UPDATE 처리
      if (editingFlower) {
        // 수정 (UPDATE)
        const { error } = await supabase
          .from('flowers')
          .update({
            name,
            grade,
            score: Number(score),
            image_url: imageUrl,
            large_image_url: largeImageUrl,
          })
          .eq('id', editingFlower.id);

        if (error) throw error;
        alert('꽃 정보가 성공적으로 수정되었습니다.');
      } else {
        // 신규 등록 (INSERT)
        const { error } = await supabase
          .from('flowers')
          .insert([{
            name,
            grade,
            score: Number(score),
            image_url: imageUrl,
            large_image_url: largeImageUrl,
          }]);

        if (error) throw error;
        alert('새로운 꽃이 등록되었습니다.');
      }

      // 모달 닫기 및 데이터 리프레시 (fetchFlowers는 목록 불러오는 함수명에 맞게 변경)
      setIsModalOpen(false);

      // ⭐ [핵심] 저장 직후 리스트를 다시 불러와 화면을 즉시 갱신합니다!
      await fetchFlowersByQuery();

    } catch (error: any) {
      alert(error.message || '처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFlower = async (flowerId: number, flowerName: string, imageUrl: string, largeImageUrl: string) => {
    if (!window.confirm(`'${flowerName}' ⚠️꽃 정보를 정말 삭제하시겠습니까? 이미지와 데이터 모두 완전히 삭제되며, 관련 데이터는 복구 할 수 없습니다.`)) return;
   
    try {
        // 1. 이미지 URL이 존재하고 Supabase Storage 주소인 경우 파일명 추출 후 스토리지에서 삭제
        if (imageUrl) {
          // 예: https://xxx.supabase.co/storage/v1/object/public/flowers/1710000000000_abc.png
          // URL에서 버킷 이름('flowers') 뒤에 오는 파일 경로를 추출합니다.
          const urlObj = new URL(imageUrl);
          const pathSegments = urlObj.pathname.split('/');
          const bucketIndex = pathSegments.indexOf('flowers');
          
          if (bucketIndex !== -1) {
            // 'flowers' 이후의 경로들을 합쳐서 파일 경로(파일명)를 얻습니다.
            const filePath = pathSegments.slice(bucketIndex + 1).join('/');

            const { error: storageError } = await supabase.storage
              .from('flowers')
              .remove([filePath]);

            if (storageError) {
              console.error('스토리지 이미지 삭제 실패:', storageError.message);
              // 이미지 삭제가 실패하더라도 DB 삭제는 진행할지, 여기서 멈출지 선택할 수 있습니다.
            }
          }
        }
        // 2. 확대 이미지 URL이 존재하고 Supabase Storage 주소인 경우 파일명 추출 후 스토리지에서 삭제
        if (largeImageUrl) {
          // 예: https://xxx.supabase.co/storage/v1/object/public/flowers/1710000000000_abc.png
          // URL에서 버킷 이름('flowers') 뒤에 오는 파일 경로를 추출합니다.
          const urlObj = new URL(largeImageUrl);
          const pathSegments = urlObj.pathname.split('/');
          const bucketIndex = pathSegments.indexOf('flowers');
          
          if (bucketIndex !== -1) {
            // 'flowers' 이후의 경로들을 합쳐서 파일 경로(파일명)를 얻습니다.
            const filePath = pathSegments.slice(bucketIndex + 1).join('/');

            const { error: storageError } = await supabase.storage
              .from('flowers')
              .remove([filePath]);

            if (storageError) {
              console.error('스토리지 이미지 삭제 실패:', storageError.message);
              // 이미지 삭제가 실패하더라도 DB 삭제는 진행할지, 여기서 멈출지 선택할 수 있습니다.
            }
          }
        }
        // 2. flowers 테이블에서 데이터 삭제
        const { error: dbError } = await supabase
          .from('flowers')
          .delete()
          .eq('id', flowerId);

        if (dbError) throw dbError;

        alert('꽃 정보와 이미지가 성공적으로 삭제되었습니다.');
      
      // ⭐ [핵심] 삭제 직후 리스트를 다시 불러와 화면을 즉시 갱신합니다!
      await fetchFlowersByQuery();

    } catch (error: any) {
      alert(error.message || '삭제 중 오류가 발생했습니다.');
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
      <div className="max-w-md mx-auto flex flex-col bg-[#FAF9F6]">
        
        {/* 1. 상단 필터 및 배너 영역 */}
        <div className="px-3 pt-1.5 space-y-2">
          <div className="flex justify-between items-center px-1">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)} 
              className="flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-pink-500 transition cursor-pointer select-none"
            >
              <span className="w-5 h-5 rounded-lg bg-pink-100/80 text-pink-500 flex items-center justify-center text-[10px]">
                <FaSlidersH />
              </span>
              <span>{isFilterOpen ? '숨기기' : '검색 옵션 추가'}</span>
              <span className={`text-stone-400 text-[10px] transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`}>
                <FaChevronDown />
              </span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-pink-600 bg-pink-50/80 px-2 py-0.5 rounded-md border border-pink-100">
                {displayedFlowersList.length}개
              </span>
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 border border-stone-200/80 text-stone-600 hover:bg-stone-100 transition text-[11px] font-semibold cursor-pointer shadow-2xs"
              >
                {sortOrder === 'desc' ? <FaSortAmountDown className="text-amber-500 text-[10px]" /> : <FaSortAmountUp className="text-amber-500 text-[10px]" />}
                <span>{sortOrder === 'desc' ? '내림차순' : '오름차순'}</span>
              </button>
              {/* 관리자,길드장,부길드장,임원 꽃 등록 버튼 노출 */}
              {(isSuManager || isManager) && (
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="bg-purple-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold"
                >
                  + 신규 꽃 등록
                </button>
              )}
            </div>
          </div>
          
          {isFilterOpen && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]" style={{ scrollbarWidth: 'none' }}>
                <button onClick={() => handleMainFilterClick('all')} className={`px-2.5 py-1 rounded-lg font-medium shrink-0 cursor-pointer ${mainFilter === 'all' ? 'bg-stone-800 text-white shadow-xs' : 'bg-white/80 text-stone-600 border border-stone-200/70 hover:bg-stone-100'}`}>all</button>
                <button onClick={() => handleMainFilterClick('mine')} className={`px-2.5 py-1 rounded-lg font-medium shrink-0 cursor-pointer ${mainFilter === 'mine' ? 'bg-pink-500 text-white shadow-xs' : 'bg-white/80 text-stone-600 border border-stone-200/70 hover:bg-stone-100'}`}>나의 보유</button>
                <button onClick={() => handleMainFilterClick('not_mine')} className={`px-2.5 py-1 rounded-lg font-medium shrink-0 cursor-pointer ${mainFilter === 'not_mine' ? 'bg-pink-500 text-white shadow-xs' : 'bg-white/80 text-stone-600 border border-stone-200/70 hover:bg-stone-100'}`}>나의 미보유</button>
                <button onClick={() => handleSubFilterClick('guild_mine')} className={`px-2.5 py-1 rounded-lg font-medium shrink-0 cursor-pointer ${subFilter === 'guild_mine' ? 'bg-purple-500 text-white shadow-xs' : 'bg-white/80 text-stone-600 border border-stone-200/70 hover:bg-stone-100'}`}>길드원 보유</button>
                <button onClick={() => handleSubFilterClick('guild_not_mine')} className={`px-2.5 py-1 rounded-lg font-medium shrink-0 cursor-pointer ${subFilter === 'guild_not_mine' ? 'bg-purple-500 text-white shadow-xs' : 'bg-white/80 text-stone-600 border border-stone-200/70 hover:bg-stone-100'}`}>길드원 미보유</button>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {['UR', 'SSR', 'SR', 'R', 'N'].map((grade) => {
                  const isSelected = selectedGrades.includes(grade);
                  let chipColorStyle = 'bg-white/80 text-stone-600 border-stone-200/70 hover:bg-stone-100';
                  
                  if (isSelected) {
                    if (grade === 'UR') chipColorStyle = 'bg-pink-500 text-white border-pink-500 shadow-xs';
                    else if (grade === 'SSR') chipColorStyle = 'bg-amber-400 text-white border-amber-400 shadow-xs';
                    else if (grade === 'SR') chipColorStyle = 'bg-purple-500 text-white border-purple-500 shadow-xs';
                    else if (grade === 'R') chipColorStyle = 'bg-sky-500 text-white border-sky-500 shadow-xs';
                    else if (grade === 'N') chipColorStyle = 'bg-emerald-500 text-white border-emerald-500 shadow-xs';
                  } else {
                    if (grade === 'UR') chipColorStyle = 'bg-pink-50/60 text-pink-700 border-pink-200/80 hover:bg-pink-100';
                    else if (grade === 'SSR') chipColorStyle = 'bg-amber-50/60 text-amber-800 border-amber-200/80 hover:bg-amber-100';
                    else if (grade === 'SR') chipColorStyle = 'bg-purple-50/60 text-purple-700 border-purple-200/80 hover:bg-purple-100';
                    else if (grade === 'R') chipColorStyle = 'bg-sky-50/60 text-sky-700 border-sky-200/80 hover:bg-sky-100';
                    else if (grade === 'N') chipColorStyle = 'bg-emerald-50/60 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100';
                  }

                  return (
                    <button 
                      key={grade} 
                      onClick={() => toggleGradeSelection(grade)} 
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${chipColorStyle}`}
                    >
                      {grade} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 즐겨찾는 꽃 바 */}
          {favoriteFlowersList.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5" style={{ scrollbarWidth: 'none' }}>
              <span className="text-[10px] font-bold text-pink-500 shrink-0 flex items-center gap-0.5">
                <FaHeart className="text-[9px]" /> 즐겨찾기:
              </span>
              {favoriteFlowersList.map(fav => (
                <div
                  key={fav.id}
                  onClick={() => { setSelectedFlower(fav); fetchFlowerMembers(fav.id); }}
                  className="shrink-0 flex items-center gap-1.5 bg-[#FAF9F6] px-2.5 py-1 rounded-xl border border-pink-200/60 shadow-2xs cursor-pointer hover:border-pink-300 transition"
                >
                  <div className="w-4 h-4 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center shrink-0">
                    {fav.image_url ? <img src={fav.image_url} alt="" className="w-full h-full object-cover" /> : <FaSeedling className="text-[8px] text-stone-300" />}
                  </div>
                  <span className="text-[10px] font-bold text-stone-800">{fav.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {showNoResultNotice && flowerSearch.trim() !== '' && (
          <div className="mx-3 mt-1.5 flex items-start gap-1.5 text-rose-500 text-xs bg-rose-50/90 backdrop-blur-xs p-2.5 rounded-xl border border-rose-100 shadow-2xs">
            <FaExclamationCircle className="mt-0.5 shrink-0 text-sm" />
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              신규 꽃 추가 요청은 '길드장'/'부길드장'에게 요청해주세요.
            </span>
          </div>
        )}

        {/* 2. 꽃 이름 검색창 (스크롤 시 맨 위 top-0에 밀착되도록 수정) */}
        <div className="sticky top-0 bg-[#FAF9F6] px-3 py-2 z-30 border-b border-stone-200/40 mt-1.5 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.02)]">
          <div className="relative flex items-center">
            <FaSearch className="absolute left-3.5 text-stone-300 text-sm" />
            <input
              type="text"
              value={flowerSearch}
              onChange={(e) => setFlowerSearch(e.target.value)}
              placeholder="꽃 이름으로 찾아보세요."
              className="w-full pl-10 pr-9 py-2 bg-white rounded-xl shadow-2xs border border-stone-200/70 focus:ring-2 focus:ring-pink-200 focus:border-pink-300 outline-none text-sm transition"
            />
            {flowerSearch && (
              <button
                type="button"
                onClick={() => { setFlowerSearch(''); setShowNoResultNotice(false); }}
                className="absolute right-3 w-5 h-5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-400 hover:text-stone-600 flex items-center justify-center transition cursor-pointer"
                title="검색어 초기화"
              >
                <FaTimes className="text-[10px]" />
              </button>
            )}
          </div>
        </div>

        {/* 3. 2열 컴팩트 한 줄 카드 리스트 영역 */}
        <div className="flex-1 p-3 pb-24 min-h-[300px] flex flex-col relative z-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 my-auto">
              <FaSpinner className="animate-spin text-3xl text-pink-500" />
              <span className="text-xs font-bold text-stone-500">꽃 리스트를 불러오는 중입니다...</span>
            </div>
          ) : displayedFlowersList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400 text-xs gap-2 my-auto">
              <FaSeedling className="text-2xl text-stone-300" />
              <span>검색 결과가 없습니다.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {displayedFlowersList.map((flower) => {
                const isFavorite = favoriteFlowersList.some(fav => fav.id === flower.id);

                return (
                  <div
                    key={flower.id}
                    onClick={() => { setSelectedFlower(flower); fetchFlowerMembers(flower.id); }}
                    className="bg-white p-2.5 rounded-2xl border border-stone-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer hover:border-pink-300 hover:shadow-md transition group relative"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          // 큰 이미지 경로가 있다면 큰 이미지 경로를, 없다면 일반 이미지 경로를 모달에 전달
                          const targetImg = flower.large_image_url || flower.image_url;
                          if (targetImg) setPreviewImageModal(targetImg);
                        }}
                        className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden flex items-center justify-center border border-stone-200/60 shrink-0 cursor-pointer group relative shadow-2xs"
                        title="이미지 크게 보기"
                      >
                        {flower.image_url ? (
                          <img src={flower.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        ) : (
                          <FaSeedling className="text-stone-400 text-sm" />
                        )}
                        {/* 마우스 올렸을 때 뜨는 세련된 돋보기 오버레이 효과 */}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]">
                          🔍
                        </div>
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold border leading-none ${getGradeBadgeColor(flower.grade)}`}>
                            {flower.grade}
                          </span>
                          <span className="text-[10px] text-amber-900 font-bold bg-amber-50/80 px-1.5 py-0.2 rounded border border-amber-100/60">
                            {flower.score || 0}점
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-stone-900 truncate tracking-tight" title={flower.name}>
                          {flower.name}
                        </h3>
                      </div>
                    </div>
                    
                    {/* 우측 액션 버튼 영역 (즐겨찾기 + 관리자용 수정 버튼) */}
                    <div className="flex items-center gap-1 shrink-0 ml-1.5">
                    {/* 관리자의 경우에만 노출되는 수정/삭제 버튼 - 관리자는 수정/삭제 노출, 길드장부길드장 수정만 노출*/}
                    {(isSuManager || isManager) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(flower); // 수정 모달 오픈 함수
                          }}
                          className="w-6 h-6 rounded-full bg-stone-50 hover:bg-blue-50 text-stone-400 hover:text-blue-500 flex items-center justify-center transition cursor-pointer"
                          title="꽃 정보 수정"
                        >
                          <span className="text-[10px] font-bold">수정</span>
                        </button>
                      )}
                      {isSuManager && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFlower(flower.id, flower.name, flower.image_url, flower.large_image_url);
                        }}
                        className="w-6 h-6 rounded-full bg-stone-50 hover:bg-rose-50 text-stone-400 hover:text-rose-500 flex items-center justify-center transition cursor-pointer"
                        title="꽃 정보 삭제"
                      >
                        <span className="text-[10px] font-bold">삭제</span>
                      </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(flower.id);
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition shrink-0 ml-1.5 cursor-pointer ${
                          isFavorite 
                            ? 'text-pink-500 bg-pink-50 hover:bg-pink-100' 
                            : 'text-stone-300 bg-stone-50 hover:bg-stone-100 hover:text-stone-400'
                        }`}
                        title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                      >
                        {isFavorite ? <FaHeart className="text-[10px]" /> : <FaRegHeart className="text-[10px]" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>    
      
      {/* 🌸 X 버튼을 모달 내부 상단 우측으로 깔끔하게 배치한 확대 보기 모달 */}
      {previewImageModal && (
        <div 
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[999] p-4 cursor-zoom-out"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-[320px] w-full bg-stone-900 rounded-[28px] overflow-hidden shadow-2xl border border-stone-800 p-5 flex flex-col items-center"
          >
            {/* 모달 내부 우측 상단으로 이동 및 크기 최적화된 X 버튼 */}
            <div className="w-full flex justify-end mb-2">
              <button 
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="w-6 h-6 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-[10px] font-bold border border-stone-700 shadow-xs"
              >
                ✕
              </button>
            </div>
            
            {/* 찌그러짐 방지 및 로딩 처리를 위한 고정 컨테이너 */}
            <div className="w-full aspect-square rounded-2xl bg-black/50 flex items-center justify-center relative overflow-hidden border border-stone-800/80">
              
              {/* 이미지 로딩 중 스피너 */}
              <div className="absolute inset-0 flex items-center justify-center bg-stone-900/60 z-0">
                <FaSpinner className="animate-spin text-pink-400 text-xl" />
              </div>

              <img 
                src={previewImageModal} 
                alt="꽃 고화질 확대 이미지" 
                onLoad={(e) => {
                  (e.currentTarget as HTMLImageElement).classList.remove('opacity-0');
                  (e.currentTarget as HTMLImageElement).classList.add('opacity-100');
                }}
                className="w-full h-full object-contain rounded-xl relative z-10 opacity-0 transition-opacity duration-200"
              />
            </div>
          </div>
        </div>
      )}

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
                <div 
                  onClick={() => {
                    const targetImg = selectedFlower?.large_image_url || selectedFlower?.image_url;
                    if (targetImg) {
                      setPreviewImageModal(targetImg);
                    }
                  }}
                  className="w-12 h-12 rounded-2xl bg-stone-100 overflow-hidden flex items-center justify-center border border-stone-200/80 shrink-0 cursor-pointer group relative shadow-xs"
                  title="이미지 크게 보기"
                >
                  {selectedFlower?.image_url ? (
                    <img src={selectedFlower.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                  ) : (
                    <FaSeedling className="text-stone-400 text-base" />
                  )}
                  {/* 세련된 호버 돋보기 배지 */}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                    🔍
                  </div>
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
                              className="w-8 py-1 text-center text-xs font-bold text-stone-900 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <div className="flex flex-col border-l border-stone-200 bg-stone-50">
                              <button
                                type="button"
                                onClick={() => updateExtraScore(item.id, extraScore + 1)}
                                className="px-1.5 h-[14px] flex items-center justify-center text-stone-500 hover:bg-pink-100 hover:text-pink-600 transition text-[8px] cursor-pointer"
                                title="1 증가"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => updateExtraScore(item.id, Math.max(0, extraScore - 1))}
                                className="px-1.5 h-[14px] flex items-center justify-center text-stone-500 hover:bg-pink-100 hover:text-pink-600 transition text-[8px] border-t border-stone-200 cursor-pointer"
                                title="1 감소"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => setDeleteTarget({ id: item.id, nickname: memberNickname })}
                          className="w-7 h-7 rounded-xl bg-stone-50 hover:bg-rose-50/80 text-stone-400 hover:text-rose-500 flex items-center justify-center transition border border-stone-200/80 cursor-pointer"
                          title="보유 기록 삭제"
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

      {/* 커스텀 삭제 확인 모달 */}
      {deleteTarget !== null && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setDeleteTarget(null)}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-stone-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto text-xl">
              <FaTrashAlt />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-stone-900">'{selectedFlower.name}' 보유 현황 삭제</h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                <span className="font-bold text-stone-800">{deleteTarget.nickname}</span>님의 보유 꽃 현황에서<br></ br>'<span className="font-bold text-stone-800">{selectedFlower.name}</span>'을 삭제하시겠습니까?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button 
                onClick={() => setDeleteTarget(null)}
                className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold transition cursor-pointer"
              >
                취소
              </button>
              <button 
                onClick={executeDeleteUserFlower}
                className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 꽃 등록 / 수정 모달 */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-stone-100 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-stone-900">
                {editingFlower ? '🌸꽃 정보 수정' : '🌸신규 꽃 등록'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFlower} className="space-y-3.5 text-xs">
              {/* 꽃 이름 */}
              <div>
                <label className="block font-bold text-stone-500 mb-1.5 ml-0.5">🌱꽃 이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 꽃나무 정원"
                  className="w-full px-4 py-3 bg-stone-50 rounded-2xl outline-none font-medium border border-stone-200 focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all"
                  required
                />
              </div>

              {/* 등급 및 점수 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-500 mb-1.5 ml-0.5">🌱등급</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-3 bg-stone-50 rounded-2xl outline-none font-medium border border-stone-200 focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all"
                  >
                    <option value="UR">UR</option>
                    <option value="SSR">SSR</option>
                    <option value="SR">SR</option>
                    <option value="R">R</option>
                    <option value="N">N</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-500 mb-1.5 ml-0.5">🌱점수</label>
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="예: 30"
                    className="w-full px-4 py-3 bg-stone-50 rounded-2xl outline-none font-medium border border-stone-200 focus:bg-white focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition-all"
                    required
                  />
                </div>
              </div>

              {/* 리스트용 이미지 업로드 */}
              <div>
                <label className="block font-bold text-stone-500 mb-1.5 ml-0.5">🌱꽃 <strong className="font-bold text-purple-500">리스트 이미지</strong> 업로드</label>
                <div className="flex items-center gap-3">
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      alt="미리보기" 
                      className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0" 
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        setPreviewUrl(URL.createObjectURL(file)); // 로컬 미리보기 생성
                      }
                    }}
                    className="w-full text-[11px] text-stone-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-pink-50 file:text-pink-600 hover:file:bg-pink-100 cursor-pointer"
                  />
                </div>
              </div>

              {/* 확대용 이미지 업로드 */}
              <div>
                <label className="block font-bold text-stone-500 mb-1.5 ml-0.5">🌱꽃 <strong className="font-bold text-blue-500">확대 이미지</strong> 업로드</label>
                <div className="flex items-center gap-3">
                  {previewUrlLarge && (
                    <img 
                      src={previewUrlLarge} 
                      alt="미리보기" 
                      className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0" 
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLargeImageFile(file);
                        setPreviewUrlLarge(URL.createObjectURL(file)); // 로컬 미리보기 생성
                      }
                    }}
                    className="w-full text-[11px] text-stone-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-pink-50 file:text-pink-600 hover:file:bg-pink-100 cursor-pointer"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-pink-500 text-white font-bold py-3.5 rounded-2xl hover:bg-pink-600 transition-all cursor-pointer shadow-xs active:scale-95 mt-2 disabled:opacity-50"
              >
                {isSubmitting ? '저장 중...' : (editingFlower ? '수정 완료' : '등록하기')}
              </button>
            </form>
          </div>
        </div>
      )}

    </NavigationLayout>
  );
}