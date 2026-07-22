'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function MemberManagePage() {
  const router = useRouter();
  const [searchWord, setSearchWord] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const [localData, setLocalData] = useState<Record<string, { role: string; nickname: string; basic: string; vip: string; completed: number }>>({});
  
  const limit = 10;

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

  const rolePriority: Record<string, number> = {
    '길드장': 1,
    '부길드장': 2,
    '임원': 3,
    '정예': 4,
    '멤버': 5
  };

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
      const sortedMembers = [...data].sort((a, b) => {
        const priorityA = rolePriority[a.role] || 99;
        const priorityB = rolePriority[b.role] || 99;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.nickname.localeCompare(b.nickname, 'ko');
      });

      setMembers(sortedMembers);

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
        setPage(1);
        fetchMembers();
      }
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
        {/* 상단 뉴비 등록 안내 카드 (다른 관리 페이지들과 스타일 통일) */}
        <div className="bg-white p-3.5 rounded-2xl border-2 border-amber-100 shadow-sm space-y-2">
          <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
            <span>❣️</span> 새로운 멤버 등록 시 아래 버튼을 눌러주세요.
          </p>
          <button 
            onClick={() => router.push('/guild/members/create')} 
            className="w-full py-3.5 bg-sky-500 text-white font-black text-base rounded-xl hover:bg-sky-600 transition-colors shadow-sm"
          >
            👥 뉴비 등록하기
          </button>
        </div>

        {/* 검색 영역 (메인 대시보드와 동일한 정사각형 돋보기 버튼 스타일 적용) */}
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm space-y-2">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="길드원 닉네임 검색" 
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchMembers(); } }}
              className="flex-1 p-3.5 border-2 border-amber-200 rounded-2xl font-bold bg-white text-sm focus:outline-none focus:border-[#556B2F]"
            />
            <button 
              onClick={() => {
                setPage(1);
                fetchMembers();
              }} 
              className="w-14 h-14 bg-[#556B2F] text-white rounded-2xl flex items-center justify-center hover:bg-[#445823] transition-colors shadow-sm shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 멤버 테이블 영역 */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-red-500 px-1">
            ❤️ 체크박스 선택 후에 삭제/수정 버튼을 눌러야 정보가 저장됩니다.
          </p>
          
          <div className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm overflow-hidden font-bold w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-center table-fixed text-xs">
                <thead>
                  <tr className="bg-amber-50 text-amber-900 border-b border-amber-100 font-extrabold h-9">
                    <th className="w-[10%] px-0.5">
                      <input 
                        type="checkbox" 
                        checked={isAllPageChecked}
                        onChange={(e) => handleToggleAll(e.target.checked)}
                        className="w-4 h-4 accent-[#556B2F] cursor-pointer"
                      />
                    </th>
                    <th className="w-[24%] px-0.5">직급</th>
                    <th className="w-[28%] px-0.5">닉네임</th>
                    <th className="w-[14%] px-0.5">기본</th>
                    <th className="w-[12%] px-0.5">VIP</th>
                    <th className="w-[12%] px-0.5">완료</th>
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
                          className="w-full border border-amber-200 p-1 text-xs rounded-lg bg-white focus:outline-none focus:border-[#556B2F]"
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
                          value={localData[m.id]?.basic || m.is_basic_only} 
                          onChange={(e) => setLocalData({ ...localData, [m.id]: { ...localData[m.id], basic: e.target.value } })}
                          className="w-full border border-amber-200 p-1 text-xs rounded-lg bg-white focus:outline-none focus:border-[#556B2F]"
                        >
                          <option value="Y">Y</option>
                          <option value="N">N</option>
                        </select>
                      </td>
                      <td className="px-0.5">
                        <select 
                          value={localData[m.id]?.vip || m.is_vip} 
                          onChange={(e) => setLocalData({ ...localData, [m.id]: { ...localData[m.id], vip: e.target.value } })}
                          className="w-full border border-amber-200 p-1 text-xs rounded-lg bg-white focus:outline-none focus:border-[#556B2F]"
                        >
                          <option value="Y">Y</option>
                          <option value="N">N</option>
                        </select>
                      </td>
                      <td className="px-0.5">
                        <input 
                          type="number" 
                          value={localData[m.id]?.completed ?? 0} 
                          onChange={(e) => setLocalData({ ...localData, [m.id]: { ...localData[m.id], completed: Number(e.target.value) } })}
                          className="w-full border border-amber-200 p-1 text-xs rounded-lg text-center bg-white focus:outline-none focus:border-[#556B2F]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이징 */}
            <div className="flex justify-between items-center p-3 bg-amber-50">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)} 
                className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl disabled:opacity-50 text-xs font-black"
              >
                이전
              </button>
              <span className="text-amber-950 font-bold text-xs">
                {page} / {totalPages} (총 {members.length}명)
              </span>
              <button 
                disabled={page >= totalPages} 
                onClick={() => setPage(page + 1)} 
                className="px-3 py-1.5 bg-white border-2 border-amber-200 rounded-xl disabled:opacity-50 text-xs font-black"
              >
                다음
              </button>
            </div>
          </div>
        </div>

        {/* 액션 제어 버튼 */}
        <div className="grid grid-cols-2 gap-2 text-sm font-black pt-2">
          <button 
            onClick={handleDelete} 
            className="py-3.5 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-colors shadow-sm"
          >
            탈퇴/추방 삭제
          </button>
          <button 
            onClick={handleUpdate} 
            className="py-3.5 bg-[#556B2F] text-white rounded-2xl hover:bg-[#445823] transition-colors shadow-sm"
          >
            정보 수정하기
          </button>
        </div>
      </div>
    </div>
  );
}