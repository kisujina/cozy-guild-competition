'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MessageCircle, PlusCircle, X } from 'lucide-react';

export default function LoginPage() {
  const [guildName, setGuildName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('멤버');
  const [error, setError] = useState('');
  
  // 길드명 추천/힌트 관련 상태
  const [suggestedGuilds, setSuggestedGuilds] = useState<any[]>([]);

  // 길드 등록 팝업 상태
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildRank, setNewGuildRank] = useState('A');
  const [adminNickname, setAdminNickname] = useState('');
  const [registerError, setRegisterError] = useState('');

  const router = useRouter();

  // ⭐ [추가됨] 까꿍 전용 도메인으로 접속했을 때 /peekaboo로 자동 리다이렉트
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host;
      if (host.includes('cozy-guild-peekaboo')) {
        router.replace('/peekaboo');
      }
    }
  }, [router]);

  // 닉네임 유효성 검사 함수 (특수문자 금지, 완성된 한글 + 자음/모음 + 영문 + 숫자 + 중간 띄어쓰기 허용)
  const isValidNickname = (name: string) => {
    const regex = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s]+$/;
    return regex.test(name);
  };

  // 사용자가 길드명을 입력할 때마다 유사한 길드 조회 (힌트 제공)
  useEffect(() => {
    const fetchGuildHints = async () => {
      if (!guildName.trim()) {
        setSuggestedGuilds([]);
        return;
      }

      const searchKeyword = guildName.trim();
      const { data } = await supabase
        .from('guild_settings')
        .select('guild_name')
        .ilike('guild_name', `%${searchKeyword}%`)
        .limit(5);

      if (data && data.length > 0) {
        const exactMatch = data.some(g => g.guild_name === searchKeyword);
        if (exactMatch && data.length === 1) {
          setSuggestedGuilds([]);
        } else {
          setSuggestedGuilds(data);
        }
      } else {
        setSuggestedGuilds([]);
      }
    };

    const timer = setTimeout(() => {
      fetchGuildHints();
    }, 200);

    return () => clearTimeout(timer);
  }, [guildName]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!guildName.trim()) {
      setError('길드명을 입력해 주세요.');
      return;
    }
    if (!nickname.trim()) {
      setError('닉네임을 입력해 주세요.');
      return;
    }

    if (!isValidNickname(nickname)) {
      setError('닉네임에 특수문자는 사용할 수 없습니다!(한글, 자음/모음, 영어, 숫자, 띄어쓰기만 가능)');
      return;
    }

    const { data: guildData, error: guildError } = await supabase
      .from('guild_settings')
      .select('*')
      .eq('guild_name', guildName.trim())
      .maybeSingle();

    if (guildError || !guildData) {
      setError('존재하지 않는 길드명입니다. 길드명 입력 시 아래 뜨는 추천 힌트를 확인하거나, 맨 아래 [길드 등록하기]를 이용해 주세요.');
      return;
    }

    const { data: user, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .eq('guild_id', guildData.id)
      .eq('nickname', nickname.trim())
      .maybeSingle();

    if (dbError || !user) {
      setError('해당 길드에 일치하는 닉네임 데이터가 없습니다. 다시 확인해 주세요.');
      return;
    }

    if (user.role !== role) {
      setError(`입력하신 닉네임의 실제 직급은 [${user.role}]입니다. 직급을 올바르게 선택해 주세요.`);
      return;
    }

    sessionStorage.setItem('guild_user', JSON.stringify(user));
    router.push('/list');
  };

  const handleRegisterGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (!newGuildName.trim()) {
      setRegisterError('등록할 길드명을 입력해 주세요.');
      return;
    }
    if (!adminNickname.trim()) {
      setRegisterError('길드장 닉네임을 입력해 주세요.');
      return;
    }

    if (!isValidNickname(adminNickname)) {
      setRegisterError('닉네임에 특수문자는 사용할 수 없습니다!(한글, 자음/모음, 영어, 숫자, 띄어쓰기만 가능)');
      return;
    }

    const { data: existingGuild } = await supabase
      .from('guild_settings')
      .select('*')
      .eq('guild_name', newGuildName.trim())
      .maybeSingle();

    if (existingGuild) {
      setRegisterError('이미 존재하는 길드명입니다.');
      return;
    }

    const { data: newGuild, error: guildInsertError } = await supabase
      .from('guild_settings')
      .insert([{ 
        guild_name: newGuildName.trim(), 
        guild_rank: newGuildRank,
        is_default_mission_enabled: 'N',
        default_mission_score: 0
      }])
      .select()
      .single();

    if (guildInsertError || !newGuild) {
      console.error(guildInsertError);
      setRegisterError('길드 생성 중 오류가 발생했습니다.');
      return;
    }

    const { error: profileInsertError } = await supabase
      .from('profiles')
      .insert([{
        guild_id: newGuild.id,
        nickname: adminNickname.trim(),
        role: '길드장',
        is_basic_only: 'N',
        is_vip: 'Y',
        completed_missions: 0,
        total_mission_score: 0
      }]);

    if (profileInsertError) {
      console.error(profileInsertError);
      setRegisterError('길드장 계정 생성 중 오류가 발생했습니다.');
      return;
    }

    alert(`[${newGuildName.trim()}] 길드가 성공적으로 등록되었습니다! 생성된 길드명과 닉네임으로 로그인해 주세요.`);
    setIsRegisterOpen(false);
    setGuildName(newGuildName.trim());
    setNewGuildName('');
    setAdminNickname('');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#78350F] max-w-md mx-auto flex flex-col justify-center items-center p-4 overflow-x-hidden box-border relative">
      
      {/* 상단 우측 오픈 카카오톡 문의 버튼 */}
      <div className="absolute top-4 right-4">
        <a 
          href="https://open.kakao.com/o/svKuCxFi" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border-2 border-amber-200 text-xs font-black text-amber-800 hover:bg-amber-50 shadow-sm transition-all"
          title="개발자에게 문의하기"
        >
          <MessageCircle className="w-4 h-4 text-lime-700" />
          <span>문의</span>
        </a>
      </div>

      <div className="w-full bg-white rounded-3xl shadow-xl border-4 border-lime-600/20 p-6 box-border mt-8">
        <h1 className="text-3xl font-black text-center text-[#4D7C0F] mb-1">🌸경진당🌸</h1>
        <p className="text-center text-xs font-bold text-amber-800 mb-6">🔥경쟁전에 진심인 당신의 도우미 v1.1</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-extrabold mb-1">✒️길드명</label>
            <input 
              type="text" 
              placeholder="길드명을 입력해 주세요"
              value={guildName} 
              onChange={(e) => setGuildName(e.target.value)}
              className="w-full p-3.5 bg-white border-2 border-amber-200 rounded-2xl text-amber-900 font-black text-center text-base focus:border-lime-700 focus:outline-none"
              autoComplete="off"
            />

            {suggestedGuilds.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-amber-200 rounded-2xl shadow-lg z-20 overflow-hidden">
                <p className="px-3 py-1.5 text-[10px] font-black text-amber-700 bg-amber-50 border-b border-amber-100">
                  💡 혹시 이 길드를 찾으시나요?
                </p>
                {suggestedGuilds.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setGuildName(g.guild_name);
                      setSuggestedGuilds([]);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-lime-50 transition-colors border-b border-amber-50 last:border-b-0"
                  >
                    ✨ {g.guild_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-extrabold mb-1">✨직위 선택</label>
            <div className="grid grid-cols-5 gap-1 bg-amber-50 p-1.5 rounded-2xl border-2 border-amber-200">
              {['길드장', '부길드장', '임원', '정예', '멤버'].map((r) => (
                <label key={r} className={`flex flex-col items-center py-2 px-0.5 cursor-pointer rounded-xl text-xs font-black gap-1 transition-colors ${
                  role === r ? 'bg-lime-100 text-lime-900' : 'text-amber-900'
                }`}>
                  <input 
                    type="radio" 
                    name="role" 
                    value={r} 
                    checked={role === r} 
                    onChange={(e) => setRole(e.target.value)}
                    className="accent-lime-700 w-3.5 h-3.5"
                  />
                  <span className="text-[11px]">{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-extrabold mb-1">⭐닉네임</label>
            <input 
              type="text" 
              placeholder="닉네임을 정확히 입력해 주세요" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full p-3.5 border-2 border-amber-200 rounded-2xl focus:border-lime-700 focus:outline-none text-base text-center font-bold bg-white"
            />
          </div>

          {error && <p className="text-red-500 text-xs font-extrabold text-center bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}

          <button type="submit" className="w-full py-4 bg-lime-700 text-white rounded-2xl font-black text-xl hover:bg-lime-800 shadow-md transition-all">
            입장하기
          </button>
        </form>

        <div className="mt-4 text-center">
          <button 
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-700 hover:text-lime-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>우리 길드가 없다면? 길드 등록하기🔥</span>
          </button>
        </div>
      </div>

      {isRegisterOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl border-4 border-lime-600/30 p-6 w-full max-w-sm relative animate-fadeIn">
            <button 
              onClick={() => setIsRegisterOpen(false)}
              className="absolute top-4 right-4 text-amber-800 hover:text-red-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-black text-[#4D7C0F] mb-1 text-center">🏰 새 길드 등록</h2>
            <p className="text-center text-xs font-bold text-amber-800 mb-4">길드 정보를 입력하여 새 공간을 만드세요.</p>

            <form onSubmit={handleRegisterGuild} className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold mb-1">길드명</label>
                <input 
                  type="text" 
                  placeholder="등록할 길드명 입력"
                  value={newGuildName}
                  onChange={(e) => setNewGuildName(e.target.value)}
                  className="w-full p-3 border-2 border-amber-200 rounded-xl text-sm font-bold focus:outline-none focus:border-lime-700"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold mb-1">길드 랭크 (기본)</label>
                <select 
                  value={newGuildRank}
                  onChange={(e) => setNewGuildRank(e.target.value)}
                  className="w-full p-3 border-2 border-amber-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:border-lime-700"
                >
                  <option value="A">A 랭크</option>
                  <option value="B">B 랭크</option>
                  <option value="C">C 랭크</option>
                  <option value="D">D 랭크</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold mb-1">길드장 닉네임</label>
                <input 
                  type="text" 
                  placeholder="대표(길드장) 닉네임 입력"
                  value={adminNickname}
                  onChange={(e) => setAdminNickname(e.target.value)}
                  className="w-full p-3 border-2 border-amber-200 rounded-xl text-sm font-bold focus:outline-none focus:border-lime-700"
                />
              </div>

              {registerError && <p className="text-red-500 text-xs font-extrabold text-center bg-red-50 p-2 rounded-xl border border-red-200">{registerError}</p>}

              <button 
                type="submit" 
                className="w-full py-3.5 bg-lime-700 text-white rounded-xl font-black text-base hover:bg-lime-800 shadow-md transition-all mt-2"
              >
                길드 등록 완료
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}