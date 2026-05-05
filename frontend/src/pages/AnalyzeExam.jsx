import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { analyzeExam, createExamFromQuestions, generateFigurePreview } from '../services/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import logo from '../assets/logo.png';

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' };
const TYPE_OPTIONS = ['multiple_choice', 'true_false', 'essay'];
const TYPE_LABELS = { multiple_choice: 'Trắc nghiệm', true_false: 'Đúng/Sai', essay: 'Tự luận' };
const CATEGORY_OPTIONS = [
  'Đại số', 'Hình học', 'Số học', 'Giải tích', 'Tổ hợp',
  'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý',
  'Tiếng Anh', 'Văn học', 'Tổng hợp',
];

export default function AnalyzeExam() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Step: 'upload' | 'analyzing' | 'review' | 'creating' | 'done'
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');

  // Reviewed questions (editable)
  const [questions, setQuestions] = useState([]);
  const [expandedIdx, setExpandedIdx] = useState(null);

  // Exam meta
  const [examTitle, setExamTitle] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [examDuration, setExamDuration] = useState(60);

  const [createError, setCreateError] = useState('');
  const [createdExam, setCreatedExam] = useState(null);
  const [generatingFigureIdx, setGeneratingFigureIdx] = useState(null); // index of question generating figure

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleFileSelect = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  // ── Analyze ────────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!file) return;
    setStep('analyzing');
    setAnalyzeError('');
    try {
      const result = await analyzeExam(token, file);
      const qs = (result.questions || []).map((q, i) => ({
        ...q,
        _id: i, // local key for React
        choices: q.choices || { A: '', B: '', C: '', D: '' },
      }));
      setQuestions(qs);
      // Suggest exam title from file name
      const base = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setExamTitle(base || 'Đề thi mới');
      setStep('review');
    } catch (err) {
      setAnalyzeError(err.message);
      setStep('upload');
    }
  };

  // ── Question editing helpers ───────────────────────────────────────────────

  const updateQuestion = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateChoice = (idx, key, value) => {
    setQuestions(prev => prev.map((q, i) =>
      i === idx ? { ...q, choices: { ...q.choices, [key]: value } } : q
    ));
  };

  // Handler: sinh hình vẽ AI cho câu hỏi cưa chưa lưu
  const handleGenerateFigure = async (idx) => {
    const q = questions[idx];
    if (!q?.description) return;
    setGeneratingFigureIdx(idx);
    try {
      const res = await generateFigurePreview(token, q.description);
      updateQuestion(idx, 'figure_image', res.figure_image);
    } catch (err) {
      alert('Lỗi sinh hình: ' + err.message);
    } finally {
      setGeneratingFigureIdx(null);
    }
  };

  // Handler: thay ảnh bằng file upload
  const handleFigureFileChange = (idx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => updateQuestion(idx, 'figure_image', e.target.result);
    reader.readAsDataURL(file);
  };

  // Handler: xóa hình
  const handleRemoveFigure = (idx) => updateQuestion(idx, 'figure_image', null);

  const removeQuestion = (idx) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
    else if (expandedIdx > idx) setExpandedIdx(prev => prev - 1);
  };

  const addQuestion = () => {
    const newQ = {
      _id: Date.now(),
      title: `Câu ${questions.length + 1}`,
      description: '',
      problem_type: 'multiple_choice',
      choices: { A: '', B: '', C: '', D: '' },
      correct_answer: null,
      difficulty: 'medium',
      category: 'Tổng hợp',
      solution: null,
      figure_image: null,
    };
    setQuestions(prev => [...prev, newQ]);
    setExpandedIdx(questions.length);
  };

  // ── Create exam ────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!examTitle.trim()) {
      setCreateError('Vui lòng nhập tiêu đề đề thi.');
      return;
    }
    if (questions.length === 0) {
      setCreateError('Cần ít nhất 1 câu hỏi.');
      return;
    }
    setStep('creating');
    setCreateError('');
    try {
      // Strip internal _id before sending
      const payload = questions.map(({ _id, ...rest }) => ({
        ...rest,
        choices: rest.problem_type === 'multiple_choice' ? rest.choices : null,
      }));
      const exam = await createExamFromQuestions(token, {
        title: examTitle.trim(),
        description: examDesc.trim() || null,
        duration: Number(examDuration) || 60,
        questions: payload,
      });
      setCreatedExam(exam);
      setStep('done');
    } catch (err) {
      setCreateError(err.message);
      setStep('review');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <Link to="/exams" className="p-2 bg-white rounded-xl shadow-sm border border-white/40">
                <img src={logo} alt="ZENTUS" className="h-10 w-auto" />
              </Link>
              <div>
                <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                  AI PHÂN TÍCH ĐỀ THI
                </span>
                <p className="text-xs text-slate-400 font-medium">Upload PDF digital → DeepSeek AI trích xuất câu hỏi</p>
              </div>
            </div>
            <Link to="/exams" className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
              ← Quay lại kho đề
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">

        {/* ── Step indicator ── */}
        <div className="flex items-center gap-2 mb-10 text-sm font-bold">
          {[
            { key: 'upload', label: '1. Tải lên' },
            { key: 'review', label: '2. Kiểm tra' },
            { key: 'done', label: '3. Lưu đề thi' },
          ].map((s, i, arr) => {
            const active = step === s.key || (step === 'analyzing' && s.key === 'upload') || (step === 'creating' && s.key === 'review');
            const done = (s.key === 'upload' && ['review', 'creating', 'done'].includes(step)) ||
                         (s.key === 'review' && step === 'done');
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black
                  ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={active || done ? 'text-slate-800' : 'text-slate-400'}>{s.label}</span>
                {i < arr.length - 1 && <div className="w-8 h-0.5 bg-slate-200 mx-1" />}
              </div>
            );
          })}
        </div>

        {/* ── STEP: Upload ── */}
        {(step === 'upload' || step === 'analyzing') && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-10">
            <h2 className="text-2xl font-black text-slate-900 mb-2">Tải lên đề thi</h2>
            <p className="text-slate-500 mb-8">
              Hỗ trợ <strong>PDF digital</strong> (xuất từ Word/Google Docs) hoặc <strong>ảnh chụp</strong> (JPG/PNG) — Tối đa 10 MB.<br />
              Gemini Vision sẽ tự động nhận diện hình vẽ, biểu đồ và trích xuất câu hỏi.
            </p>
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs">
              ℹ️ <strong>Phát hiện thông minh:</strong> Nếu PDF có hình vẽ, hệ thống tự dùng Gemini Vision để giữ nguyên ảnh minh hoạ.
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                ${dragOver ? 'border-blue-500 bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <div>
                  <div className="text-4xl mb-3">{file.type.startsWith('image/') ? '🖼️' : '📄'}</div>
                  <p className="font-bold text-slate-800 text-lg">{file.name}</p>
                  <p className="text-slate-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="mt-3 text-xs text-red-500 hover:text-red-700 font-bold underline"
                  >
                    Xóa file
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-5xl mb-4">☁️</div>
                  <p className="font-bold text-slate-600 text-lg">Kéo thả file vào đây</p>
                  <p className="text-slate-400 text-sm mt-1">hoặc click để chọn file</p>
                  <p className="text-slate-300 text-xs mt-3">PDF digital, JPG, PNG — tối đa 10 MB</p>
                </div>
              )}
            </div>

            {analyzeError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {analyzeError}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!file || step === 'analyzing'}
              className="mt-8 w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-blue-200 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 'analyzing' ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Claude Vision đang phân tích…
                </span>
              ) : '✨ Phân tích bằng AI'}
            </button>
          </div>
        )}

        {/* ── STEP: Review ── */}
        {(step === 'review' || step === 'creating') && (
          <div className="space-y-6">

            {/* Exam meta form */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-8">
              <h2 className="text-xl font-black text-slate-900 mb-6">Thông tin đề thi</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tiêu đề *</label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={e => setExamTitle(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Đề thi Toán học kỳ 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Thời gian (phút)</label>
                  <input
                    type="number"
                    min={1}
                    value={examDuration}
                    onChange={e => setExamDuration(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Mô tả (tùy chọn)</label>
                  <input
                    type="text"
                    value={examDesc}
                    onChange={e => setExamDesc(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mô tả ngắn về đề thi…"
                  />
                </div>
              </div>
            </div>

            {/* Questions list */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Câu hỏi trích xuất
                    <span className="ml-2 text-sm font-bold px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                      {questions.length} câu
                    </span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Click vào từng câu để chỉnh sửa. Có thể thêm/xóa câu hỏi.</p>
                </div>
                <button
                  onClick={addQuestion}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors"
                >
                  + Thêm câu
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-lg">Không có câu hỏi nào.</p>
                  <button onClick={addQuestion} className="mt-3 text-blue-600 font-bold hover:underline text-sm">
                    Thêm câu hỏi thủ công
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div key={q._id} className="border border-slate-200 rounded-2xl overflow-hidden">
                      {/* Question header */}
                      <div
                        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                      >
                        <span className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{q.title || `Câu ${idx + 1}`}</p>
                          <div className="text-slate-400 text-xs truncate max-h-5 overflow-hidden">
                            <MarkdownRenderer content={q.description || '(chưa có nội dung)'} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                            ${q.difficulty === 'easy' ? 'bg-green-100 text-green-600'
                              : q.difficulty === 'hard' ? 'bg-red-100 text-red-600'
                              : 'bg-yellow-100 text-yellow-600'}`}>
                            {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {TYPE_LABELS[q.problem_type] || q.problem_type}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeQuestion(idx); }}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 text-slate-400 transition-transform ${expandedIdx === idx ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded editor */}
                      {expandedIdx === idx && (
                        <div className="border-t border-slate-100 p-5 bg-slate-50/50 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                              <label className="block text-xs font-bold text-slate-600 mb-1">Tiêu đề câu</label>
                              <input
                                type="text"
                                value={q.title}
                                onChange={e => updateQuestion(idx, 'title', e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Loại câu hỏi</label>
                              <select
                                value={q.problem_type}
                                onChange={e => updateQuestion(idx, 'problem_type', e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                {TYPE_OPTIONS.map(t => (
                                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Độ khó</label>
                              <select
                                value={q.difficulty}
                                onChange={e => updateQuestion(idx, 'difficulty', e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                {DIFFICULTY_OPTIONS.map(d => (
                                  <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Nội dung câu hỏi</label>
                            <textarea
                              rows={3}
                              value={q.description}
                              onChange={e => updateQuestion(idx, 'description', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                            />
                            {q.description && (
                              <div className="mt-2 p-3 bg-white border border-slate-100 rounded-lg shadow-inner overflow-x-auto">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Xem trước (Preview):</p>
                                <MarkdownRenderer content={q.description} />
                              </div>
                            )}
                          </div>

                          {/* Hình minh hoạ — hiển thị, sinh AI, thay file */}
                          <div className="border border-slate-200 rounded-xl p-4 bg-white">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-bold text-slate-600">Hình minh hoạ</label>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleGenerateFigure(idx)}
                                  disabled={generatingFigureIdx === idx || !q.description}
                                  className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                                >
                                  {generatingFigureIdx === idx ? (
                                    <>
                                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg>
                                      Đang sinh hình…
                                    </>
                                  ) : '🎨 Sinh hình AI'}
                                </button>
                                <label className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 cursor-pointer transition-colors">
                                  📎 Thay ảnh
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => { if (e.target.files[0]) handleFigureFileChange(idx, e.target.files[0]); }}
                                  />
                                </label>
                                {q.figure_image && (
                                  <button
                                    onClick={() => handleRemoveFigure(idx)}
                                    className="px-3 py-1.5 bg-red-50 text-red-500 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors"
                                  >
                                    🗑 Xóa
                                  </button>
                                )}
                              </div>
                            </div>
                            {q.figure_image ? (
                              <img
                                src={q.figure_image}
                                alt="Hình minh hoạ"
                                className="max-w-full h-auto rounded-lg border border-slate-100 shadow-sm"
                              />
                            ) : (
                              <p className="text-xs text-slate-400 text-center py-4">
                                Chưa có hình minh hoạ. Nhấn "🎨 Sinh hình AI" để AI tự vẽ, hoặc "📎 Thay ảnh" để tải lên.
                              </p>
                            )}
                          </div>

                          {/* MCQ choices */}
                          {q.problem_type === 'multiple_choice' && (
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-2">Đáp án lựa chọn</label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {['A', 'B', 'C', 'D'].map(key => (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
                                      ${q.correct_answer === key ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                      {key}
                                    </span>
                                    <input
                                      type="text"
                                      value={q.choices?.[key] || ''}
                                      onChange={e => updateChoice(idx, key, e.target.value)}
                                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                      placeholder={`Đáp án ${key}`}
                                    />
                                    <button
                                      onClick={() => updateQuestion(idx, 'correct_answer', key)}
                                      title="Đánh dấu đáp án đúng"
                                      className={`p-1.5 rounded-lg transition-colors text-xs font-bold
                                        ${q.correct_answer === key ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 hover:bg-green-50 hover:text-green-500'}`}
                                    >
                                      ✓
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {q.correct_answer && (
                                <p className="mt-2 text-xs text-green-600 font-bold">Đáp án đúng: {q.correct_answer}</p>
                              )}
                            </div>
                          )}

                          {/* True/False */}
                          {q.problem_type === 'true_false' && (
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-2">Đáp án đúng/sai</label>
                              <div className="flex gap-3">
                                {['true', 'false'].map(val => (
                                  <button
                                    key={val}
                                    onClick={() => updateQuestion(idx, 'correct_answer', val)}
                                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all
                                      ${q.correct_answer === val ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-blue-50'}`}
                                  >
                                    {val === 'true' ? '✓ Đúng' : '✗ Sai'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Chủ đề</label>
                              <select
                                value={q.category}
                                onChange={e => updateQuestion(idx, 'category', e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                {CATEGORY_OPTIONS.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Lời giải (tùy chọn)</label>
                              <input
                                type="text"
                                value={q.solution || ''}
                                onChange={e => updateQuestion(idx, 'solution', e.target.value || null)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                placeholder="Đáp án / lời giải…"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create button */}
            {createError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
                {createError}
              </div>
            )}
            <button
              onClick={handleCreate}
              disabled={step === 'creating'}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-blue-200 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {step === 'creating' ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang tạo đề thi…
                </span>
              ) : `💾 Lưu đề thi (${questions.length} câu hỏi)`}
            </button>
          </div>
        )}

        {/* ── STEP: Done ── */}
        {step === 'done' && createdExam && (
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-12 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-black text-slate-900 mb-3">Đề thi đã được tạo!</h2>
            <p className="text-slate-500 mb-2">
              <span className="font-bold text-blue-600">{createdExam.title}</span> —{' '}
              {createdExam.problems?.length || questions.length} câu hỏi — {examDuration} phút
            </p>
            <p className="text-slate-400 text-sm mb-10">
              Tất cả câu hỏi đã được lưu vào ngân hàng bài toán và liên kết với đề thi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/exams"
                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-700 transition-colors"
              >
                Xem kho đề thi
              </Link>
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setQuestions([]);
                  setExamTitle('');
                  setExamDesc('');
                  setExamDuration(60);
                  setCreatedExam(null);
                  setExpandedIdx(null);
                }}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:opacity-90 transition-all"
              >
                Phân tích đề thi khác
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
