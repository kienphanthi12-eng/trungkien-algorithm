import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProblem } from '../services/api';

export default function ProblemDetail() {
  const { user, token, logoutUser } = useAuth();
  const { problemId } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProblem();
  }, [problemId]);

  const fetchProblem = async () => {
    try {
      setLoading(true);
      const data = await getProblem(token, problemId);
      setProblem(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">{error || 'Không tìm thấy bài toán'}</p>
          <Link to="/problems" className="mt-4 inline-block text-blue-600 hover:underline">
            Quay lại danh sách bài toán
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600 mr-8">TrungKien Algorithm</Link>
              <div className="hidden md:block">
                <Link to="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
                <Link to="/students" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Học sinh</Link>
                <Link to="/problems" className="text-blue-600 border-b-2 border-blue-600 px-3 py-2 rounded-md text-sm font-medium">Bài toán</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm hidden sm:inline">
                <span className="font-semibold">{user?.name}</span> ({user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'})
              </span>
              <button
                onClick={logoutUser}
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <Link to="/problems" className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block">
            ← Quay lại danh sách bài toán
          </Link>

          <div className="bg-white shadow rounded-lg p-6">
            {/* Title and Info */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{problem.title}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded ${getDifficultyColor(problem.difficulty)}`}>
                  {problem.difficulty === 'easy' ? 'Dễ' : problem.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                </span>
                <span className="inline-block px-3 py-1 text-sm font-medium rounded bg-blue-100 text-blue-800">
                  {problem.category}
                </span>
                <span className="inline-block px-3 py-1 text-sm font-medium rounded bg-purple-100 text-purple-800">
                  ⏱️ {problem.time_limit}ms
                </span>
                <span className="inline-block px-3 py-1 text-sm font-medium rounded bg-orange-100 text-orange-800">
                  💾 {problem.memory_limit}MB
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Mô tả</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{problem.description}</p>
            </div>

            {/* Example */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ví dụ</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Input:</h3>
                  <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 font-mono overflow-x-auto">
                    {problem.example_input}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Output:</h3>
                  <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 font-mono overflow-x-auto">
                    {problem.example_output}
                  </div>
                </div>
              </div>
            </div>

            {/* Test Cases */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Cases ({problem.test_cases.length})</h2>
              <div className="space-y-4">
                {problem.test_cases.map((testCase, idx) => (
                  <div key={idx} className="border border-gray-200 rounded p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Test Case #{idx + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Input:</p>
                        <div className="bg-gray-100 p-2 rounded text-sm text-gray-700 font-mono overflow-x-auto">
                          {testCase.input}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Output:</p>
                        <div className="bg-gray-100 p-2 rounded text-sm text-gray-700 font-mono overflow-x-auto">
                          {testCase.output}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {user?.role === 'teacher' && problem.created_by === user.id && (
              <div className="flex gap-2">
                <Link
                  to={`/problems/${problem.id}/edit`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Chỉnh sửa
                </Link>
              </div>
            )}

            {user?.role === 'student' && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-blue-700">
                  ℹ️ Để nộp bài làm, bạn cần chờ đến Phase 4 (Assignment Flow)
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
