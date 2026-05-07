import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { createProblem, updateProblem, getProblem, generateProblem, generateProblemsBulk } from '../services/api';

export default function CreateProblem() {
  const { user, token } = useAuth();
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
  const [aiCount, setAiCount] = useState(3);
  const [bulkResults, setBulkResults] = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);

  // Smart Paste state
  const [showSmartPasteModal, setShowSmartPasteModal] = useState(false);
  const [rawText, setRawText] = useState('');
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartError, setSmartError] = useState('');

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
  const isObjective = ptype === 'multiple_choice' || ptype === 'true_false' || ptype === 'trivia';
  const isMCQ = ptype === 'multiple_choice' || ptype === 'trivia';
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
    if (!aiPrompt.trim()) { setAiError('Vui lòng nhập mô tả ý tưởng'); return; }
    setAiLoading(true);
    setAiError('');
    try {
      if (aiCount > 1) {
        const results = await generateProblemsBulk(token, aiPrompt, aiCount);
        setBulkResults(results);
      } else {
        const result = await generateProblem(token, aiPrompt);
        setFormData(prev => ({
          ...prev,
          ...result,
          test_cases: result.test_cases || [{ input: '', output: '' }]
        }));
        setShowAiModal(false);
      }
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSmartPaste = async () => {
    if (!rawText.trim()) { setSmartError('Vui lòng dán nội dung văn bản'); return; }
    setSmartLoading(true);
    setSmartError('');
    try {
      const prompt = `Bạn là một trợ lý giáo dục chuyên nghiệp. Hãy đọc đoạn văn bản thô (có thể bị copy lỗi định dạng) dưới đây. Bóc tách nó ra thành một bài toán hoàn chỉnh bao gồm Tiêu đề, Đề bài, 4 phương án A B C D (nếu là trắc nghiệm), Đáp án đúng (chữ cái A, B, C hoặc D), Lời giải chi tiết. Hãy format các công thức toán học bằng chuẩn LaTeX (ví dụ $x^2$). Văn bản thô cần bóc tách:\n\n${rawText}`;
      const result = await generateProblem(token, prompt);
      setFormData(prev => ({
        ...prev,
        ...result,
        test_cases: result.test_cases || [{ input: '', output: '' }]
      }));
      setShowSmartPasteModal(false);
      setRawText('');
    } catch (err) {
      setSmartError(err.message);
    } finally {
      setSmartLoading(false);
    }
  };

  const handleSaveBulk = async () => {
    setSaveLoading(true);
    try {
      for (const prob of bulkResults) {
        await createProblem(token, prob);
      }
      navigate('/problems');
    } catch (err) {
      setAiError('Lỗi khi lưu danh sách: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (!formData.title.trim()) { setError('Vui lòng nhập tiêu đề'); return; }
      if (!formData.description.trim()) { setError('Vui lòng nhập đề bài'); return; }

      const payload = { ...formData };
      if (isObjective) {
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
      } else {
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

  const typeLabel = { multiple_choice: 'Trắc nghiệm', true_false: 'Đúng / Sai', trivia: 'Đố vui', essay: 'Tự luận', algorithm: 'Lập trình' };

  return (
    <>
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <Link to="/problems" className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block">← Quay lại</Link>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">
                {isEdit ? 'Chỉnh sửa bài toán' : 'Tạo bài toán mới'}
              </h1>
              {!isEdit && (
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowSmartPasteModal(true); setSmartError(''); setRawText(''); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow transition-colors">
                    <span>✂️</span><span>Bóc tách từ Text</span>
                  </button>
                  <button type="button" onClick={() => { setShowAiModal(true); setAiError(''); setBulkResults([]); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm shadow transition-colors">
                    <span>✨</span><span>Tạo bằng AI</span>
                  </button>
                </div>
              )}
            </div>

            {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
            {success && <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loại bài toán</label>
                <div className="flex flex-wrap gap-3">
                  {['multiple_choice', 'true_false', 'trivia', 'essay', 'algorithm'].map(t => (
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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleInput}
                    className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-blue-500 focus:outline-none"
                    placeholder="VD: Tiêu đề bài toán" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isObjective ? 'Đề bài *' : 'Mô tả chi tiết *'}
                  </label>
                  <textarea name="description" value={formData.description} onChange={handleInput} rows="5"
                    className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-blue-500 focus:outline-none"
                    placeholder="Nhập nội dung đề bài..." />
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
                      placeholder="VD: Toán, Lập trình..." />
                  </div>
                </div>
              </div>

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

              {(isObjective || isEssay) && (
                <div className="pb-6 border-b border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lời giải / Giải thích chi tiết</label>
                  <textarea name="solution" value={formData.solution} onChange={handleInput} rows="4"
                    className="w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Giải thích đáp án (chỉ giáo viên thấy)..." />
                </div>
              )}

              {!isObjective && !isEssay && (
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

      {/* Smart Paste Modal */}
      {showSmartPasteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 transform transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">✂️</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Bóc tách câu hỏi bằng AI</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Copy toàn bộ nội dung câu hỏi (từ Word, PDF...) và dán vào đây. AI của ZENTUS sẽ tự động phân tích và tự động điền vào các ô: Đề bài, Đáp án A B C D, và Lời giải.
            </p>

            <textarea 
              value={rawText} 
              onChange={(e) => setRawText(e.target.value)} 
              rows="8" 
              disabled={smartLoading}
              className="w-full rounded-xl border border-slate-200 p-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none mb-4 bg-slate-50 placeholder-slate-400"
              placeholder="Ví dụ:&#10;Câu 1. Phương trình x^2 - 1 = 0 có nghiệm là?&#10;A. x = 1&#10;B. x = -1&#10;C. x = +-1&#10;D. Vô nghiệm.&#10;Lời giải: Ta có x^2 = 1 => x = +-1. Chọn C." 
            />

            {smartError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                {smartError}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => { setShowSmartPasteModal(false); setRawText(''); }} 
                className="px-6 py-2.5 text-slate-600 hover:text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              
              <button 
                onClick={handleSmartPaste} 
                disabled={smartLoading || !rawText.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
              >
                {smartLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Đang bóc tách...
                  </>
                ) : 'Bóc tách ngay'}
              </button>
            </div>
            <p className="mt-4 text-[10px] font-bold text-slate-400 text-center tracking-widest uppercase">Powered by ZENTUS AI Engine</p>
          </div>
        </div>
      )}

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
              placeholder="Nhập mô tả bài toán bạn muốn tạo..." />

            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Số lượng câu hỏi:</label>
              <select 
                value={aiCount} 
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="rounded-lg border border-gray-300 p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {[1, 2, 3, 5, 10].map(n => <option key={n} value={n}>{n} câu</option>)}
              </select>
              <span className="text-xs text-gray-500 italic">(Tạo hàng loạt sẽ lưu trực tiếp vào kho)</span>
            </div>

            {aiError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{aiError}</div>}

            {bulkResults.length > 0 && (
              <div className="mb-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                <h4 className="text-sm font-bold text-gray-800 mb-2 px-1">Kết quả ({bulkResults.length})</h4>
                {bulkResults.map((p, idx) => (
                  <div key={idx} className="p-3 bg-white border border-gray-200 rounded-lg mb-2 shadow-sm">
                    <p className="text-sm font-bold text-blue-600">{p.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setShowAiModal(false); setBulkResults([]); setAiPrompt(''); }} 
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Hủy
              </button>
              
              {bulkResults.length > 0 ? (
                <button 
                  onClick={handleSaveBulk} 
                  disabled={saveLoading}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {saveLoading ? 'Đang lưu...' : `Lưu ${bulkResults.length} câu vào kho`}
                </button>
              ) : (
                <button 
                  onClick={handleAiGenerate} 
                  disabled={aiLoading}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {aiLoading ? 'Đang tạo...' : 'Bắt đầu tạo'}
                </button>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-400 text-center">Sử dụng DeepSeek AI · 10–30 giây</p>
          </div>
        </div>
      )}
    </>
  );
}
