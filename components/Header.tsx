'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, LogOut, Settings, X, Trash2, AlertTriangle, ShieldCheck, Award, Hash } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // 길드 정보 수정 팝업 관련 상태
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [guildName, setGuildName] = useState('');
  const [guildRank, setGuildRank] = useState('A');
  
  // 임무 점수 커트라인 및 기본 점수 상태 추가 (숫자 또는 빈 문자열 허용)
  const [isDefaultMissionEnabled, setIsDefaultMissionEnabled] = useState<'Y' | 'N'>('N');
  const [defaultMissionScore, setDefaultMissionScore] = useState<number | string>(0);

  const [editError, setEditError] = useState('');
  const [guildInfo, setGuildInfo] = useState<any>(null);

  useEffect(() => {
    const session = sessionStorage.getItem('guild_user');
    if (session) {
      const parsedUser = JSON.parse(session);
      setUser(parsedUser);
      fetchGuildDetails(parsedUser.guild_id);
    }
  }, []);

  // 현재 유저가 속한 길드 정보 불러오기
  const fetchGuildDetails = async (guildId: number) => {
    const { data, error } = await supabase
      .from('guild_settings')
      .select('*')
      .eq('id', guildId)
      .maybeSingle();

    if (data && !error) {
      setGuildInfo(data);
      setGuildName(data.guild_name);
      setGuildRank(data.guild_rank || 'A');
      if (data.is_default_mission_enabled) {
        setIsDefaultMissionEnabled(data.is_default_mission_enabled);
      }
      if (data.default_mission_score !== null && data.default_mission_score !== undefined) {
        setDefaultMissionScore(data.default_mission_score);
      }
    }
  };

  // 길드 정보 수정 저장 핸들러
  const handleUpdateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!guildName.trim()) {
      setEditError('길드명을 입력해 주세요.');
      return;
    }

    // 길드명 중복 체크 (다른 길드가 이미 사용 중인지 확인)
    const { data: duplicateCheck } = await supabase
      .from('guild_settings')
      .select('id')
      .eq('guild_name', guildName.trim())
      .neq('id', user.guild_id)
      .maybeSingle();

    if (duplicateCheck) {
      setEditError('이미 존재하는 길드명입니다.');
      return;
    }

    const finalDefaultScore = defaultMissionScore === '' ? 0 : Number(defaultMissionScore);

    // DB 업데이트 실행 (임무 점수 관련 컬럼 포함)
    const { error: updateError } = await supabase
      .from('guild_settings')
      .update({ 
        guild_name: guildName.trim(), 
        guild_rank: guildRank,
        is_default_mission_enabled: isDefaultMissionEnabled,
        default_mission_score: isDefaultMissionEnabled === 'Y' ? finalDefaultScore : 0
      })
      .eq('id', user.guild_id);

    if (updateError) {
      setEditError(`수정 중 오류 발생: ${updateError.message}`);
      return;
    }

    alert('길드 정보가 성공적으로 수정되었습니다!');
    setIsEditOpen(false);
    fetchGuildDetails(user.guild_id);

    // ⬇️ 이벤트를 발생시켜 ListPage 등 다른 컴포넌트가 즉시 최신 설정을 불러오도록 합니다.
    window.dispatchEvent(new Event('guildSettingsUpdated'));
  };

  // 길드 및 길드원 전체 삭제 핸들러
  const handleDeleteGuild = async () => {
    if (!window.confirm('정말 길드를 삭제하시겠습니까? 소속된 모든 길드원 정보와 길드가 완전히 삭제되며 복구할 수 없습니다.')) {
      return;
    }

    // 1. 해당 길드의 모든 길드원(profiles) 먼저 삭제
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('guild_id', user.guild_id);

    if (profileDeleteError) {
      alert(`길드원 삭제 중 오류 발생: ${profileDeleteError.message}`);
      return;
    }

    // 2. 길드(guild_settings) 삭제
    const { error: guildDeleteError } = await supabase
      .from('guild_settings')
      .delete()
      .eq('id', user.guild_id);

    if (guildDeleteError) {
      alert(`길드 삭제 중 오류 발생: ${guildDeleteError.message}`);
      return;
    }

    alert('길드가 성공적으로 삭제되었습니다.');
    sessionStorage.removeItem('guild_user');
    router.push('/');
  };

  return (
    <div className="w-full bg-[#4D7C0F] text-white p-5 rounded-b-2xl shadow-md border-b-4 border-amber-900/20 mb-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-black tracking-wide">🌿 {guildInfo?.guild_name || '🌸경진당🌸'}🌸</h1>
        
        <div className="flex items-center gap-2">
          {/* 길드장인 경우에만 노출되는 길드 정보 수정 버튼 */}
          {user && user.role === '길드장' && (
            <button 
              onClick={() => setIsEditOpen(true)}
              className="flex flex-col items-center justify-center px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-2xl shadow-md border-2 border-amber-300 transition-all cursor-pointer animate-pulse"
              title="길드 정보 수정"
            >
              <Settings className="w-5 h-5 text-amber-100 drop-shadow-sm mb-0.5" />
              <span className="text-[11px] font-black tracking-tighter leading-none text-white drop-shadow-sm">길드</span>
            </button>
          )}

          {/* 홈버튼 디자인 */}
          <button 
            onClick={() => router.push('/list')} 
            className="flex flex-col items-center justify-center px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-white rounded-2xl shadow-md border-2 border-amber-300 transition-all cursor-pointer"
            title="홈으로"
          >
            <Home className="w-5 h-5 text-amber-100 drop-shadow-sm mb-0.5" />
            <span className="text-[11px] font-black tracking-tighter leading-none text-white drop-shadow-sm">홈으로</span>
          </button>
        </div>
      </div>
      
      {user && (
        <div className="mt-4 flex items-center justify-between text-base font-bold opacity-90 bg-[#3f660c] px-3 py-1.5 rounded-lg">
          <span>직급: <span className="text-amber-200">{user.role}</span></span>
          <span>닉네임: <span className="text-amber-200">{user.nickname}</span></span>
          {/* 나가기 버튼 */}
          <button 
            onClick={() => router.push('/')}
            title="로그아웃"
            className="hover:scale-110 transition-transform cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-amber-100 drop-shadow-sm mb-0.5" />
          </button>
        </div>
      )}

      {/* 길드 정보 수정 및 삭제 모달 팝업 */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white text-amber-900 rounded-3xl shadow-2xl border-4 border-lime-600/30 p-6 w-full max-w-sm relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-amber-800 hover:text-red-500 transition-colors p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-5">
              <h2 className="text-2xl font-black text-[#4D7C0F]">⚙️ 길드 정보 수정</h2>
              <p className="text-xs font-bold text-amber-700/80 mt-1">길드 이름, 랭크 및 임무 설정을 관리하세요.</p>
            </div>

            <form onSubmit={handleUpdateGuild} className="space-y-4">
              {/* 기본 정보 카드 박스 */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-lime-700" />
                    길드명
                  </label>
                  <input 
                    type="text" 
                    value={guildName}
                    onChange={(e) => setGuildName(e.target.value)}
                    className="w-full p-3 border-2 border-amber-200 rounded-xl text-sm font-bold focus:outline-none focus:border-lime-700 bg-white shadow-xs"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 mb-1.5">
                    <Award className="w-4 h-4 text-lime-700" />
                    길드 랭크
                  </label>
                  <select 
                    value={guildRank}
                    onChange={(e) => setGuildRank(e.target.value)}
                    className="w-full p-3 border-2 border-amber-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:border-lime-700 shadow-xs cursor-pointer"
                  >
                    <option value="A">A 랭크</option>
                    <option value="B">B 랭크</option>
                    <option value="C">C 랭크</option>
                    <option value="D">D 랭크</option>
                  </select>
                </div>
              </div>

              {/* 임무 점수 커트라인 설정 카드 박스 */}
              <div className="bg-lime-50/50 p-4 rounded-2xl border border-lime-200/60 space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 mb-2">
                    <Hash className="w-4 h-4 text-lime-700" />
                    임무 점수 커트라인 설정
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 font-bold text-xs cursor-pointer transition-all ${
                      isDefaultMissionEnabled === 'N' 
                        ? 'bg-white border-lime-700 text-lime-900 shadow-xs' 
                        : 'bg-white/50 border-amber-200 text-amber-800'
                    }`}>
                      <input 
                        type="radio" 
                        name="isDefaultMissionEnabled" 
                        value="N"
                        checked={isDefaultMissionEnabled === 'N'}
                        onChange={() => setIsDefaultMissionEnabled('N')}
                        className="accent-lime-700 cursor-pointer"
                      />
                      미설정 (N)
                    </label>

                    <label className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 font-bold text-xs cursor-pointer transition-all ${
                      isDefaultMissionEnabled === 'Y' 
                        ? 'bg-white border-lime-700 text-lime-900 shadow-xs' 
                        : 'bg-white/50 border-amber-200 text-amber-800'
                    }`}>
                      <input 
                        type="radio" 
                        name="isDefaultMissionEnabled" 
                        value="Y"
                        checked={isDefaultMissionEnabled === 'Y'}
                        onChange={() => setIsDefaultMissionEnabled('Y')}
                        className="accent-lime-700 cursor-pointer"
                      />
                      설정 (Y)
                    </label>
                  </div>
                </div>

                {/* '설정(Y)' 선택 시 노출되는 숫자 전용 텍스트 박스 */}
                {isDefaultMissionEnabled === 'Y' && (
                  <div className="pt-1 animate-fadeIn">
                    <label className="block text-xs font-bold text-amber-900 mb-1.5">기본 임무 점수</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="0"
                      value={defaultMissionScore === 0 ? '' : defaultMissionScore}
                      onChange={(e) => {
                        const rawVal = e.target.value;
                        if (rawVal === '') {
                          setDefaultMissionScore('');
                        } else {
                          const parsed = parseInt(rawVal, 10);
                          setDefaultMissionScore(isNaN(parsed) ? '' : Math.max(0, parsed));
                        }
                      }}
                      className="w-full p-3 border-2 border-lime-300 rounded-xl text-sm font-bold focus:outline-none focus:border-lime-700 bg-white shadow-xs"
                    />
                  </div>
                )}
              </div>

              {editError && <p className="text-red-500 text-xs font-extrabold text-center bg-red-50 p-2.5 rounded-xl border border-red-200">{editError}</p>}

              <button 
                type="submit" 
                className="w-full py-3.5 bg-lime-700 text-white rounded-2xl font-black text-base hover:bg-lime-800 shadow-md transition-all cursor-pointer active:scale-98"
              >
                수정 완료
              </button>
            </form>

            <div className="mt-5 pt-4 border-t-2 border-amber-100 flex flex-col items-center">
              <div className="flex items-center gap-1 text-[11px] font-bold text-red-600 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>위험 구역: 길드 삭제 시 모든 데이터가 소멸됩니다.</span>
              </div>
              <button 
                type="button"
                onClick={handleDeleteGuild}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>길드 및 길드원 전체 삭제하기</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}