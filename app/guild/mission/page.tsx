'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';

export default function MissionSettingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [guildRank, setGuildRank] = useState('A'); 
  const [vip, setVip] = useState('N');
  const [basicOnly, setBasicOnly] = useState('Y');
  
  const [completedMissions, setCompletedMissions] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = sessionStorage.getItem('guild_user');
    if (!session) {
      router.push('/');
      return;
    }
    const curUser = JSON.parse(session);
    setUser(curUser);
    
    setVip(curUser.is_vip === true || curUser.is_vip === 'Y' ? 'Y' : 'N');
    setBasicOnly(curUser.is_basic_only === true || curUser.is_basic_only === 'Y' ? 'Y' : 'N');
    
    fetchMyMissionData(curUser.id);
    fetchGuildSetting();
    setLoading(false);
  }, []);

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
    const session = sessionStorage.getItem('guild_user');
    const currentUser = user || (session ? JSON.parse(session) : null);

    if (!currentUser) {
      alert('로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.');
      router.push('/');
      return;
    }

    if (completedMissions < 0) {
      alert('완료한 임무 개수는 0개 이상이어야 합니다.');
      return;
    }
    
    const limitCount = basicOnly === 'Y' ? maxMissions : maxMissions + 6;
    if (completedMissions > limitCount) {
      alert(`선택하신 임무 조건의 최대 횟수(${limitCount}회)를 초과하여 등록할 수 없습니다.`);
      return;
    }

    try {
      const isLeader = currentUser.role === '길드장' || currentUser.role === '부길드장';
      if (isLeader) {
        await supabase.from('guild_settings').update({ guild_rank: guildRank }).eq('id', 1);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          is_vip: vip,
          is_basic_only: basicOnly,
          completed_missions: completedMissions,
        })
        .eq('id', currentUser.id);

      if (error) {
        console.error('DB 업데이트 실패:', error);
        alert(`저장 중 오류가 발생했습니다: ${error.message}`);
        return;
      }

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
    return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-sm">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col pb-12 overflow-x-hidden box-border">
      <Header />
      
      <div className="px-4 pt-2">
        <p className="p-2 text-xs font-bold text-red-500 bg-red-50 rounded-xl border border-red-100 mb-4">
          ※ 임무 삭제 시 필수 정보이니, 꼭 입력 부탁드립니다.
        </p>
      </div>

      <div className="px-4 flex-1 space-y-4 w-full box-border">
        {/* VIP 여부 설정 */}
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm">
          <label className="block text-base font-extrabold mb-2.5">⭐ VIP 여부</label>
          <div className="grid grid-cols-2 gap-2">
            {['Y', 'N'].map((v) => (
              <label key={v} className={`flex items-center justify-center py-3 border-2 rounded-xl cursor-pointer font-bold text-base transition-colors ${
                vip === v ? 'bg-lime-50 border-lime-600 text-lime-900' : 'bg-amber-50/50 border-amber-200 text-amber-800'
              }`}>
                <input 
                  type="radio" 
                  name="vip" 
                  value={v} 
                  checked={vip === v}
                  onChange={(e) => setVip(e.target.value)}
                  className="mr-2 accent-lime-700 w-4 h-4"
                />
                <span>{v === 'Y' ? 'VIP 유저' : '일반'}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* 기본 임무 진행 여부 */}
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm">
          <label className="block text-base font-extrabold mb-2.5">📋 기본 임무({maxMissions}회)만 진행 하나요?</label>
          <div className="grid grid-cols-2 gap-2">
            {['Y', 'N'].map((b) => (
              <label key={b} className={`flex items-center justify-center py-3 border-2 rounded-xl cursor-pointer font-bold text-base transition-colors ${
                basicOnly === b ? 'bg-lime-50 border-lime-600 text-lime-900' : 'bg-amber-50/50 border-amber-200 text-amber-800'
              }`}>
                <input 
                  type="radio" 
                  name="basicOnly" 
                  value={b} 
                  checked={basicOnly === b}
                  onChange={(e) => setBasicOnly(e.target.value)}
                  className="mr-2 accent-lime-700 w-4 h-4"
                />
                <span>{b === 'Y' ? '기본 임무만' : '추가 임무까지'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 완료한 임무 횟수 직접 기입 영역 */}
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm">
          <label className="block text-base font-extrabold mb-2.5">⚔️ 내가 완료한 임무 개수</label>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
            <span className="text-sm font-bold text-amber-900">
              총 {basicOnly === 'Y' ? maxMissions : maxMissions + 6}회 중
            </span>
            <div className="flex items-center gap-1.5">
              <input 
                type="number" 
                min="0" 
                max={basicOnly === 'Y' ? maxMissions : maxMissions + 6}
                value={completedMissions}
                onChange={(e) => setCompletedMissions(Number(e.target.value))}
                className="w-20 p-2 text-center text-lg font-black border-2 border-amber-300 rounded-xl focus:outline-none focus:border-lime-700 bg-white"
              />
              <span className="text-sm font-extrabold text-amber-900">회 완료</span>
            </div>
          </div>
        </div>

        {/* 서브밋 버튼 */}
        <div className="pt-2">
          <button onClick={handleRegister} className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black text-lg hover:bg-blue-600 transition-colors shadow-sm">
            임무 정보 수정 완료
          </button>
        </div>
      </div>
    </div>
  );
}