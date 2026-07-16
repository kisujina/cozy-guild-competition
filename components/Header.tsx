'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react'; // Home 아이콘 추가

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const session = sessionStorage.getItem('guild_user');
    if (session) {
      setUser(JSON.parse(session));
    }
  }, []);

  return (
    <div className="w-full bg-[#4D7C0F] text-white p-5 rounded-b-2xl shadow-md border-b-4 border-amber-900/20 mb-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black tracking-wide">🌿 비옥한 땅</h1>
        <button 
          onClick={() => router.push('/list')} 
          className="p-2 bg-[#3f660c] rounded-xl hover:bg-[#33550a] transition-all"
          title="홈으로"
        >
          <Home className="w-6 h-6 text-amber-200" />
        </button>
      </div>
      
      {user && (
        <div className="mt-4 flex items-center justify-between text-base font-bold opacity-90 bg-[#3f660c] px-3 py-1.5 rounded-lg">
          <span>직급: <span className="text-amber-200">{user.role}</span></span>
          <span>닉네임: <span className="text-amber-200">{user.nickname}</span></span>
        </div>
      )}
    </div>
  );
}