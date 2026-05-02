import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link } from 'react-router-dom';
import { getAssignment, deleteAssignment } from '../services/api';
import { useNavigate } from 'react-router-dom';

const STATUS_LABEL = {
  pending: { text: 'Chờ nộp', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  submitted: { text: 'Đã nộp', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  graded: { text: 'Đã chấm', cls: 'bg-green-100 text-green-800 border-green-200' },
};

export default function AssignmentDetail() {
  const { user, token, logoutUser } = useAuth();
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const data = await getAssignment(token, assignmentId);
      setAssignment(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa bài tập này?')) return;
    try {
      await deleteAssignment(token, assignmentId);
      navigate('/assignments');
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">{error || 'Không tìm thấy bài tập'}</p>
          <Link to="/assignments" className="mt-4 inline-block text-blue-600 hover:underline">
            Quay lại danh sách bài tập
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABEL[assignment.status] || STATUS_LABEL.pending;
  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date() && assignment.status === 'pending';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600 mr-8">TrungKien Algorithm</Link>
              <div className="hidden md:flex">
                <Link to="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
                {user?.role === 'teacher' && (
                  <Link to="/students" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Học sinh</Link>
                )}
                <Link to="/problems" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Bài toán</Link>
                <Link to="/assignments" className="text-blue-600 border-b-2 border-blue-600 px-3 py-2 rounded-md text-sm font-medium">Bài tập</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm hidden sm:inline">
                <span className="font-semibold">{user?.name}</span> ({user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'})
              </span>
              <button onClick={logoutUser} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <Link to="/assignments" className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block">
            ← Quay lại danh sách bài tập
          </Link>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Chi tiết bài tập</h1>
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${statusInfo.cls}`}>
                  {statusInfo.text}
                </span>
                {isOverdue && (
                  <span className="ml-2 inline-block px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                    Quá hạn
                  </span>
                )}
              </div>
              {user?.role === 'teacher' && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                >
                  Xóa bài tập
                </button>
              )}
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Problem info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Bài toán</h2>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-900">
                    {assignment.problem_title || 'Bài toán không xác định'}
                  </span>
                  <Link
                    to={`/problems/${assignment.problem_id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                  >
                    Xem bài toán →
                  </Link>
                </div>
              </div>

              {/* Assignment info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user?.role === 'teacher' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Học sinh</h2>
                    <p className="text-base font-medium text-gray-900">{assignment.student_name || '—'}</p>
                    {assignment.student_email && (
                      <p className="text-sm text-gray-600 mt-1">{assignment.student_email}</p>
                    )}
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Ngày giao</h2>
                  <p className="text-base font-medium text-gray-900">{formatDate(assignment.assigned_at)}</p>
                </div>

                <div className={`bg-gray-50 rounded-lg p-4 ${isOverdue ? 'border border-red-200 bg-red-50' : ''}`}>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Hạn nộp</h2>
                  <p className={`text-base font-medium ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                    {assignment.due_date ? formatDate(assignment.due_date) : 'Không có hạn'}
                  </p>
                </div>
              </div>

              {/* Student actions */}
              {user?.role === 'student' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700 font-medium mb-1">Nộp bài</p>
                  <p className="text-sm text-blue-600">
                    Tính năng nộp bài sẽ có ở Phase 5. Hiện tại trạng thái bài tập của bạn là:{' '}
                    <strong>{statusInfo.text}</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
