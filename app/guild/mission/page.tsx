'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function MissionSettingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [guildRank, setGuildRank] = useState('A'); // 기본값 'A'
  const [vip, setVip] = useState('N');
  const [basicOnly, setBasicOnly] = useState('Y');
  
  // 내가 완료한 임무 개수 상태 관리
  const [completedMissions, setCompletedMissions] = useState<number>(0);
  const [loading, setLoading] = useState(true); // 초기 로딩 상태 관리 추가

  useEffect(() => {
    const session = sessionStorage.getItem('guild_user');
    if (!session) {
      router.push('/');
      return;
    }
    const curUser = JSON.parse(session);
    setUser(curUser);
    
    // DB 및 세션에 따라 boolean 타입과 string 타입을 유연하게 맞춰서 매핑시킵니다.
    setVip(curUser.is_vip === true || curUser.is_vip === 'Y' ? 'Y' : 'N');
    setBasicOnly(curUser.is_basic_only === true || curUser.is_basic_only === 'Y' ? 'Y' : 'N');
    
    // 비동기 state 지연 방지를 위해 curUser.id를 직접 전달
    fetchMyMissionData(curUser.id);
    fetchGuildSetting();
    setLoading(false);
  }, []);

  // DB로부터 완료 임무 횟수 안전하게 한 번 더 받아오기
  const fetchMyMissionData = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('completed_missions')
      .eq('id', userId)
      .single();
    if (data) {
      setCompletedMissions(data.completed_missions || 0);
    }
  };

  const fetchGuildSetting = async () => {
    const { data } = await supabase.from('guild_settings').select('guild_rank').eq('id', 1).single();
    if (data) setGuildRank(data.guild_rank);
  };

  const getMissionCount = (rank: string) => {
    const mapping: Record<string, number> = { A: 18, B: 16, C: 14, D: 12 };
    return mapping[rank] || 18;
  };

  const maxMissions = getMissionCount(guildRank);

  const handleRegister = async () => {
    // 💡 세션 혹은 상태값에서 유저 정보를 확실하게 확보합니다.
    const session = sessionStorage.getItem('guild_user');
    const currentUser = user || (session ? JSON.parse(session) : null);

    if (!currentUser) {
      alert('로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.');
      router.push('/');
      return;
    }

    // 밸리데이션 체크
    if (completedMissions < 0) {
      alert('완료한 임무 개수는 0개 이상이어야 합니다.');
      return;
    }
    if (completedMissions > maxMissions) {
      alert(`현재 길드 등급의 최대 임무 횟수(${maxMissions}회)를 초과하여 등록할 수 없습니다.`);
      return;
    }

    try {
      // 1. 길드장/부길드장이면 길드 랭크 변경 가능하도록 업데이트 진행
      const isLeader = currentUser.role === '길드장' || currentUser.role === '부길드장';
      if (isLeader) {
        await supabase.from('guild_settings').update({ guild_rank: guildRank }).eq('id', 1);
      }

      // 2. 유저 본인의 VIP 여부, 기본 임무만 진행 여부 및 완료 임무 횟수(completed_missions) 업데이트
      // DB 스키마에 따라 boolean 또는 string 모두 매핑 가능하도록 안전하게 작성합니다.
      const { error } = await supabase
        .from('profiles')
        .update({
          is_vip: vip, // 혹은 DB 타입이 boolean이면: vip === 'Y'
          is_basic_only: basicOnly, // 혹은 DB 타입이 boolean이면: basicOnly === 'Y'
          completed_missions: completedMissions,
        })
        .eq('id', currentUser.id);

      if (error) {
        console.error('DB 업데이트 실패:', error);
        alert(`저장 중 오류가 발생했습니다: ${error.message}`);
        return;
      }

      // 수정 이후 바뀐 세션 동기화
      const updatedUser = { 
        ...currentUser, 
        is_vip: vip, 
        is_basic_only: basicOnly,
        completed_missions: completedMissions
      };
      sessionStorage.setItem('guild_user', JSON.stringify(updatedUser));
      
      alert('임무 설정이 성공적으로 반영되었습니다. 🎉');
      router.push('/list');
    } catch (e) {
      console.error(e);
      alert('처리 도중 예상치 못한 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold">로딩 중...</div>;
  }

  const isLeader = user?.role === '길드장' || user?.role === '부길드장';

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12">
      <Header />

      <div className="px-4 flex-1 space-y-6">
        {/* 길드 랭크 */}
        <div className="bg-white p-5 rounded-2xl border-2 border-amber-100 shadow-sm">
          <label className="block text-xl font-extrabold mb-3">🏅 길드 랭크 (기본값: A)</label>
          <div className="grid grid-cols-4 gap-2">
            {['A', 'B', 'C', 'D'].map((r) => (
              <label key={r} className={`flex items-center justify-center py-3 border-2 rounded-xl cursor-pointer font-black text-lg ${
                !isLeader ? 'opacity-50 cursor-not-allowed' : ''
              } ${guildRank === r ? 'bg-lime-50 border-lime-600' : 'bg-amber-50 border-amber-200'}`}>
                <input 
                  type="radio" 
                  name="guildRank" 
                  value={r} 
                  checked={guildRank === r}
                  disabled={!isLeader}
                  onChange={(e) => setGuildRank(e.target.value)}
                  className="hidden"
                />
                <span>{r} 랭크</span>
              </label>
            ))}
          </div>
        </div>

        {/* 자동 매핑 기본 임무 횟수 */}
        <div className="bg-white p-5 rounded-2xl border-2 border-amber-100 shadow-sm">
          <label className="block text-lg font-extrabold mb-1">🎯 매칭 기본 임무 횟수</label>
          <div className="p-4 bg-amber-50 rounded-xl text-center border border-amber-200">
            <span className="text-3xl font-black text-lime-700">{maxMissions}</span>
            <span className="text-lg font-bold"> 회</span>
          </div>
        </div>

        {/* 완료한 임무 횟수 직접 기입 영역 */}
        <div className="bg-white p-5 rounded-2xl border-2 border-amber-100 shadow-sm">
          <label className="block text-xl font-extrabold mb-3">⚔️ 내가 완료한 임무 개수</label>
          <div className="flex items-center gap-3 bg-amber-50/40 p-4 rounded-xl border border-amber-100">
            <input 
              type="number" 
              min="0" 
              max={maxMissions}
              value={completedMissions}
              onChange={(e) => setCompletedMissions(Number(e.target.value))}
              className="w-24 p-3 text-center text-xl font-black border-2 border-amber-200 rounded-xl focus:outline-none focus:border-lime-700 bg-white"
            />
            <span className="text-lg font-bold text-amber-900"> / {maxMissions} 회 완료함</span>
          </div>
        </div>

        {/* VIP 여부 설정 */}
        <div className="bg-white p-5 rounded-2xl border-2 border-amber-100 shadow-sm">
          <label className="block text-xl font-extrabold mb-3">⭐ VIP 여부</label>
          <div className="grid grid-cols-2 gap-3">
            {['Y', 'N'].map((v) => (
              <label key={v} className={`flex items-center justify-center py-3 border-2 rounded-xl cursor-pointer font-black text-lg ${
                vip === v ? 'bg-lime-50 border-lime-600' : 'bg-amber-50 border-amber-200'
              }`}>
                <input 
                  type="radio" 
                  name="vip" 
                  value={v} 
                  checked={vip === v}
                  onChange={(e) => setVip(e.target.value)}
                  className="mr-2 accent-lime-700"
                />
                <span>{v === 'Y' ? 'VIP 유저' : '일반'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 기본 임무 진행 여부 */}
        <div className="bg-white p-5 rounded-2xl border-2 border-amber-100 shadow-sm">
          <label className="block text-xl font-extrabold mb-3">📋 기본 임무만 진행 하시나요?</label>
          <div className="grid grid-cols-2 gap-3">
            {['Y', 'N'].map((b) => (
              <label key={b} className={`flex items-center justify-center py-3 border-2 rounded-xl cursor-pointer font-black text-lg ${
                basicOnly === b ? 'bg-lime-50 border-lime-600' : 'bg-amber-50 border-amber-200'
              }`}>
                <input 
                  type="radio" 
                  name="basicOnly" 
                  value={b} 
                  checked={basicOnly === b}
                  onChange={(e) => setBasicOnly(e.target.value)}
                  className="mr-2 accent-lime-700"
                />
                <span>{b === 'Y' ? '기본 임무만' : '추가 임무까지'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 서브밋 버튼 */}
        <div className="grid grid-cols-1 gap-3 pt-4">
          <button onClick={handleRegister} className="py-4 bg-lime-700 text-white rounded-2xl font-black text-xl hover:bg-lime-800">
            임무 정보 등록
          </button>
          {/* <button onClick={() => router.push('/list')} className="py-4 bg-amber-200 text-[#78350F] rounded-2xl font-black text-xl hover:bg-amber-300">
            홈으로
          </button> */}
        </div>
      </div>
    </div>
  );
}