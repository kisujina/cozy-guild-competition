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
  
  const [completedMissions, setCompletedMissions] = useState<number | string>(0);
  const [totalMissionScore, setTotalMissionScore] = useState<number | string>(0);
  const [isDefaultMissionEnabled, setIsDefaultMissionEnabled] = useState<string>('N');
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
    fetchGuildSetting(curUser.guild_id);
    setLoading(false);
  }, []);

  const fetchMyMissionData = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('completed_missions, total_mission_score')
      .eq('id', userId)
      .single();
    if (data) {
      setCompletedMissions(data.completed_missions ?? 0);
      setTotalMissionScore(data.total_mission_score ?? 0);
    }
  };

  const fetchGuildSetting = async (guildId: number) => {
    const { data } = await supabase
      .from('guild_settings')
      .select('guild_rank, is_default_mission_enabled')
      .eq('id', guildId)
      .maybeSingle();
      
    if (data) {
      if (data.guild_rank) setGuildRank(data.guild_rank);
      if (data.is_default_mission_enabled) setIsDefaultMissionEnabled(data.is_default_mission_enabled);
    }
  };

  const getMissionCount = (rank: string) => {
    const mapping: Record<string, number> = { A: 18, B: 16, C: 14, D: 12 };
    return mapping[rank] || 18;
  };

  const maxMissions = getMissionCount(guildRank);
  const maxLimitCount = basicOnly === 'Y' ? maxMissions : maxMissions + 6;

  // 완료한 임무 횟수 증감 핸들러 (최대치 제한)
  const handleMissionChange = (delta: number) => {
    setCompletedMissions((prev) => {
      const current = prev === '' ? 0 : Number(prev);
      const next = current + delta;
      if (next < 0) return 0;
      if (next > maxLimitCount) return maxLimitCount;
      return next;
    });
  };

  const handleRegister = async () => {
    const session = sessionStorage.getItem('guild_user');
    const currentUser = user || (session ? JSON.parse(session) : null);

    if (!currentUser) {
      alert('로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.');
      router.push('/');
      return;
    }

    const finalCompletedMissions = completedMissions === '' ? 0 : Number(completedMissions);
    const finalScore = totalMissionScore === '' ? 0 : Number(totalMissionScore);

    if (finalCompletedMissions < 0 || finalCompletedMissions > maxLimitCount) {
      alert(`완료한 임무 횟수는 0회에서 ${maxLimitCount}회 사이여야 합니다.`);
      return;
    }

    try {
      const isLeader = currentUser.role === '길드장' || currentUser.role === '부길드장';
      if (isLeader) {
        await supabase
          .from('guild_settings')
          .update({ guild_rank: guildRank })
          .eq('id', currentUser.guild_id);
      }

      const updatePayload: any = {
        is_vip: vip,
        is_basic_only: basicOnly,
        completed_missions: finalCompletedMissions,
      };

      if (isDefaultMissionEnabled === 'Y') {
        updatePayload.total_mission_score = finalScore;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
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
        completed_missions: finalCompletedMissions,
        ...(isDefaultMissionEnabled === 'Y' && { total_mission_score: finalScore })
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
    return <div className="h-screen bg-[#FDFBF7] flex items-center justify-center font-bold text-xs">로딩 중...</div>;
  }

  return (
    <div className="h-screen max-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col overflow-hidden box-border">
      <Header />
      
      <div className="px-3 pt-1.5 shrink-0">
        <p className="p-2 text-[11px] font-bold text-red-600 bg-red-50 rounded-xl border border-red-100 leading-tight text-center">
          ⚠️ 경쟁전 임무 삭제 시 필수 정보이므로 정확히 입력해 주세요.
        </p>
      </div>

      <div className="px-3 flex-1 flex flex-col justify-between py-2 overflow-hidden box-border">
        <div className="space-y-2.5">
          {/* VIP 여부 설정 */}
          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
            <label className="block text-xs font-extrabold mb-1.5 text-amber-900">⭐ VIP 여부</label>
            <div className="grid grid-cols-2 gap-1.5">
              {['Y', 'N'].map((v) => (
                <label key={v} className={`flex items-center justify-center py-2 border rounded-lg cursor-pointer font-bold text-xs transition-colors ${
                  vip === v ? 'bg-lime-50 border-lime-600 text-lime-900' : 'bg-amber-50/40 border-amber-200 text-amber-800'
                }`}>
                  <input 
                    type="radio" 
                    name="vip" 
                    value={v} 
                    checked={vip === v}
                    onChange={(e) => setVip(e.target.value)}
                    className="mr-1.5 accent-lime-700 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>{v === 'Y' ? 'VIP 유저' : '일반'}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* 기본 임무 진행 여부 */}
          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
            <label className="block text-xs font-extrabold mb-1.5 text-amber-900">📋 기본 임무({maxMissions}회)만 진행 하시나요?</label>
            <div className="grid grid-cols-2 gap-1.5">
              {['Y', 'N'].map((b) => (
                <label key={b} className={`flex items-center justify-center py-2 border rounded-lg cursor-pointer font-bold text-xs transition-colors ${
                  basicOnly === b ? 'bg-lime-50 border-lime-600 text-lime-900' : 'bg-amber-50/40 border-amber-200 text-amber-800'
                }`}>
                  <input 
                    type="radio" 
                    name="basicOnly" 
                    value={b} 
                    checked={basicOnly === b}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBasicOnly(val);
                      const newMax = val === 'Y' ? maxMissions : maxMissions + 6;
                      const curNum = completedMissions === '' ? 0 : Number(completedMissions);
                      if (curNum > newMax) setCompletedMissions(newMax);
                    }}
                    className="mr-1.5 accent-lime-700 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>{b === 'Y' ? '기본 임무만' : '추가 임무까지'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 완료한 임무 횟수 (- / + 버튼 포함) */}
          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-extrabold text-amber-900">⚔️ 내가 완료한 임무 횟수</label>
              <span className="text-[10px] font-bold text-amber-700">최대 {maxLimitCount}회</span>
            </div>
            <div className="flex items-center justify-between bg-amber-50/60 p-2 rounded-lg border border-amber-200">
              <span className="text-xs font-bold text-amber-900">총 횟수 입력</span>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button" 
                  onClick={() => handleMissionChange(-1)}
                  className="w-7 h-7 bg-amber-200 text-amber-900 rounded-lg font-black text-sm flex items-center justify-center hover:bg-amber-300 transition-colors cursor-pointer shadow-xs"
                >
                  -
                </button>
                <input 
                  type="number" 
                  min="0" 
                  max={maxLimitCount}
                  value={completedMissions === 0 ? '' : completedMissions}
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    if (rawVal === '') {
                      setCompletedMissions('');
                    } else {
                      const parsed = parseInt(rawVal, 10);
                      if (!isNaN(parsed)) {
                        if (parsed > maxLimitCount) setCompletedMissions(maxLimitCount);
                        else setCompletedMissions(Math.max(0, parsed));
                      }
                    }
                  }}
                  className="w-14 p-1 text-center text-sm font-black border border-amber-300 rounded-lg focus:outline-none focus:border-lime-700 bg-white"
                  placeholder="0"
                />
                <button 
                  type="button" 
                  onClick={() => handleMissionChange(1)}
                  className="w-7 h-7 bg-amber-600 text-white rounded-lg font-black text-sm flex items-center justify-center hover:bg-amber-700 transition-colors cursor-pointer shadow-xs"
                >
                  +
                </button>
                <span className="text-xs font-extrabold text-amber-900 ml-0.5">회</span>
              </div>
            </div>
          </div>

          {/* is_default_mission_enabled가 Y일 경우에만 노출되는 임무 총 점수 필드 */}
          {isDefaultMissionEnabled === 'Y' && (
            <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
              <label className="block text-xs font-extrabold mb-1.5 text-amber-900">🎯 현재 나의 임무 총 점수</label>
              <div className="flex items-center justify-between bg-amber-50/60 p-2 rounded-lg border border-amber-200">
                <span className="text-xs font-bold text-amber-900">점수 입력</span>
                <input 
                  type="number" 
                  min="0"
                  value={totalMissionScore === 0 ? '' : totalMissionScore}
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    if (rawVal === '') {
                      setTotalMissionScore('');
                    } else {
                      const parsed = parseInt(rawVal, 10);
                      setTotalMissionScore(isNaN(parsed) ? '' : Math.max(0, parsed));
                    }
                  }}
                  className="w-24 p-1 text-center text-sm font-black border border-amber-300 rounded-lg focus:outline-none focus:border-lime-700 bg-white"
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </div>

        {/* 서브밋 버튼 */}
        <div className="pb-1 pt-2 shrink-0">
          <button 
            onClick={handleRegister} 
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-black text-sm hover:bg-blue-600 transition-colors shadow-sm cursor-pointer"
          >
            임무 정보 수정 완료
          </button>
        </div>
      </div>
    </div>
  );
}