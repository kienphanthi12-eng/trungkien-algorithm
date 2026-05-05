import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getClassroom, getStudents, addStudentToClass, removeStudentFromClass, getExams, assignExamToClass } from '../services/api';

export default function ClassroomDetail() {
  const { classroomId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add student modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [processingStudent, setProcessingStudent] = useState(false);

  // Assign exam modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allExams, setAllExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);

  useEffect(() => {
    loadClassroom();
  }, [classroomId]);

  const loadClassroom = async () => {
    setLoading(true);
    try {
      const data = await getClassroom(token, classroomId);
      setClassroom(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = async () => {
    setShowAddModal(true);
    if (allStudents.length === 0) {
      try {
        const data = await getStudents(token);
        setAllStudents(data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddStudent = async (studentId) => {
    setProcessingStudent(true);
    try {
      await addStudentToClass(token, classroomId, studentId);
      loadClassroom(); // refresh
      setSearchStudent('');
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Bạn có chắc muốn mời học sinh này ra khỏi lớp?')) return;
    try {
      await removeStudentFromClass(token, classroomId, studentId);
      loadClassroom();
    } catch (err) {
      alert(err.message);
    }
  };

  const openAssignModal = async () => {
    setShowAssignModal(true);
    setAssignSuccess(false);
    if (allExams.length === 0) {
      try {
        const data = await getExams(token);
        setAllExams(data.exams || []);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAssignToClass = async () => {
    if (!selectedExam) return;
    setAssigning(true);
    try {
      await assignExamToClass(token, classroomId, selectedExam, dueDate || null);
      setAssignSuccess(true);
      setTimeout(() => {
        setShowAssignModal(false);
        setAssignSuccess(false);
        setSelectedExam('');
        setDueDate('');
      }, 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Đang tải thông tin lớp học...</p>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-red-500 font-bold mb-4">{error || 'Không tìm thấy lớp học.'}</p>
          <Link to="/classrooms" className="text-blue-600 font-bold hover:underline">← Quay lại danh sách lớp</Link>
        </div>
      </div>
    );
  }

  // Filter out students already in class
  const existingIds = (classroom.students || []).map(s => s.id);
  const filteredStudents = allStudents.filter(s => 
    !existingIds.includes(s.id) && 
    (s.name.toLowerCase().includes(searchStudent.toLowerCase()) || s.email.toLowerCase().includes(searchStudent.toLowerCase()))
  );

  return (
    <>
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Class Header Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black text-slate-900">{classroom.name}</h1>
                <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-black rounded-full uppercase">
                  {classroom.student_count} học sinh
                </span>
              </div>
              <p className="text-slate-500 max-w-2xl">{classroom.description || 'Chưa có mô tả cho lớp học này.'}</p>
            </div>
            
            {user?.role === 'teacher' && (
              <div className="flex gap-3">
                <button
                  onClick={openAssignModal}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-200 hover:scale-105 transition-all flex items-center gap-2"
                >
                  📝 Giao bài cho lớp
                </button>
                <button
                  onClick={openAddModal}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  👤 Thêm học sinh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Students List */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-900">Danh sách thành viên</h2>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Xếp theo ngày gia nhập
            </div>
          </div>
          
          <div className="divide-y divide-slate-100">
            {classroom.students && classroom.students.length > 0 ? (
              classroom.students.map((student, idx) => (
                <div key={student.id} className="px-8 py-5 flex items-center justify-between hover:bg-white/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{student.name}</h4>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-xs text-slate-400">
                      Gia nhập: {new Date(student.joined_at).toLocaleDateString('vi-VN')}
                    </span>
                    {user?.role === 'teacher' && (
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Mời ra khỏi lớp"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-8 py-20 text-center">
                <p className="text-slate-400 italic">Lớp học này hiện chưa có thành viên nào.</p>
                {user?.role === 'teacher' && (
                  <button onClick={openAddModal} className="mt-4 text-blue-600 font-bold hover:underline">
                    + Thêm học sinh ngay
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !processingStudent && setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900">Thêm học sinh</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Tìm tên hoặc email học sinh..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{s.email}</p>
                    </div>
                    <button
                      onClick={() => handleAddStudent(s.id)}
                      disabled={processingStudent}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Thêm
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center py-6 text-xs text-slate-400">Không tìm thấy học sinh phù hợp.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Exam Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !assigning && setShowAssignModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            
            {assignSuccess ? (
              <div className="text-center py-10">
                <div className="text-6xl mb-6 animate-bounce">✅</div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Thành công!</h3>
                <p className="text-slate-500">Bài tập đã được giao tới tất cả học sinh trong lớp.</p>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-black text-slate-900 mb-6">Giao bài cho lớp</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Chọn đề thi *</label>
                    <select
                      value={selectedExam}
                      onChange={e => setSelectedExam(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">-- Chọn đề thi --</option>
                      {allExams.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.title} ({ex.duration}p)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Hạn nộp (tùy chọn)</label>
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={() => setShowAssignModal(false)}
                      disabled={assigning}
                      className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleAssignToClass}
                      disabled={assigning || !selectedExam}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {assigning ? 'Đang xử lý...' : 'Xác nhận giao'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
