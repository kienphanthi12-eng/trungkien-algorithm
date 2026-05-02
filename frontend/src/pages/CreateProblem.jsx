import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { createProblem, updateProblem, getProblem } from '../services/api';

export default function CreateProblem() {
  const { user, token, logoutUser } = useAuth();
  const { problemId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!problemId;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    category: '',
    example_input: '',
    example_output: '',
    test_cases: [{ input: '', output: '' }],
    time_limit: 1000,
    memory_limit: 256,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEdit) {
      loadProblem();
    }
  }, [problemId]);

  const loadProblem = async () => {
    try {
      const data = await getProblem(token, problemId);
      setFormData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (user?.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-600">Truy cập bị từ chối</p>
          <p className="mt-2 text-gray-600">Chỉ giáo viên mới có quyền tạo/chỉnh sửa bài toán.</p>
          <Link to="/problems" className="mt-4 inline-block text-blue-600 hover:underline">
            Quay lại danh sách bài toán
          </Link>
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('limit') ? parseInt(value) : value
    }));
  };

  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...formData.test_cases];
    updatedTestCases[index][field] = value;
    setFormData(prev => ({
      ...prev,
      test_cases: updatedTestCases
    }));
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      test_cases: [...prev.test_cases, { input: '', output: '' }]
    }));
  };

  const removeTestCase = (index) => {
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!formData.title.trim()) {
        setError('Vui lòng nhập tiêu đề bài toán');
        return;
      }
      if (!formData.description.trim()) {
        setError('Vui lòng nhập mô tả bài toán');
        return;
      }
      if (formData.test_cases.some(tc => !tc.input.trim() || !tc.output.trim())) {
        setError('Vui lòng điền đầy đủ tất cả test cases');
        return;
      }

      if (isEdit) {
        await updateProblem(token, problemId, formData);
        setSuccess('Cập nhật bài toán thành công!');
      } else {
        await createProblem(token, formData);
        setSuccess('Tạo bài toán thành công!');
      }

      setTimeout(() => {
        navigate('/problems');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
                <Link to="/problems" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Bài toán</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm hidden sm:inline">
                <span className="font-semibold">{user?.name}</span> (Giáo viên)
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
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              {isEdit ? 'Chỉnh sửa bài toán' : 'Tạo bài toán mới'}
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Thông tin cơ bản</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    placeholder="VD: Tổng hai số"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="5"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    placeholder="Mô tả đầy đủ bài toán, quy tắc, ràng buộc..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Độ khó *</label>
                    <select
                      name="difficulty"
                      value={formData.difficulty}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    >
                      <option value="easy">Dễ</option>
                      <option value="medium">Trung bình</option>
                      <option value="hard">Khó</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                      placeholder="VD: Arrays, Sorting, DP"
                    />
                  </div>
                </div>
              </div>

              {/* Example */}
              <div className="space-y-4 pb-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Ví dụ</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Input ví dụ *</label>
                  <textarea
                    name="example_input"
                    value={formData.example_input}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Output ví dụ *</label>
                  <textarea
                    name="example_output"
                    value={formData.example_output}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 font-mono"
                  />
                </div>
              </div>

              {/* Test Cases */}
              <div className="space-y-4 pb-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Test Cases *</h2>

                {formData.test_cases.map((testCase, idx) => (
                  <div key={idx} className="border border-gray-200 rounded p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-gray-900">Test Case #{idx + 1}</h3>
                      {formData.test_cases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTestCase(idx)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Xóa
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Input</label>
                        <textarea
                          value={testCase.input}
                          onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                          rows="2"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Output</label>
                        <textarea
                          value={testCase.output}
                          onChange={(e) => handleTestCaseChange(idx, 'output', e.target.value)}
                          rows="2"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addTestCase}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  + Thêm test case
                </button>
              </div>

              {/* Constraints */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Ràng buộc</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn thời gian (ms)</label>
                    <input
                      type="number"
                      name="time_limit"
                      value={formData.time_limit}
                      onChange={handleInputChange}
                      min="100"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn bộ nhớ (MB)</label>
                    <input
                      type="number"
                      name="memory_limit"
                      value={formData.memory_limit}
                      onChange={handleInputChange}
                      min="32"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {loading ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Tạo bài toán'}
                </button>
                <Link
                  to="/problems"
                  className="px-6 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Hủy
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
