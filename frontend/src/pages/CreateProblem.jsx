import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { createProblem, updateProblem, getProblem, generateProblem } from '../services/api';

export default function CreateProblem() {
  const { user, token, logoutUser } = useAuth();
  const { problemId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!problemId;

  const [formData, setFormData] = useState({
    problem_type: 'multiple_choice',
    title: '',
    description: '',
    difficulty: 'medium',
    category: '',
    // MCQ / True-False
    choices: { A: '', B: '', C: '', D: '' },
    correct_answer: 'A',
    solution: '',
    // Algorithm
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
    if (isEdit) loadProblem();
  }, [problemId]);

  const loadProblem = async () => {
    try {
      const data = await getProblem(token, problemId);
      setFormData({
        ...data,
        choices: data.choices || { A: '', B: '', C: '', D: '' },
        correct_answer: data.correct_answer || 'A',
        solution: data.solution || '',
        test_cases: data.test_cases?.length ? data.test_cases : [{ input: '', output: '' }],
      });
    } catch (err) {
      setError(err.message);
    }
  };

  if (user?.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-600">Truy cập bị từ chối</p>
          <Link to="/problems" className="mt-4 inline-block text-blue-600 hover:underline">Quay lại</Link>
        </div>
      </div>
    );
  }

  const ptype = formData.problem_type;
  const isMath = ptype === 'multiple_choice' || ptype === 'true_false';
  const isMCQ = ptype === 'multiple_choice';
  const isEssay = ptype === 'essay';

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name.includes('limit') ? parseInt(value) : value }));
  };

  const handleChoiceChange = (key, value) => {
    setFormData(prev => ({ ...prev, choices: { ...prev.choices, [key]: value } }));
  };

  const handleTestCaseChange = (idx, field, value) => {
    const tc = [...formData.test_cases];
    tc[idx][field] = value;
    setFormData(prev => ({ ...prev, test_cases: tc }));
  };

  const addTestCase = () => setFormData(prev => ({ ...prev, test_cases: [...prev.test_cases, { input: '', output: '' }] }));
  const removeTestCase = (idx) => setFormData(prev => ({ ...prev, test_cases: prev.test_cases.filter((_, i) => i !== idx) }));

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) { setAiError('Vui lòng nhập mô tả.'); return; }
    setAiError(''); setAiLoading(true);
    try {
      const data = await generateProblem(token, aiPrompt);
      setFormData({
        problem_type: data.problem_type || 'multiple_choice',
        title: data.title || '',
        description: data.description || '',
        difficulty: data.difficulty || 'medium',
        category: data.category || '',
        choices: data.choices || { A: '', B: '', C: '', D: '' },
        correct_answer: data.correct_answer || 'A',
        solution: data.solution || '',
        example_input: data.example_input || '',
        example_output: data.example_output || '',
        test_cases: Array.isArray(data.test_cases) && data.test_cases.length ? data.test_cases : [{ input: '', output: '' }],
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
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (!formData.title.trim()) { setError('Vui lòng nhập tiêu đề'); return; }
      if (!formData.description.trim()) { setError('Vui lòng nhập đề bài'); return; }

      const payload = { ...formData };
      if (isMath) {
        payload.test_cases = [];
        payload.example_input = '';
        payload.example_output = '';
        if (!isMCQ) { payload.choices = null; }
      } else if (isEssay) {
        payload.test_cases = [];
        payload.example_input = '';
        payload.example_output = '';
        payload.choices = null;
        payload.correct_answer = null;
        // solution kept (đáp án mẫu cho giáo viên)
      } else {
        // algorithm
        payload.choices = null;
        payload.correct_answer = null;
        payload.solution = null;
      }

      if (isEdit) {
        await updateProblem(token, problemId, payload);
        setSuccess('Cập nhật thành công!');
      } else {
        await createProblem(token, payload);
        setSuccess('Tạo bài toán thành công!');
      }
      setTimeout(() => navigate('/problems'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const typeLabel = { multiple_choice: 'Trắc nghiệm', true_false: 'Đúng / Sai', essay: 'Tự luận', algorithm: 'Lập trình' };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 mr-8">
                <img src={logo} alt="ZENTUS" className="h-10 w-auto" />
              </Link>
              <div className="hidden md:block">
                <Link to="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
                <Link to="/students" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Học sinh</Link>
                <Link to="/problems" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Bài toán</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm hidden sm:inline"><span className="font-semibold">{user?.name}</span> (Giáo viên)</span>
              <button onClick={logoutUser} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">Đăng xuất</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <Link to="/problems" className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block">← Quay lại</Link>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">
                {isEdit ? 'Chỉnh sửa bài toán' : 'Tạo bài toán mới'}
              </h1>
              {!isEdit && (
                <button type="button" onClick={() => { setShowAiModal(true); setAiError(''); }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm shadow">
                  <span>✨</span><span>Tạo bằng AI</span>
                </button>
              )}
            </div>

            {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
            {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Loại bài */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loại bài toán</label>
                <div className="flex gap-3">
                  {['multiple_choice', 'true_false', 'essay', 'algorithm'].map(t => (
                    <button key={t} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, problem_type: t }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        ptype === t
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}>
                      {typeLabel[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thông tin chung */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleInput}
                    className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-blue-500 focus:outline-none"
                    placeholder={isMCQ ? 'VD: Câu 1. Tính đạo hàm của hàm số y = x³ - 3x' : isMath ? 'VD: Mệnh đề nào sau đây đúng?' : 'VD: Tổng hai số'} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isMath ? 'Đề bài *' : 'Mô tả chi tiết *'}
                  </label>
                  <textarea name="description" value={formData.description} onChange={handleInput} rows="5"
                    className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-blue-500 focus:outline-none"
                    placeholder={isMCQ
                      ? 'Cho hàm số f(x) = x³ - 3x. Tính f\'(x) = ?'
                      : isMath
                        ? 'Viết mệnh đề toán học cần xác định đúng/sai...'
                        : 'Mô tả đầy đủ bài toán, input/output format, ràng buộc...'} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Độ khó *</label>
                    <select name="difficulty" value={formData.difficulty} onChange={handleInput}
                      className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-blue-500 focus:outline-none">
                      <option value="easy">Dễ</option>
                      <option value="medium">Trung bình</option>
                      <option value="hard">Khó</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề *</label>
                    <input type="text" name="category" value={formData.category} onChange={handleInput}
                      className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-blue-500 focus:outline-none"
                      placeholder={isMath ? 'Giải tích, Hình học, Đại số...' : 'Arrays, DP, Math...'} />
                  </div>
                </div>
              </div>

              {/* MCQ: 4 phương án */}
              {isMCQ && (
                <div className="space-y-3 pb-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Các phương án *</h2>
                  {['A', 'B', 'C', 'D'].map(k => (
                    <div key={k} className="flex items-center gap-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                        formData.correct_answer === k ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>{k}</span>
                      <input type="text" value={formData.choices?.[k] || ''} onChange={(e) => handleChoiceChange(k, e.target.value)}
                        className="flex-1 rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder={`Phương án ${k}...`} />
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, correct_answer: k }))}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          formData.correct_answer === k
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                        }`}>
                        {formData.correct_answer === k ? '✓ Đúng' : 'Đúng?'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* True/False */}
              {ptype === 'true_false' && (
                <div className="space-y-3 pb-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Đáp án đúng *</h2>
                  <div className="flex gap-4">
                    {['true', 'false'].map(v => (
                      <button key={v} type="button"
                        onClick={() => setFormData(prev => ({ ...prev, correct_answer: v }))}
                        className={`px-6 py-3 rounded-lg font-medium text-sm border transition-colors ${
                          formData.correct_answer === v
                            ? v === 'true' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}>
                        {v === 'true' ? '✓ Đúng' : '✗ Sai'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lời giải (math + essay) */}
              {(isMath || isEssay) && (
                <div className="pb-6 border-b border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lời giải chi tiết</label>
                  <textarea name="solution" value={formData.solution} onChange={handleInput} rows="4"
                    className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder={isEssay ? "Lời giải mẫu để giáo viên tham khảo khi chấm bài... (chỉ giáo viên thấy)" : "Hướng dẫn giải từng bước... (chỉ giáo viên thấy)"} />
                </div>
              )}

              {/* Algorithm: ví dụ + test cases */}
              {!isMath && !isEssay && (
                <>
                  <div className="space-y-4 pb-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Ví dụ</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Input ví dụ</label>
                        <textarea name="example_input" value={formData.example_input} onChange={handleInput} rows="3"
                          className="w-full rounded-md border-gray-300 shadow-sm border p-2 font-mono text-sm focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Output ví dụ</label>
                        <textarea name="example_output" value={formData.example_output} onChange={handleInput} rows="3"
                          className="w-full rounded-md border-gray-300 shadow-sm border p-2 font-mono text-sm focus:outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pb-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Test Cases *</h2>
                    {formData.test_cases.map((tc, idx) => (
                      <div key={idx} className="border border-gray-200 rounded p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-900 text-sm">Test Case #{idx + 1}</h3>
                          {formData.test_cases.length > 1 && (
                            <button type="button" onClick={() => removeTestCase(idx)} className="text-red-600 hover:text-red-800 text-sm">Xóa</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Input</label>
                            <textarea value={tc.input} onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)} rows="2"
                              className="w-full rounded-md border-gray-300 border p-2 font-mono text-sm focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Output</label>
                            <textarea value={tc.output} onChange={(e) => handleTestCaseChange(idx, 'output', e.target.value)} rows="2"
                              className="w-full rounded-md border-gray-300 border p-2 font-mono text-sm focus:outline-none" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addTestCase}
                      className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 text-sm font-medium">
                      + Thêm test case
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Ràng buộc</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn thời gian (ms)</label>
                        <input type="number" name="time_limit" value={formData.time_limit} onChange={handleInput} min="100"
                          className="w-full rounded-md border-gray-300 border p-2 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn bộ nhớ (MB)</label>
                        <input type="number" name="memory_limit" value={formData.memory_limit} onChange={handleInput} min="32"
                          className="w-full rounded-md border-gray-300 border p-2 focus:outline-none" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">
                  {loading ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Tạo bài toán'}
                </button>
                <Link to="/problems" className="px-6 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 font-medium">Hủy</Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">✨</span>
              <h2 className="text-xl font-bold text-gray-900">Tạo đề bài bằng AI</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">AI hỗ trợ tạo cả bài trắc nghiệm toán lẫn bài lập trình.</p>

            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows="4" disabled={aiLoading}
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-3"
              placeholder="VD: Câu trắc nghiệm về đạo hàm hàm hợp, mức trung bình&#10;VD: Bài tự luận tính tích phân, mức khó&#10;VD: Bài đúng/sai về giới hạn dãy số&#10;VD: Bài lập trình tìm ƯCLN hai số (thuật toán Euclid)" />

            {aiError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{aiError}</div>}

            <div className="flex gap-3">
              <button type="button" onClick={handleAiGenerate} disabled={aiLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50">
                {aiLoading ? (
                  <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg><span>Đang tạo...</span></>
                ) : <><span>✨</span><span>Tạo bài toán</span></>}
              </button>
              <button type="button" onClick={() => { setShowAiModal(false); setAiPrompt(''); setAiError(''); }} disabled={aiLoading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50">Hủy</button>
            </div>
            <p className="mt-3 text-xs text-gray-400 text-center">Sử dụng DeepSeek AI · 10–20 giây</p>
          </div>
        </div>
      )}
    </div>
  );
}
