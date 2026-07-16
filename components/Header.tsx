'use client';
import { useEffect, useState } from 'react';

export default function Header() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const session = sessionStorage.getItem('guild_user');
    if (session) {
      setUser(JSON.parse(session));
    }
  }, []);

  return (
    <div className="w-full bg-[#4D7C0F] text-white p-5 rounded-b-2xl shadow-md border-b-4 border-amber-900/20 mb-6">
      <h1 className="text-3xl font-black tracking-wide">🌿 비옥한 땅</h1>
      {user && (
        <div className="mt-2 flex items-center justify-between text-base font-bold opacity-90 bg-[#3f660c] px-3 py-1.5 rounded-lg">
          <span>직급: <span className="text-amber-200">{user.role}</span></span>
          <span>닉네임: <span className="text-amber-200">{user.nickname}</span></span>
        </div>
      )}
    </div>
  );
}