import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProblems, deleteProblem } from '../services/api';
import { Link } from 'react-router-dom';

export default function Problems() {
  const { user, token, logoutUser } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProblems, setTotalProblems] = useState(0);
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');

  const itemsPerPage = 10;

  useEffect(() => {
    fetchProblems();
  }, [currentPage, difficulty, category]);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * itemsPerPage;
      const data = await getProblems(token, skip, itemsPerPage, difficulty || null, category || null);
      setProblems(data.problems);
      setTotalProblems(data.total);
      setError('');
    } catch (err) {
      setError(err.message);
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProblem = async (problemId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài toán này?')) return;
    try {
      await deleteProblem(token, problemId);
      fetchProblems();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDifficultyChange = (e) => {
    setDifficulty(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryKeyPress = (e) => {
    if (e.key === 'Enter') setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalProblems / itemsPerPage);

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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Kho bài toán</h2>
            {user?.role === 'teacher' && (
              <Link
                to="/problems/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                + Tạo bài toán
              </Link>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Độ khó</label>
                <select
                  value={difficulty}
                  onChange={handleDifficultyChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                >
                  <option value="">Tất cả</option>
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                <input
                  type="text"
                  placeholder="Tìm theo danh mục..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  onKeyPress={handleCategoryKeyPress}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Problems List */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Danh sách bài toán ({totalProblems})</h3>
            </div>
            {loading ? (
              <div className="p-6 text-center text-gray-500">Đang tải...</div>
            ) : problems.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Không có bài toán nào.</div>
            ) : (
              <>
                <div className="divide-y divide-gray-200">
                  {problems.map((problem) => (
                    <div key={problem.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link
                            to={`/problems/${problem.id}`}
                            className="text-base font-medium text-blue-600 hover:text-blue-800"
                          >
                            {problem.title}
                          </Link>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{problem.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getDifficultyColor(problem.difficulty)}`}>
                              {problem.difficulty === 'easy' ? 'Dễ' : problem.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                            </span>
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                              {problem.category}
                            </span>
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                              ⏱️ {problem.time_limit}ms
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col items-end gap-2">
                          <Link
                            to={`/problems/${problem.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                          >
                            Xem chi tiết
                          </Link>
                          {user?.role === 'teacher' && problem.created_by === user.id && (
                            <>
                              <Link
                                to={`/problems/${problem.id}/edit`}
                                className="text-gray-600 hover:text-gray-800 text-sm font-medium px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                              >
                                Chỉnh sửa
                              </Link>
                              <button
                                onClick={() => handleDeleteProblem(problem.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                              >
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
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
    </div>
  );
}
