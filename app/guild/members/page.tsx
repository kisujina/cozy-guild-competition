'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function MemberManagePage() {
  const router = useRouter();
  const [searchWord, setSearchWord] = useState('');
  const [members, setMembers] = useState<any[]>([]); // 정렬 완료된 전체 멤버 리스트
  const [page, setPage] = useState(1); // 현재 페이지 상태
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // 수정 정보 추적 버퍼 테이블
  const [localData, setLocalData] = useState<Record<string, { role: string; nickname: string; basic: string; vip: string; completed: number }>>({});
  
  const limit = 10; // 한 페이지에 보여줄 길드원 수

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
    fetchMembers();
  }, []);

  // 🛠️ 직급별 정렬 우선순위 정의 (숫자가 작을수록 화면 상단에 노출)
  const rolePriority: Record<string, number> = {
    '길드장': 1,
    '부길드장': 2,
    '임원': 3,
    '정예': 4,
    '멤버': 5
  };

  // 🛠️ 쿼리 방식: 전체를 받아와 클라이언트 단에서 정렬
  const fetchMembers = async () => {
    let query = supabase.from('profiles').select('*');
    if (searchWord.trim()) {
      query = query.ilike('nickname', `%${searchWord.trim()}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('길드원 목록 조회 실패:', error);
      return;
    }

    if (data) {
      // 🛠️ 가져온 전체 목록을 직급 가중치 순서로 우선 정렬 후, 동일 직급은 가나다순으로 정렬
      const sortedMembers = [...data].sort((a, b) => {
        const priorityA = rolePriority[a.role] || 99;
        const priorityB = rolePriority[b.role] || 99;

        if (priorityA !== priorityB) {
          return priorityA - priorityB; // 1차 정렬: 직급 순
        }
        return a.nickname.localeCompare(b.nickname, 'ko'); // 2차 정렬: 닉네임 가나다순
      });

      setMembers(sortedMembers);

      // 로컬 수정 버퍼 초기화
      const buffer: any = {};
      sortedMembers.forEach((m) => {
        buffer[m.id] = {
          role: m.role,
          nickname: m.nickname,
          basic: m.is_basic_only,
          vip: m.is_vip,
          completed: m.completed_missions,
        };
      });
      setLocalData(buffer);
    }
  };

  const handleUpdate = async () => {
    const activeIds = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (activeIds.length === 0) {
      alert('선택된 데이터가 없습니다');
      return;
    }

    // 수정 유효성 분석
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
        original.is_vip === edited.vip &&
        original.completed_missions === edited.completed
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
          completed_missions: edited.completed,
        })
        .eq('id', id);

      if (error) {
        alert('닉네임 중복 오류 등으로 데이터 업데이트에 실패했습니다.');
        return;
      }
    }

    alert('수정되었습니다.');
    setSelectedIds({});
    
    // 🛠️ 수정 후 최신 데이터를 다시 로드하여 완벽하게 재정렬된 상태 유지
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
      const { error } = await supabase.from('profiles').delete().in('id', activeIds);
      if (!error) {
        alert('성공적으로 삭제되었습니다.');
        setSelectedIds({});
        setPage(1); // 삭제 후 안전하게 1페이지로 귀환
        fetchMembers();
      }
    }
  };

  // 🛠️ [페이징 계산 핵심] 전체 리스트(members)에서 현재 페이지 범위에 맞게 데이터를 10개씩 자릅니다.
  const totalPages = Math.ceil(members.length / limit) || 1;
  const pagedMembers = members.slice((page - 1) * limit, page * limit);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12">
      <Header />

      <div className="px-4 flex-1">
        <div className="flex flex-col gap-3 mb-6">
          <button onClick={() => router.push('/guild/members/create')} className="w-full py-4 bg-lime-700 text-white font-black text-xl rounded-2xl">
            👥 뉴비 등록하기
          </button>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="길드원 닉네임 검색" 
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="flex-1 p-3.5 border-2 border-amber-200 rounded-xl"
            />
            <button 
              onClick={() => {
                setPage(1); // 검색 시 안전하게 1페이지부터 결과 노출
                fetchMembers();
              }} 
              className="bg-lime-700 text-white px-5 rounded-xl font-bold"
            >
              검색
            </button>
          </div>
        </div>

        {/* 멤버 테이블 */}
        <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm overflow-hidden mb-6 text-xs font-bold">
          <div className="overflow-x-auto">
            <table className="w-full text-center min-w-[420px]">
              <thead>
                <tr className="bg-amber-50 text-amber-900 border-b border-amber-100 font-extrabold h-10 text-sm">
                  <th className="px-1">선택</th>
                  <th className="px-1">직급</th>
                  <th className="px-1">닉네임</th>
                  <th className="px-1">기본임무</th>
                  <th className="px-1">VIP</th>
                  <th className="px-1">완료수</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {/* 🛠️ 전체 리스트 대신 10개로 잘린 pagedMembers 배열을 돌려 화면을 그립니다. */}
                {pagedMembers.map((m) => (
                  <tr key={m.id} className="border-b border-amber-50 h-14">
                    <td>
                      <input 
                        type="checkbox" 
                        checked={!!selectedIds[m.id]} 
                        onChange={() => setSelectedIds({ ...selectedIds, [m.id]: !selectedIds[m.id] })}
                        className="w-5 h-5 accent-lime-700"
                      />
                    </td>
                    <td>
                      <select 
                        value={localData[m.id]?.role || m.role} 
                        onChange={(e) => setLocalData({ ...localData, [m.id]: { ...localData[m.id], role: e.target.value } })}
                        className="border border-amber-200 p-1 rounded-lg"
                      >
                        {['길드장', '부길드장', '임원', '정예', '멤버'].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        value={localData[m.id]?.nickname || ''} 
                        onChange={(e) => setLocalData({ ...localData, [m.id]: { ...localData[m.id], nickname: e.target.value } })}
                        className="w-20 border-b border-dashed border-amber-300 px-1 text-center font-bold text-amber-900"
                      />
                    </td>
                    <td>
                      <select 
                        value={localData[m.id]?.basic || m.is_basic_only} 
                        onChange={(e) => setLocalData({ ...localData, [m.id]: { ...localData[m.id], basic: e.target.value } })}
                        className="border border-amber-200 p-1 rounded-lg"
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                    <td>
                      <select 
                        value={localData[m.id]?.vip || m.is_vip} 
                        onChange={(e) => setLocalData({ ...localData, [m.id]: { ...localData[m.id], vip: e.target.value } })}
                        className="border border-amber-200 p-1 rounded-lg"
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        value={localData[m.id]?.completed ?? 0} 
                        onChange={(e) => setLocalData({ ...localData, [m.id]: { ...localData[m.id], completed: Number(e.target.value) } })}
                        className="w-10 border border-amber-200 p-1 rounded-lg text-center"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 🛠️ 페이지네이션 버튼 UI 컴포넌트 */}
          <div className="flex justify-between items-center p-3 bg-amber-50">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)} 
              className="px-3 py-1 bg-white border-2 border-amber-200 rounded-xl disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-amber-950 font-bold">
              {page} / {totalPages} (총 {members.length}명)
            </span>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage(page + 1)} 
              className="px-3 py-1 bg-white border-2 border-amber-200 rounded-xl disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-base font-black">
          <button onClick={handleUpdate} className="py-4 bg-lime-700 text-white rounded-2xl">수정</button>
          <button onClick={handleDelete} className="py-4 bg-red-600 text-white rounded-2xl">삭제</button>
          <button onClick={() => router.push('/list')} className="py-4 bg-amber-200 rounded-2xl">홈으로</button>
        </div>
      </div>
    </div>
  );
}