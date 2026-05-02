import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { createProblem, updateProblem, getProblem, generateProblem } from '../services/api';

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

  // AI generation state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

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

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      setAiError('Vui lòng nhập mô tả ý tưởng bài toán.');
      return;
    }
    setAiError('');
    setAiLoading(true);
    try {
      const data = await generateProblem(token, aiPrompt);
      setFormData({
        title: data.title || '',
        description: data.description || '',
        difficulty: data.difficulty || 'medium',
        category: data.category || '',
        example_input: data.example_input || '',
        example_output: data.example_output || '',
        test_cases: Array.isArray(data.test_cases) && data.test_cases.length > 0
          ? data.test_cases
          : [{ input: '', output: '' }],
        time_limit: data.time_limit || 1000,
        memory_limit: data.memory_limit || 256,
      });
      setShowAiModal(false);
      setAiPrompt('');
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
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
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">
                {isEdit ? 'Chỉnh sửa bài toán' : 'Tạo bài toán mới'}
              </h1>
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => { setShowAiModal(true); setAiError(''); }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm shadow"
                >
                  <span>✨</span>
                  <span>Tạo đề bằng AI</span>
                </button>
              )}
            </div>

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

      {/* AI Generation Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">✨</span>
              <h2 className="text-xl font-bold text-gray-900">Tạo đề bài bằng AI</h2>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Mô tả ngắn gọn ý tưởng bài toán, AI sẽ tự động sinh đầy đủ nội dung cho bạn.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ý tưởng bài toán
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows="4"
                disabled={aiLoading}
                className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="VD: Bài toán tìm tổng lớn nhất của dãy con liên tiếp (Kadane's algorithm), độ khó trung bình&#10;&#10;VD: Bài đếm số đảo ngược trong mảng bằng merge sort, khó&#10;&#10;VD: Bài kiểm tra số nguyên tố đơn giản cho người mới"
              />
            </div>

            {aiError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {aiError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Tạo bài toán</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowAiModal(false); setAiPrompt(''); setAiError(''); }}
                disabled={aiLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
              >
                Hủy
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-400 text-center">
              Sử dụng DeepSeek AI · Có thể mất 10–20 giây
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
