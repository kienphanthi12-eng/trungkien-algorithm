import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAssignments, deleteAssignment, getStudents } from '../services/api';
import { Link } from 'react-router-dom';

const STATUS_LABEL = {
  pending: { text: 'Chờ nộp', cls: 'bg-yellow-100 text-yellow-800' },
  submitted: { text: 'Đã nộp', cls: 'bg-blue-100 text-blue-800' },
  graded: { text: 'Đã chấm', cls: 'bg-green-100 text-green-800' },
};

export default function Assignments() {
  const { user, token } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [students, setStudents] = useState([]);

  const itemsPerPage = 20;
  const totalPages = Math.ceil(total / itemsPerPage);

  useEffect(() => {
    if (user?.role === 'teacher') {
      getStudents(token).then(setStudents).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    fetchAssignments();
  }, [currentPage, statusFilter, studentFilter]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * itemsPerPage;
      const data = await getAssignments(token, {
        skip,
        limit: itemsPerPage,
        status: statusFilter || undefined,
        studentId: studentFilter || undefined,
      });
      setAssignments(data.assignments);
      setTotal(data.total);
      setError('');
    } catch (err) {
      setError(err.message);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài tập này?')) return;
    try {
      await deleteAssignment(token, id);
      fetchAssignments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = (e) => { setStatusFilter(e.target.value); setCurrentPage(1); };
  const handleStudentChange = (e) => { setStudentFilter(e.target.value); setCurrentPage(1); };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {user?.role === 'teacher' ? 'Bài tập đã giao' : 'Bài tập của tôi'}
            </h2>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className={`grid gap-4 ${user?.role === 'teacher' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-1 max-w-xs'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select
                  value={statusFilter}
                  onChange={handleStatusChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                >
                  <option value="">Tất cả</option>
                  <option value="pending">Chờ nộp</option>
                  <option value="submitted">Đã nộp</option>
                  <option value="graded">Đã chấm</option>
                </select>
              </div>
              {user?.role === 'teacher' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Học sinh</label>
                  <select
                    value={studentFilter}
                    onChange={handleStudentChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  >
                    <option value="">Tất cả học sinh</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
          )}

          {/* Assignments list */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Danh sách bài tập ({total})</h3>
            </div>

            {loading ? (
              <div className="p-6 text-center text-gray-500">Đang tải...</div>
            ) : assignments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Không có bài tập nào.</div>
            ) : (
              <>
                <div className="divide-y divide-gray-200">
                  {assignments.map((assignment) => {
                    const statusInfo = STATUS_LABEL[assignment.status] || STATUS_LABEL.pending;
                    return (
                      <div key={assignment.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Link
                              to={`/assignments/${assignment.id}`}
                              className="text-base font-medium text-blue-600 hover:text-blue-800"
                            >
                              {assignment.exam_title || assignment.problem_title || 'Bài tập không xác định'}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-600">
                              {user?.role === 'teacher' && (
                                <span>👤 {assignment.student_name || assignment.student_email || 'Học sinh'}</span>
                              )}
                              <span>📅 Giao: {formatDate(assignment.assigned_at)}</span>
                              {assignment.due_date && (
                                <span className={new Date(assignment.due_date) < new Date() && assignment.status === 'pending' ? 'text-red-600 font-medium' : ''}>
                                  ⏰ Hạn: {formatDate(assignment.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col items-end gap-2">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${statusInfo.cls}`}>
                              {statusInfo.text}
                            </span>
                            <Link
                              to={`/assignments/${assignment.id}`}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                            >
                              Xem chi tiết
                            </Link>
                            {user?.role === 'teacher' && (
                              <button
                                onClick={() => handleDelete(assignment.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded border border-gray-300 text-sm font-medium disabled:opacity-50"
                    >
                      Trước
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded text-sm font-medium ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded border border-gray-300 text-sm font-medium disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
