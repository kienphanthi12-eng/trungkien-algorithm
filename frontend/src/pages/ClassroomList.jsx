import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { getClassrooms, createClassroom } from '../services/api';
import logo from '../assets/logo.png';

export default function ClassroomList() {
  const { user, token } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal state
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    setLoading(true);
    try {
      const data = await getClassrooms(token);
      setClassrooms(data.classrooms || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createClassroom(token, { name: newName, description: newDesc });
      setNewName('');
      setNewDesc('');
      setShowModal(false);
      loadClassrooms();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="p-2 bg-white rounded-xl shadow-sm border border-white/40">
                <img src={logo} alt="ZENTUS" className="h-10 w-auto" />
              </Link>
              <div>
                <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 uppercase">
                  Quản lý Lớp học
                </span>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">ZENTUS EDUCATION</p>
              </div>
            </div>
            {user?.role === 'teacher' && (
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 hover:scale-105 transition-all"
              >
                + Tạo lớp mới
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-slate-500 font-medium">Đang tải danh sách lớp học...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center">
            <p className="text-red-600 font-bold mb-4">{error}</p>
            <button onClick={loadClassrooms} className="text-blue-600 font-bold hover:underline">Thử lại</button>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-20 text-center">
            <div className="text-6xl mb-6">🏫</div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Chưa có lớp học nào</h2>
            <p className="text-slate-500 mb-8">Hãy tạo lớp học đầu tiên để bắt đầu giao bài tập cho học sinh.</p>
            {user?.role === 'teacher' && (
              <button
                onClick={() => setShowModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:opacity-90 transition-all"
              >
                Tạo lớp học ngay
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map((cls) => (
              <Link
                key={cls.id}
                to={`/classrooms/${cls.id}`}
                className="group bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-lg p-6 hover:shadow-2xl hover:scale-[1.02] transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    🏫
                  </div>
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase">
                    {cls.student_count} học sinh
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {cls.name}
                </h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-6">
                  {cls.description || 'Không có mô tả cho lớp học này.'}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400">
                    Tạo ngày {new Date(cls.created_at).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="text-blue-600 text-sm font-bold group-hover:translate-x-1 transition-transform">
                    Chi tiết →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !creating && setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-6">Tạo lớp học mới</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tên lớp học *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Lớp Toán 12A1"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Mô tả (tùy chọn)</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Thông tin thêm về lớp học..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {creating ? 'Đang tạo...' : 'Xác nhận tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
