import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { getExams, deleteExam, getStudents, createAssignment } from '../services/api';
import logo from '../assets/logo.png';

export default function Exams() {
  const { user, token, logoutUser } = useAuth();
  const [exams, setExams] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Assign modal state
  const [assignModalExam, setAssignModalExam] = useState(null); // exam object or null
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);

  useEffect(() => {
    if (token) loadExams();
  }, [token]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const data = await getExams(token);
      setExams(data.exams);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa đề thi này?')) return;
    try {
      await deleteExam(token, id);
      setExams(exams.filter(e => e.id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      alert('Lỗi khi xóa đề thi: ' + err.message);
    }
  };

  const openAssignModal = async (exam) => {
    setAssignModalExam(exam);
    setAssignError('');
    setAssignSuccess(false);
    setSelectedStudent('');
    setDueDate('');
    try {
      const data = await getStudents(token);
      setStudents(data);
    } catch {
      setStudents([]);
    }
  };

  const closeAssignModal = () => {
    setAssignModalExam(null);
    setAssignError('');
    setAssignSuccess(false);
  };

  const handleAssign = async () => {
    if (!selectedStudent) {
      setAssignError('Vui lòng chọn học sinh.');
      return;
    }
    setAssigning(true);
    setAssignError('');
    try {
      await createAssignment(token, {
        exam_id: assignModalExam.id,
        student_id: selectedStudent,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });
      setAssignSuccess(true);
      setTimeout(() => closeAssignModal(), 1500);
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none"></div>

      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="p-2 bg-white rounded-xl shadow-sm border border-white/40">
                <img src={logo} alt="ZENTUS" className="h-10 w-auto" />
              </Link>
              <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                KHO ĐỀ THI
              </span>
            </div>
            <div className="flex items-center gap-4">
              {user?.role === 'teacher' && (
                <>
                  <Link to="/exams/analyze" className="px-5 py-2.5 bg-white border border-purple-200 text-purple-700 text-sm font-bold rounded-xl hover:bg-purple-50 transition-all shadow-sm">
                    ✨ AI Phân tích đề
                  </Link>
                  <Link to="/exams/create" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 hover:scale-105 transition-all">
                    + Tạo đề thi mới
                  </Link>
                </>
              )}
              <button onClick={logoutUser} className="text-gray-500 hover:text-red-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Danh sách đề thi</h2>
            <p className="text-slate-500 font-medium">Tổng cộng {total} đề thi đã được tạo</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{error}</div>
        ) : exams.length === 0 ? (
          <div className="text-center py-20 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl">
            <p className="text-slate-500 text-lg">Chưa có đề thi nào. Hãy bắt đầu tạo ngay!</p>
            <Link to="/exams/create" className="mt-4 inline-block text-blue-600 font-bold hover:underline">Tạo đề thi đầu tiên</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {exams.map((exam) => (
              <div key={exam.id} className="group bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                      {exam.problems?.length || 0} câu hỏi
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{exam.title}</h3>
                  <p className="text-slate-500 text-sm mb-6 line-clamp-2">{exam.description || 'Không có mô tả.'}</p>

                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mb-6">
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {exam.duration} phút
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(exam.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/exams/${exam.id}`}
                      className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-center text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Xem chi tiết
                    </Link>
                    {user?.role === 'teacher' && (
                    <button
                      onClick={() => openAssignModal(exam)}
                      className="flex-1 py-2.5 bg-slate-900 text-white text-center text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
                    >
                      Giao bài
                    </button>
                    )}
                    {user?.role === 'teacher' && (
                      <button onClick={() => handleDelete(exam.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Assign Modal */}
      {assignModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-black text-slate-900 mb-1">Giao đề thi</h3>
            <p className="text-slate-500 text-sm mb-6">
              <span className="font-bold text-blue-600">{assignModalExam.title}</span> — {assignModalExam.problems?.length || 0} câu hỏi
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Chọn học sinh *</label>
                {students.length === 0 ? (
                  <p className="text-slate-400 text-sm italic">Chưa có học sinh trong lớp. <Link to="/students" className="text-blue-600 underline">Thêm học sinh</Link></p>
                ) : (
                  <select
                    value={selectedStudent}
                    onChange={e => setSelectedStudent(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn học sinh --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Hạn nộp (tùy chọn)</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {assignError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{assignError}</div>
              )}
              {assignSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-bold">✅ Giao bài thành công!</div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeAssignModal}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning || assignSuccess || students.length === 0}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              >
                {assigning ? 'Đang giao...' : 'Xác nhận giao bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
