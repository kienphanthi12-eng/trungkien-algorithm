import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { analyzeExam, createExamFromQuestions, generateFigurePreview } from '../services/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import logo from '../assets/logo.png';

// ── Helpers: Chuyển đổi JSON <-> Text ─────────────────────────────────────────
function questionsToText(qs) {
  return qs.map((q, i) => {
    let t = `Câu ${i + 1}:\n`;
    t += `[Mức độ: ${q.difficulty || 'medium'}] [Dạng: ${q.problem_type || 'multiple_choice'}] [Chủ đề: ${q.category || 'Tổng hợp'}]\n`;
    t += `${q.description || ''}\n`;
    if (q.problem_type === 'multiple_choice' && q.choices) {
      t += `A. ${q.choices.A || ''}\n`;
      t += `B. ${q.choices.B || ''}\n`;
      t += `C. ${q.choices.C || ''}\n`;
      t += `D. ${q.choices.D || ''}\n`;
    }
    if (q.correct_answer) t += `Đáp án đúng: ${q.correct_answer}\n`;
    if (q.solution) t += `Lời giải: ${q.solution}\n`;
    return t.trim();
  }).join('\n\n--------------------------------------------------\n\n');
}

function textToQuestions(text) {
  const blocks = text.split(/--------------------------------------------------/).map(b => b.trim()).filter(Boolean);
  return blocks.map((block, idx) => {
    const lines = block.split('\n');
    const q = {
      title: `Câu ${idx + 1}`, description: '', problem_type: 'multiple_choice',
      difficulty: 'medium', category: 'Tổng hợp',
      choices: { A: '', B: '', C: '', D: '' }, correct_answer: null, solution: null
    };
    
    let currentField = 'description';
    let descLines = [];
    let solLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (i === 0 && line.match(/^Câu \d+[:.]?/i)) {
        q.title = line;
        continue;
      }
      
      const metaMatch = line.match(/^\[Mức độ:\s*(.*?)\]\s*\[Dạng:\s*(.*?)\]\s*\[Chủ đề:\s*(.*?)\]/i);
      if (metaMatch) {
        q.difficulty = metaMatch[1]; q.problem_type = metaMatch[2]; q.category = metaMatch[3];
        continue;
      }
      
      if (line.match(/^A\.\s/i)) { q.choices.A = line.substring(3).trim(); currentField = 'A'; continue; }
      if (line.match(/^B\.\s/i)) { q.choices.B = line.substring(3).trim(); currentField = 'B'; continue; }
      if (line.match(/^C\.\s/i)) { q.choices.C = line.substring(3).trim(); currentField = 'C'; continue; }
      if (line.match(/^D\.\s/i)) { q.choices.D = line.substring(3).trim(); currentField = 'D'; continue; }
      
      const ansMatch = line.match(/^Đáp án đúng:\s*(.*)/i);
      if (ansMatch) { q.correct_answer = ansMatch[1].trim(); currentField = 'none'; continue; }
      
      const solMatch = line.match(/^Lời giải:\s*(.*)/i);
      if (solMatch) { solLines.push(solMatch[1].trim()); currentField = 'solution'; continue; }

      if (currentField === 'description') descLines.push(line);
      else if (currentField === 'solution') solLines.push(line);
      else if (['A','B','C','D'].includes(currentField)) q.choices[currentField] += '\n' + line;
    }
    
    q.description = descLines.join('\n').trim();
    q.solution = solLines.join('\n').trim() || null;
    if (q.problem_type !== 'multiple_choice') q.choices = null;
    
    return q;
  });
}

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

  // Raw text editor state
  const [rawText, setRawText] = useState('');

  // Exam meta
  const [examTitle, setExamTitle] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [examDuration, setExamDuration] = useState(60);

  const [createError, setCreateError] = useState('');
  const [createdExam, setCreatedExam] = useState(null);

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
      // Chuyển JSON thành Text để đưa vào Editor
      setRawText(questionsToText(result.questions || []));
      
      // Suggest exam title from file name
      const base = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setExamTitle(base || 'Đề thi mới');
      setStep('review');
    } catch (err) {
      setAnalyzeError(err.message);
      setStep('upload');
    }
  };

  // ── Create exam ────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!examTitle.trim()) {
      setCreateError('Vui lòng nhập tiêu đề đề thi.');
      return;
    }
    setStep('creating');
    setCreateError('');
    try {
      // Dịch ngược Text về JSON
      const parsedQuestions = textToQuestions(rawText);
      if (parsedQuestions.length === 0) {
        throw new Error("Không tìm thấy cấu trúc câu hỏi nào. Vui lòng kiểm tra lại văn bản.");
      }

      const exam = await createExamFromQuestions(token, {
        title: examTitle.trim(),
        description: examDesc.trim() || null,
        duration: Number(examDuration) || 60,
        questions: parsedQuestions,
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

            {/* Raw Text Editor */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Trình soạn thảo đề thi
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Chỉnh sửa tự do như Word. Giữ nguyên các từ khóa như <code className="bg-slate-100 text-red-500 px-1 rounded">Câu...:</code>, <code className="bg-slate-100 text-red-500 px-1 rounded">A.</code>, <code className="bg-slate-100 text-red-500 px-1 rounded">Đáp án đúng:</code> để hệ thống nhận diện đúng cấu trúc.
                  </p>
                </div>
              </div>

              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                className="w-full h-[600px] p-6 border border-slate-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-[15px] font-medium text-slate-800 bg-white leading-relaxed resize-y font-mono shadow-inner"
                spellCheck={false}
              />
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
              ) : `💾 Lưu đề thi`}
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
              {createdExam.problems?.length || 0} câu hỏi — {examDuration} phút
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
                  setRawText('');
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
