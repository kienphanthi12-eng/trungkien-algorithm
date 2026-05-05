import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import {
  getAssignment,
  deleteAssignment,
  createSubmission,
  getSubmissionByAssignment,
  gradeSubmission,
  getProblem,
  getExam,
  sendChatMessage,
  getChatQuota,
  updateProblem,
} from '../services/api';
import { useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';
import FigureRenderer from '../components/FigureRenderer';
import FigureEditor from '../components/FigureEditor';
import ExamProblemView from '../components/ExamProblemView';


const STATUS_LABEL = {
  pending: { text: 'Chờ nộp', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  submitted: { text: 'Đã nộp', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  graded: { text: 'Đã chấm', cls: 'bg-green-100 text-green-800 border-green-200' },
};

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return null;
  const s = parseFloat(score);
  let cls = 'bg-red-100 text-red-800';
  if (s >= 8) cls = 'bg-green-100 text-green-800';
  else if (s >= 6) cls = 'bg-yellow-100 text-yellow-800';
  else if (s >= 4) cls = 'bg-orange-100 text-orange-800';
  return (
    <span className={`inline-block px-3 py-1 text-lg font-bold rounded-full ${cls}`}>
      {s.toFixed(1)} / 10
    </span>
  );
}

export default function AssignmentDetail() {
  const { user, token, logoutUser } = useAuth();
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [problem, setProblem] = useState(null);
  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Submission form state
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [editingProblem, setEditingProblem] = useState(false);

  // Grading state
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState('');

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatQuota, setChatQuota] = useState({ used: 0, limit: 20, remaining: 20 });
  const chatBottomRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [assignmentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignData, subData] = await Promise.allSettled([
        getAssignment(token, assignmentId),
        getSubmissionByAssignment(token, assignmentId),
      ]);
      if (assignData.status === 'fulfilled') {
        const assign = assignData.value;
        setAssignment(assign);
        // Load problem hoặc exam details
        if (assign.problem_id) {
          try {
            const prob = await getProblem(token, assign.problem_id);
            setProblem(prob);
          } catch {}
        } else if (assign.exam_id) {
          try {
            const ex = await getExam(token, assign.exam_id);
            setExam(ex);
          } catch {}
        }
      } else setError(assignData.reason.message);
      if (subData.status === 'fulfilled') setSubmission(subData.value);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answerText.trim()) {
      setSubmitError('Vui lòng nhập bài làm của bạn.');
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError('');
      const sub = await createSubmission(token, {
        assignment_id: assignmentId,
        text_content: answerText,
        image_urls: [],
      });
      setSubmission(sub);
      setAssignment((prev) => prev ? { ...prev, status: 'submitted' } : prev);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrade = async () => {
    if (!submission) return;
    try {
      setGrading(true);
      setGradeError('');
      const updated = await gradeSubmission(token, submission.id);
      setSubmission(updated);
      setAssignment((prev) => prev ? { ...prev, status: 'graded' } : prev);
    } catch (err) {
      setGradeError(err.message);
    } finally {
      setGrading(false);
    }
  };

  const handleUpdateFigure = async (newFigureJson) => {
    if (!problem) return;
    try {
      await updateProblem(token, problem.id, { figure_json: newFigureJson });
      setProblem(prev => ({ ...prev, figure_json: newFigureJson }));
      setEditingProblem(false);
      alert("Đã cập nhật hình vẽ!");
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (showChat) chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading, showChat]);

  const handleChatSend = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    if (chatQuota.remaining <= 0) return;
    setChatInput('');
    const userMsg = { role: 'user', content: msg };
    setChatHistory(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const res = await sendChatMessage(token, {
        assignment_id: assignmentId,
        message: msg,
        history: chatHistory,
      });
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.reply }]);
      // Cập nhật quota từ response
      if (res.quota) setChatQuota(res.quota);
    } catch (err) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${err.message}`,
      }]);
      // Nếu hết quota (429), fetch lại quota để đồng bộ UI
      if (err.message.includes('hết') || err.message.includes('lượt')) {
        getChatQuota(token).then(q => setChatQuota(q)).catch(() => {});
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleOpenChat = async () => {
    setShowChat(true);
    try {
      const q = await getChatQuota(token);
      setChatQuota(q);
    } catch {}
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
  const grade = submission?.grade;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 mr-8">
                <img src={logo} alt="ZENTUS" className="h-10 w-auto" />
              </Link>
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

          {/* Assignment card */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Chi tiết bài tập</h1>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${statusInfo.cls}`}>
                    {statusInfo.text}
                  </span>
                  {isOverdue && (
                    <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                      Quá hạn
                    </span>
                  )}
                  {grade && <ScoreBadge score={grade.score} />}
                </div>
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

            <div className="px-6 py-5 space-y-4">
              {/* Problem / Exam info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {assignment.exam_id ? 'Đề thi' : 'Bài toán'}
                </h2>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-medium text-gray-900">
                    {assignment.exam_title || assignment.problem_title || 'Không xác định'}
                  </span>
                  {assignment.problem_id && (
                    <Link
                      to={`/problems/${assignment.problem_id}`}
                      className="shrink-0 text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                    >
                      Xem bài toán →
                    </Link>
                  )}
                  {assignment.exam_id && (
                    <Link
                      to={`/exams/${assignment.exam_id}`}
                      className="shrink-0 text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                    >
                      Xem đề thi →
                    </Link>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user?.role === 'teacher' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Học sinh</h2>
                    <p className="text-base font-medium text-gray-900">{assignment.student_name || '—'}</p>
                    {assignment.student_email && (
                      <p className="text-sm text-gray-600 mt-1">{assignment.student_email}</p>
                    )}
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ngày giao</h2>
                  <p className="text-base font-medium text-gray-900">{formatDate(assignment.assigned_at)}</p>
                </div>
                <div className={`bg-gray-50 rounded-lg p-4 ${isOverdue ? 'border border-red-200 bg-red-50' : ''}`}>
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Hạn nộp</h2>
                  <p className={`text-base font-medium ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
                    {assignment.due_date ? formatDate(assignment.due_date) : 'Không có hạn'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Problem Content */}
          {problem?.description && (
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6 p-6">
              <ExamProblemView
                problem={problem}
                mode="view"
                userRole={user?.role}
                showCorrect={user?.role === 'teacher'}
              />

              {/* Công cụ hình vẽ (chỉ giáo viên) */}
              {user?.role === 'teacher' && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  {editingProblem ? (
                    <FigureEditor
                      initialData={problem.figure_json}
                      onSave={handleUpdateFigure}
                      onCancel={() => setEditingProblem(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingProblem(true)}
                      className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium py-1.5 px-3 rounded bg-blue-50 border border-blue-100"
                    >
                      ✏️ {(problem.figure_json || problem.figure_image) ? 'Sửa hình vẽ' : 'Thêm hình vẽ'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Nội dung đề thi (exam assignment) ── */}
          {exam && (
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Đề thi</h2>
              {exam.description && (
                <p className="text-gray-700 text-sm mb-4">{exam.description}</p>
              )}
              {exam.questions?.length > 0 && (
                <div className="space-y-6">
                  {exam.questions.map((q, idx) => (
                    <div key={q.id || idx} className="border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-400 mb-2">Câu {idx + 1}</p>
                      <ExamProblemView
                        problem={q}
                        mode="view"
                        userRole={user?.role}
                        showCorrect={user?.role === 'teacher'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── STUDENT: Submit form ── */}
          {user?.role === 'student' && assignment.status === 'pending' && !submission && (
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">📝 Làm bài</h2>
              </div>

              {/* MCQ / True-False: dùng ExamProblemView interactive */}
              {(problem?.problem_type === 'multiple_choice' || problem?.problem_type === 'true_false') ? (
                <div className="px-6 py-5 space-y-4">
                  {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{submitError}</div>}
                  <ExamProblemView
                    problem={problem}
                    mode="answer"
                    userRole="student"
                    selectedAnswer={answerText}
                    onSelectAnswer={setAnswerText}
                  />
                  <div className="flex justify-end pt-1">
                    <button onClick={handleSubmit} disabled={submitting || !answerText}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
                      {submitting ? 'Đang nộp...' : '📤 Nộp đáp án'}
                    </button>
                  </div>
                </div>
              ) : problem?.problem_type === 'essay' ? (
                /* Tự luận: textarea không mono */
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{submitError}</div>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bài làm của bạn <span className="text-red-500">*</span></label>
                    <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} rows={12}
                      placeholder="Trình bày lời giải chi tiết của bạn tại đây..."
                      className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 resize-y" required />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={submitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">
                      {submitting ? 'Đang nộp...' : '📤 Nộp bài'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Algorithm: textarea mono */
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{submitError}</div>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bài làm của bạn <span className="text-red-500">*</span></label>
                    <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} rows={10}
                      placeholder="Nhập code hoặc lời giải của bạn tại đây..."
                      className="w-full rounded-md border border-gray-300 p-3 text-sm font-mono focus:border-blue-500 resize-y" required />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={submitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">
                      {submitting ? 'Đang nộp...' : '📤 Nộp bài'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── SUBMISSION VIEW (student & teacher) ── */}
          {submission && (
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">📄 Bài nộp</h2>
                <span className="text-xs text-gray-500">Nộp lúc: {formatDate(submission.submitted_at)}</span>
              </div>
              <div className="px-6 py-5">
                {problem?.problem_type === 'multiple_choice' ? (
                  <div className="flex items-center gap-3 py-2">
                    <span className="text-sm text-gray-600">Đáp án đã chọn:</span>
                    <span className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">
                      {submission.text_content?.toUpperCase()}
                    </span>
                    {problem?.choices?.[submission.text_content?.toUpperCase()] && (
                      <span className="text-sm text-gray-800">{problem.choices[submission.text_content.toUpperCase()]}</span>
                    )}
                  </div>
                ) : problem?.problem_type === 'true_false' ? (
                  <div className="flex items-center gap-3 py-2">
                    <span className="text-sm text-gray-600">Đáp án đã chọn:</span>
                    <span className={`px-4 py-2 rounded-lg font-bold text-sm ${submission.text_content === 'true' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {submission.text_content === 'true' ? '✓ ĐÚNG' : '✗ SAI'}
                    </span>
                  </div>
                ) : problem?.problem_type === 'essay' ? (
                  <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-800 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                    {submission.text_content || '(Không có nội dung)'}
                  </div>
                ) : (
                  <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-sm font-mono whitespace-pre-wrap overflow-x-auto max-h-80 overflow-y-auto">
                    {submission.text_content || '(Không có nội dung)'}
                  </pre>
                )}
              </div>

              {/* Teacher: Grade button */}
              {user?.role === 'teacher' && (
                <div className="px-6 pb-5">
                  {gradeError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{gradeError}</div>
                  )}
                  <button
                    onClick={handleGrade}
                    disabled={grading}
                    className="px-5 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium flex items-center gap-2"
                  >
                    {grading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Đang chấm...
                      </>
                    ) : (problem?.problem_type === 'multiple_choice' || problem?.problem_type === 'true_false') ? (
                      <>⚡ {grade ? 'Chấm lại (tự động)' : 'Chấm tự động'}</>
                    ) : (
                      <>🤖 {grade ? 'Chấm lại bằng AI' : 'Chấm bài bằng AI'}</>
                    )}
                  </button>
                  {grading && problem?.problem_type !== 'multiple_choice' && problem?.problem_type !== 'true_false' && (
                    <p className="mt-2 text-xs text-gray-500">Đang gọi AI chấm bài, có thể mất 10-30 giây...</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── GRADE RESULT ── */}
          {grade && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">🏆 Kết quả chấm bài</h2>
                <div className="flex items-center gap-3">
                  <ScoreBadge score={grade.score} />
                  <span className="text-xs text-gray-500">Chấm lúc: {formatDate(grade.graded_at)}</span>
                </div>
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Overall feedback */}
                {grade.feedback_json?.overall && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-700 mb-2">Nhận xét tổng thể</h3>
                    <p className="text-sm text-blue-900">{grade.feedback_json.overall}</p>
                  </div>
                )}

                {/* Criteria breakdown */}
                {grade.feedback_json?.criteria && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Đánh giá theo tiêu chí</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(grade.feedback_json.criteria).map(([key, val]) => {
                        const labelMap = {
                          correctness: 'Tính đúng đắn',
                          clarity: 'Rõ ràng',
                          efficiency: 'Hiệu quả',
                          completeness: 'Đầy đủ',
                        };
                        return (
                          <div key={key} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-gray-600 uppercase">{labelMap[key] || key}</span>
                              <span className="text-sm font-bold text-gray-900">{val.score}/10</span>
                            </div>
                            <p className="text-xs text-gray-600">{val.comment}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LLM cost + model (teacher only) */}
                {user?.role === 'teacher' && (
                  <p className="text-xs text-gray-400 text-right">
                    {grade.feedback_json?.model && (
                      <span className="mr-3 px-2 py-0.5 bg-gray-100 rounded text-gray-500">
                        {grade.feedback_json.model === 'auto' ? '⚡ Tự động'
                          : grade.feedback_json.model === 'deepseek-chat' ? '🔵 DeepSeek'
                          : '🟣 Claude Haiku'}
                      </span>
                    )}
                    {grade.llm_cost > 0 && `Chi phí: $${grade.llm_cost.toFixed(6)}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Student already submitted */}
          {user?.role === 'student' && assignment.status !== 'pending' && !submission && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-600 text-sm">
              Đang tải thông tin bài nộp...
            </div>
          )}
        </div>
      </main>

      {/* ── AI Chat Widget (students only) ── */}
      {user?.role === 'student' && assignment && (
        <div className="fixed bottom-6 right-6 z-50">
          {showChat ? (
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
              style={{ width: '360px', height: '520px' }}>

              {/* Chat header */}
              <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-white font-semibold text-sm">🤖 Trợ lý học tập AI</h3>
                  <p className="text-blue-200 text-xs mt-0.5">
                    {chatQuota.limit
                      ? `Còn ${chatQuota.remaining}/${chatQuota.limit} lượt hôm nay`
                      : 'Gợi ý & hướng dẫn — không cho đáp án thẳng'}
                  </p>
                </div>
                <button onClick={() => setShowChat(false)}
                  className="text-blue-200 hover:text-white text-2xl leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors">
                  ×
                </button>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
                {chatHistory.length === 0 && (
                  <div className="text-center py-8 px-4">
                    <div className="text-4xl mb-3">🎓</div>
                    <p className="text-gray-600 text-sm font-medium">Xin chào! Tôi là trợ lý học tập.</p>
                    <p className="text-gray-400 text-xs mt-1">Hỏi tôi về bài toán bạn đang làm nhé.<br/>Tôi sẽ gợi ý hướng suy nghĩ, không cho đáp án thẳng.</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs mr-2 shrink-0 mt-1">🤖</span>
                    )}
                    <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm shadow-md'
                        : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                    }`}>
                      <MarkdownRenderer content={msg.content} className={msg.role === 'user' ? 'text-white' : 'text-gray-800'} />
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs shrink-0">🤖</span>
                    <div className="bg-white border border-gray-100 shadow-sm px-4 py-2 rounded-2xl rounded-bl-sm flex gap-1">
                      {[0, 1, 2].map(d => (
                        <span key={d} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${d * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input area */}
              {chatQuota.remaining === 0 ? (
                <div className="px-4 py-4 border-t border-gray-200 bg-orange-50 text-center shrink-0">
                  <p className="text-orange-700 text-xs font-bold">📅 Bạn đã dùng hết {chatQuota.limit} lượt hôm nay.</p>
                  <p className="text-orange-500 text-xs mt-0.5">Quay lại vào ngày mai nhé!</p>
                </div>
              ) : (
                <div className="px-3 py-3 border-t border-gray-200 bg-white flex gap-2 shrink-0">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                    placeholder="Hỏi về bài toán..."
                    disabled={chatLoading}
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-300 disabled:bg-gray-50"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={chatLoading || !chatInput.trim()}
                    className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0 text-base"
                  >
                    ➤
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleOpenChat}
              className="flex items-center gap-2 pl-4 pr-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all font-medium text-sm"
            >
              <span className="text-lg">💬</span>
              <span>Hỏi AI</span>
              {chatQuota.limit && chatQuota.remaining < chatQuota.limit && (
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-bold">
                  {chatQuota.remaining} lượt
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
