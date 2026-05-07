import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getExam, getStudents, createAssignment, generateExamVariant, updateProblem, generateProblemFigure } from '../services/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import PrintableExam from '../components/PrintableExam';
import FigureRenderer from '../components/FigureRenderer';
import FigureEditor from '../components/FigureEditor';
import { useReactToPrint } from 'react-to-print';
import React, { useRef } from 'react';
import {
  Printer, Share2, Trash2, PlusCircle, History, 
  ChevronDown, ChevronUp, Edit3, Save, X 
} from 'lucide-react';

const DIFFICULTY_LABELS = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' };
const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};
const TYPE_LABELS = {
  multiple_choice: 'Trắc nghiệm',
  true_false: 'Đúng/Sai',
  essay: 'Tự luận',
  algorithm: 'Lập trình',
  trivia: 'Đố vui',
};

export default function ExamDetail() {
  const { examId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [editingProblem, setEditingProblem] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [dueDate, setDueDate] = useState('');

  // Expanded question
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [variantLoading, setVariantLoading] = useState(false);
  const [generatingFigureId, setGeneratingFigureId] = useState(null);

  const handleGenerateFigure = async (problemId) => {
    setGeneratingFigureId(problemId);
    try {
      const res = await generateProblemFigure(token, problemId);
      // Update local state
      setExam(prev => ({
        ...prev,
        problems: prev.problems.map(item => {
          const p = item.problem || item;
          if (p.id === problemId) {
            return { ...item, problem: { ...p, figure_image: res.figure_image } };
          }
          return item;
        })
      }));
    } catch (err) {
      alert("Lỗi khi sinh hình: " + err.message);
    } finally {
      setGeneratingFigureId(null);
    }
  };

  // Printing logic
  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: exam ? `De_thi_${exam.title}` : 'De_thi',
    onAfterPrint: () => console.log("[Print] In thành công"),
    onPrintError: (error) => console.error("[Print] Lỗi khi in:", error),
  });

  // Manual wrapper to log click
  const onPrintClick = () => {
    console.log("[Print] Nút in đã được nhấn. Dữ liệu đề thi hiện tại:", exam);
    if (exam) {
      console.log("[Print] Danh sách câu hỏi (problems):", exam.problems?.length);
      console.log("[Print] Danh sách câu hỏi (questions):", exam.questions?.length);
    }
    handlePrint();
  };

  useEffect(() => {
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    setLoading(true);
    try {
      const data = await getExam(token, examId);
      setExam(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFigure = async (problemId, newFigureJson) => {
    try {
      await updateProblem(token, problemId, { figure_json: newFigureJson });
      // Update local state
      setExam(prev => ({
        ...prev,
        problems: prev.problems.map(p => {
          const problemObj = p.problem || p;
          if (problemObj.id === problemId) {
            return { ...p, problem: { ...problemObj, figure_json: newFigureJson } };
          }
          return p;
        })
      }));
      setEditingProblem(null);
      alert("Đã cập nhật hình vẽ!");
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleCreateVariant = async () => {
    if (!window.confirm('AI sẽ tạo một bộ đề mới dựa trên cấu trúc đề này nhưng thay đổi nội dung câu hỏi. Bạn muốn tiếp tục?')) return;
    
    setVariantLoading(true);
    try {
      const newExam = await generateExamVariant(token, examId);
      navigate(`/exams/${newExam.id}`);
      window.scrollTo(0, 0);
      alert('Đã tạo đề biến thể mới thành công!');
    } catch (err) {
      alert('Lỗi khi tạo biến thể: ' + err.message);
    } finally {
      setVariantLoading(false);
    }
  };

  const openModal = async () => {
    setShowModal(true);
    setAssignError('');
    setAssignSuccess(false);
    setSelectedStudent('');
    setDueDate('');
    if (students.length === 0) {
      try {
        const data = await getStudents(token);
        setStudents(data);
      } catch {
        setAssignError('Không tải được danh sách học sinh.');
      }
    }
  };

  const handleAssign = async () => {
    if (!selectedStudent) {
      setAssignError('Vui lòng chọn học sinh.');
      return;
    }
    setAssigning(true);
    setAssignError('');
    try {
      await createAssignment(token, {
        student_id: selectedStudent,
        exam_id: examId,
        due_date: dueDate || null,
      });
      setAssignSuccess(true);
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  // ── Loading / error states ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (variantLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-20 animate-pulse" />
          <div className="relative animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-600" />
          <div className="absolute inset-0 flex items-center justify-center text-xl">✨</div>
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Đang soạn đề biến thể...</h2>
        <p className="text-slate-500 max-w-sm">AI của ZENTUS đang phân tích đề gốc và tạo ra các câu hỏi tương đương cho bạn.</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-bold mb-4">{error || 'Không tìm thấy đề thi.'}</p>
          <Link to="/exams" className="text-blue-600 font-bold hover:underline">← Quay lại kho đề</Link>
        </div>
      </div>
    );
  }

  const problems = exam.problems || [];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {user?.role === 'teacher' && (
        <div className="flex justify-end gap-2 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <button
            onClick={handleCreateVariant}
            className="px-4 py-2.5 bg-white border border-blue-200 text-blue-600 text-sm font-bold rounded-xl hover:bg-blue-50 transition-all flex items-center gap-2"
          >
            ✨ Tạo biến thể AI
          </button>
          <button
            onClick={onPrintClick}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 hover:scale-105 transition-all flex items-center gap-2"
          >
            🖨️ In đề / PDF
          </button>
          <button
            onClick={openModal}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 hover:scale-105 transition-all"
          >
            📤 Giao đề thi
          </button>
        </div>
      )}
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Exam meta card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">{exam.title}</h1>
              {exam.description && (
                <p className="text-slate-500 max-w-2xl">{exam.description}</p>
              )}
            </div>
            <div className="flex items-center gap-6 text-sm font-bold text-slate-500 flex-shrink-0">
              <div className="text-center">
                <div className="text-2xl font-black text-blue-600">{problems.length}</div>
                <div>câu hỏi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-purple-600">{exam.duration}</div>
                <div>phút</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-slate-400">
                  {new Date(exam.created_at).toLocaleDateString('vi-VN')}
                </div>
                <div>ngày tạo</div>
              </div>
            </div>
          </div>
        </div>

        {/* Questions list */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-8">
          <h2 className="text-xl font-black text-slate-900 mb-6">
            Danh sách câu hỏi
          </h2>

          {problems.length === 0 ? (
            <p className="text-center py-10 text-slate-400">Đề thi này chưa có câu hỏi nào.</p>
          ) : (
            <div className="space-y-3">
              {problems.map((ep, idx) => {
                if (!ep) return null;
                const p = ep.problem || ep;
                if (!p) return null;
                const isStudent = user?.role === 'student';
                const isExpanded = isStudent || expandedIdx === idx;
                return (
                  <div key={ep.id || idx} className="border border-slate-200 rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div
                      className={`flex items-center gap-3 px-5 py-4 ${isStudent ? '' : 'cursor-pointer hover:bg-slate-50 transition-colors'}`}
                      onClick={() => !isStudent && setExpandedIdx(isExpanded ? null : idx)}
                    >
                      <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{p.title || `Câu ${idx + 1}`}</p>
                        <p className="text-slate-400 text-sm truncate">{p.description || '(chưa có nội dung)'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[p.difficulty] || 'bg-slate-100 text-slate-500'}`}>
                          {DIFFICULTY_LABELS[p.difficulty] || p.difficulty}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {TYPE_LABELS[p.problem_type] || p.problem_type}
                        </span>
                        {!isStudent && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-5 py-5 bg-slate-50/50 space-y-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-1">Nội dung câu hỏi</p>
                          <MarkdownRenderer content={p.description} className="text-sm" />
                          
                          {/* Hiển thị ảnh AI */}
                          {p.figure_image && (
                            <div className="my-4 flex justify-center">
                              <img 
                                src={p.figure_image.startsWith('data:') ? p.figure_image : `data:image/png;base64,${p.figure_image}`} 
                                alt="AI Generated Figure" 
                                className="max-w-full rounded-lg border shadow-sm max-h-[300px] object-contain" 
                              />
                            </div>
                          )}

                          {p.figure_json && <FigureRenderer data={p.figure_json} />}

                          {/* Editor Trigger - DEBUG: Show for everyone */}
                          {true && (
                            <div className="mt-2">
                              {editingProblem?.id === p.id ? (
                                <FigureEditor 
                                  initialData={p.figure_json} 
                                  onSave={(data) => handleUpdateFigure(p.id, data)}
                                  onCancel={() => setEditingProblem(null)}
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleGenerateFigure(p.id)}
                                    disabled={generatingFigureId === p.id}
                                    className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium py-1 px-2 rounded-lg bg-purple-50 border border-purple-100 disabled:opacity-50 transition-colors"
                                  >
                                    {generatingFigureId === p.id ? '⏳ Đang vẽ...' : '🎨 Sinh hình AI'}
                                  </button>
                                  <button 
                                    onClick={() => setEditingProblem(p)}
                                    className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium py-1 px-2 rounded-lg bg-blue-50 border border-blue-100 transition-colors"
                                  >
                                    ✏️ {(p.figure_json || p.figure_image) ? 'Sửa hình vẽ tay' : 'Vẽ hình thủ công'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* MCQ choices */}
                        {p.problem_type === 'multiple_choice' && p.choices && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 mb-2">Đáp án lựa chọn</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {Object.entries(p.choices).map(([key, val]) => (
                                <div key={key} className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm
                                  ${p.correct_answer === key
                                    ? 'border-green-400 bg-green-50 text-green-800 font-bold'
                                    : 'border-slate-200 bg-white text-slate-700'}`}>
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
                                    ${p.correct_answer === key ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                    {key}
                                  </span>
                                  <div className="flex-1">
                                    <MarkdownRenderer content={val} className="text-sm" />
                                  </div>
                                  {p.correct_answer === key && <span className="ml-auto text-green-600 text-xs">✓ Đúng</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* True/False */}
                        {p.problem_type === 'true_false' && p.correct_answer && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 mb-1">Đáp án</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold
                              ${p.correct_answer === 'true' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {p.correct_answer === 'true' ? '✓ Đúng' : '✗ Sai'}
                            </span>
                          </div>
                        )}

                        {/* Solution */}
                        {p.solution && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 mb-1">Lời giải</p>
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                              <MarkdownRenderer content={p.solution} className="text-sm text-blue-900" />
                            </div>
                          </div>
                        )}

                        {p.category && (
                          <p className="text-xs text-slate-400 font-bold">📚 Chủ đề: {p.category}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Assign Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !assigning && setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 z-10">

            {assignSuccess ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Đã giao đề thành công!</h3>
                <p className="text-slate-500 text-sm mb-6">Học sinh sẽ thấy đề thi trong mục "Bài tập của tôi".</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowModal(false); setAssignSuccess(false); }}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => { setAssignSuccess(false); setSelectedStudent(''); setDueDate(''); }}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:opacity-90 transition-all"
                  >
                    Giao tiếp
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Giao đề thi</h3>
                    <p className="text-slate-500 text-sm mt-1 line-clamp-1">{exam.title}</p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Chọn học sinh *</label>
                    <select
                      value={selectedStudent}
                      onChange={e => setSelectedStudent(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn học sinh --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                    {students.length === 0 && (
                      <p className="mt-1 text-xs text-slate-400">Bạn chưa có học sinh nào. <Link to="/students" className="text-blue-600 hover:underline">Thêm học sinh</Link></p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Hạn nộp (tùy chọn)</label>
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Exam summary */}
                  <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                    <p className="text-xs font-bold text-blue-600 mb-2">Thông tin đề thi</p>
                    <p className="text-sm text-slate-700 font-bold">{exam.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{problems.length} câu hỏi · {exam.duration} phút</p>
                  </div>

                  {assignError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                      {assignError}
                    </div>
                  )}

                  <button
                    onClick={handleAssign}
                    disabled={assigning || !selectedStudent}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {assigning ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang giao...
                      </span>
                    ) : '📤 Xác nhận giao đề'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Hidden printable component using CSS to stay in DOM but invisible */}
      <div className="hidden-print-source">
        <PrintableExam ref={componentRef} exam={exam} />
      </div>

      <style>{`
        .hidden-print-source {
          position: absolute;
          left: -9999px;
          top: 0;
          height: 0;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
