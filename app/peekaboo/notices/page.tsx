'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, Edit3, X, Lock, CheckCircle2, Megaphone } from 'lucide-react';

export default function PeekabooNoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [searchWord, setSearchWord] = useState('');

  // 작성/수정 모달 관련 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [password, setPassword] = useState('');

  // 삭제용 비밀번호 확인 모달 상태
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deletePassword, setDeletePassword] = useState('');

  // 상세 보기 모달 상태
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    const { data, error } = await supabase
      .from('peekaboo_notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotices(data);
    }
  };

  // 모달 열기 (작성 또는 수정)
  const openModal = (notice: any = null) => {
    if (notice) {
      setEditingNotice(notice);
      setTitle(notice.title);
      setContent(notice.content);
    } else {
      setEditingNotice(null);
      setTitle('');
      setContent('');
    }
    setPassword('');
    setIsModalOpen(true);
  };

  // 공지사항 등록 / 수정 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }
    if (!password.trim()) {
      alert('마스터 비밀번호를 입력해주세요.');
      return;
    }

    if (editingNotice) {
      // 수정 로직 (비밀번호 검증은 서버 액션 또는 API 라우트를 통해 검증하는 것이 안전하지만, 
      // 클라이언트 단에서 마스터 비밀번호와 비교하거나 API로 전달해 처리합니다)
      const res = await fetch('/api/peekaboo/notices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingNotice.id, title, content, password }),
      });
      const result = await res.json();

      if (!res.ok) {
        alert(result.error || '수정에 실패했습니다.');
        return;
      }

      alert('공지사항이 수정되었습니다.');
    } else {
      // 등록 로직
      const res = await fetch('/api/peekaboo/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, password }),
      });
      const result = await res.json();

      if (!res.ok) {
        alert(result.error || '등록에 실패했습니다.');
        return;
      }

      alert('공지사항이 등록되었습니다.');
    }

    setIsModalOpen(false);
    fetchNotices();
  };

  // 공지사항 삭제 처리
  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;
    if (!deletePassword.trim()) {
      alert('마스터 비밀번호를 입력해주세요.');
      return;
    }

    const res = await fetch('/api/peekaboo/notices', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteTarget.id, password: deletePassword }),
    });
    const result = await res.json();

    if (!res.ok) {
      alert(result.error || '삭제에 실패했습니다.');
      return;
    }

    alert('공지사항이 삭제되었습니다.');
    setDeleteTarget(null);
    setDeletePassword('');
    fetchNotices();
  };

  // 검색 필터링
  const filteredNotices = notices.filter(
    (n) =>
      n.title.toLowerCase().includes(searchWord.toLowerCase()) ||
      n.content.toLowerCase().includes(searchWord.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-12">
      {/* 🛠️ 상단 제어 배너 */}
      <div className="bg-white p-4 rounded-2xl border-2 border-amber-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-800" />
            <span className="text-xs font-black text-amber-900">길드 공지사항</span>
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold border border-amber-200">
              총 {notices.length}개
            </span>
          </div>
          <button
            onClick={() => openModal()}
            className="bg-amber-800 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm hover:bg-amber-900 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> 공지 작성
          </button>
        </div>

        {/* 검색 바 */}
        <div className="relative">
          <input
            type="text"
            placeholder="공지사항 제목 또는 내용 검색"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            className="w-full p-2.5 pl-8 border-2 border-amber-200 rounded-xl font-bold bg-[#FDFBF7] text-xs focus:outline-none focus:border-amber-600"
          />
          <Search className="w-3.5 h-3.5 text-amber-500 absolute left-2.5 top-3.5" />
        </div>
      </div>

      {/* 📋 공지사항 리스트 */}
      <div className="space-y-2.5">
        {filteredNotices.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-amber-100 text-center text-xs font-bold text-amber-800">
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <div
              key={notice.id}
              onClick={() => setSelectedNotice(notice)}
              className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm hover:border-amber-400 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-amber-950">{notice.title}</span>
                </div>
                <span className="text-[10px] text-amber-600 font-bold">
                  {new Date(notice.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-stone-600 line-clamp-2 font-medium">
                {notice.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* 🔍 상세 보기 모달 */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FDFBF7] w-full max-w-md max-h-[85vh] rounded-3xl p-5 shadow-2xl overflow-y-auto space-y-4 border-2 border-amber-200">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-amber-600 font-bold">
                  {new Date(selectedNotice.created_at).toLocaleString()}
                </span>
                <h2 className="text-base font-black text-amber-950 mt-0.5">{selectedNotice.title}</h2>
              </div>
              <button
                onClick={() => setSelectedNotice(null)}
                className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200 min-h-[120px] text-xs font-medium text-stone-800 whitespace-pre-wrap leading-relaxed">
              {selectedNotice.content}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const target = selectedNotice;
                  setSelectedNotice(null);
                  openModal(target);
                }}
                className="flex-1 py-2.5 bg-amber-100 text-amber-900 rounded-xl text-xs font-black flex items-center justify-center gap-1 hover:bg-amber-200 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> 수정
              </button>
              <button
                onClick={() => {
                  const target = selectedNotice;
                  setSelectedNotice(null);
                  setDeleteTarget(target);
                }}
                className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center justify-center gap-1 hover:bg-red-100 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> 삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✍️ 작성 및 수정 모달 (마스터 비밀번호 입력) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 border-2 border-amber-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-amber-900">
                {editingNotice ? '✨ 공지사항 수정' : '✨새로운 공지사항 작성'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-amber-800 block mb-1">제목</label>
                <input
                  type="text"
                  placeholder="공지 제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 border border-amber-200 rounded-xl text-xs font-bold bg-amber-50/30 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-amber-800 block mb-1">내용</label>
                <textarea
                  rows={5}
                  placeholder="공지 내용을 입력하세요"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-2.5 border border-amber-200 rounded-xl text-xs font-bold bg-amber-50/30 focus:outline-none focus:border-amber-600 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-amber-800 block mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> 관리자 마스터 비밀번호
                </label>
                <input
                  type="password"
                  placeholder="설정된 마스터 비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 border border-amber-200 rounded-xl text-xs font-bold bg-amber-50/30 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-800 text-white rounded-xl text-xs font-black hover:bg-amber-900 cursor-pointer"
                >
                  {editingNotice ? '수정 완료' : '등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🗑️ 삭제 비밀번호 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 border-2 border-amber-200">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-red-600 flex items-center gap-1">
                <Lock className="w-4 h-4" /> 공지사항 삭제 확인
              </h3>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 font-medium">
              공지사항을 삭제하려면 관리자 마스터 비밀번호를 입력해주세요.
            </p>

            <form onSubmit={handleDelete} className="space-y-3">
              <input
                type="password"
                placeholder="마스터 비밀번호 입력"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full p-2.5 border border-amber-200 rounded-xl text-xs font-bold bg-amber-50/30 focus:outline-none focus:border-amber-600"
              />

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 cursor-pointer"
                >
                  삭제하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}