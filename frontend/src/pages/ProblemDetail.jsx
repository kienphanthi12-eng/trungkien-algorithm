import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProblem, getStudents, createAssignment, updateProblem, generateProblemFigure } from '../services/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import FigureRenderer from '../components/FigureRenderer';
import FigureEditor from '../components/FigureEditor';
import ExamProblemView from '../components/ExamProblemView';



export default function ProblemDetail() {
  const { user, token } = useAuth();
  const { problemId } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [editingFigure, setEditingFigure] = useState(false);
  const [generatingFigure, setGeneratingFigure] = useState(false);
  const [figureError, setFigureError] = useState('');

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

  const openAssignModal = async () => {
    setShowAssignModal(true);
    setAssignError('');
    setAssignSuccess(false);
    setSelectedStudent('');
    setDueDate('');
    try {
      const data = await getStudents(token);
      setStudents(data);
    } catch {
      setStudents([]);
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
        problem_id: problem.id,
        student_id: selectedStudent,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });
      setAssignSuccess(true);
      setTimeout(() => {
        setShowAssignModal(false);
        setAssignSuccess(false);
      }, 1500);
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateFigure = async (newFigureJson) => {
    try {
      await updateProblem(token, problemId, { figure_json: newFigureJson });
      setProblem(prev => ({ ...prev, figure_json: newFigureJson }));
      setEditingFigure(false);
      alert("Đã cập nhật hình vẽ!");
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleGenerateFigure = async () => {
    setGeneratingFigure(true);
    setFigureError('');
    try {
      const result = await generateProblemFigure(token, problemId);
      setProblem(prev => ({ ...prev, figure_image: result.figure_image }));
    } catch (err) {
      setFigureError(err.message);
    } finally {
      setGeneratingFigure(false);
    }
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <>
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <Link to="/problems" className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block">
            ← Quay lại danh sách bài toán
          </Link>

          <div className="bg-white shadow rounded-lg p-6">
            {/* Title and Info */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900">{problem.title}</h1>
                {user?.role === 'teacher' && (
                  <button
                    onClick={openAssignModal}
                    className="flex-shrink-0 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    📋 Giao bài
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {/* Type badge */}
                {{
                  multiple_choice: <span key="type" className="inline-block px-3 py-1 text-sm font-medium rounded bg-indigo-100 text-indigo-800">📋 Trắc nghiệm</span>,
                  true_false: <span key="type" className="inline-block px-3 py-1 text-sm font-medium rounded bg-indigo-100 text-indigo-800">✓✗ Đúng / Sai</span>,
                  essay: <span key="type" className="inline-block px-3 py-1 text-sm font-medium rounded bg-indigo-100 text-indigo-800">✍️ Tự luận</span>,
                  algorithm: <span key="type" className="inline-block px-3 py-1 text-sm font-medium rounded bg-indigo-100 text-indigo-800">💻 Lập trình</span>,
                }[problem.problem_type || 'algorithm']}
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded ${getDifficultyColor(problem.difficulty)}`}>
                  {problem.difficulty === 'easy' ? 'Dễ' : problem.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                </span>
                <span className="inline-block px-3 py-1 text-sm font-medium rounded bg-blue-100 text-blue-800">
                  {problem.category}
                </span>
                {(!problem.problem_type || problem.problem_type === 'algorithm') && <>
                  <span className="inline-block px-3 py-1 text-sm font-medium rounded bg-purple-100 text-purple-800">
                    ⏱️ {problem.time_limit}ms
                  </span>
                  <span className="inline-block px-3 py-1 text-sm font-medium rounded bg-orange-100 text-orange-800">
                    💾 {problem.memory_limit}MB
                  </span>
                </>}
              </div>
            </div>

            {/* Đề bài + phương án — layout học thuật */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <ExamProblemView
                problem={problem}
                mode="view"
                userRole={user?.role}
                showCorrect={user?.role === 'teacher'}
              />

              {/* Công cụ hình vẽ (chỉ giáo viên) */}
              {user?.role === 'teacher' && (
                <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                  {figureError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{figureError}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleGenerateFigure}
                      disabled={generatingFigure}
                      className="text-xs flex items-center gap-1 text-violet-700 hover:text-violet-900 font-medium py-1.5 px-3 rounded bg-violet-50 border border-violet-200 disabled:opacity-50"
                    >
                      {generatingFigure ? '⏳ Đang sinh hình...' : '✨ Sinh hình AI'}
                    </button>
                    {!editingFigure && (
                      <button
                        onClick={() => setEditingFigure(true)}
                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium py-1.5 px-3 rounded bg-blue-50 border border-blue-100"
                      >
                        ✏️ {(problem.figure_json || problem.figure_image) ? 'Sửa hình JSON' : 'Thêm hình JSON'}
                      </button>
                    )}
                  </div>
                  {editingFigure && (
                    <FigureEditor
                      initialData={problem.figure_json}
                      onSave={handleUpdateFigure}
                      onCancel={() => setEditingFigure(false)}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Solution (teacher only) */}
            {user?.role === 'teacher' && problem.solution && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  💡 Lời giải <span className="text-xs font-normal text-gray-400">(chỉ giáo viên thấy)</span>
                </h2>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <MarkdownRenderer content={problem.solution} className="prose-yellow" />
                </div>
              </div>
            )}

            {/* Algorithm: example + test cases */}
            {(!problem.problem_type || problem.problem_type === 'algorithm') && (
            <>
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
            </>
            )}

            {/* Test Cases — chỉ hiện cho bài lập trình, và chỉ giáo viên thấy đáp án */}
            {(!problem.problem_type || problem.problem_type === 'algorithm') && user?.role === 'teacher' ? (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Test Cases ({problem.test_cases.length})
                </h2>
                <p className="text-xs text-gray-400 mb-4">🔒 Chỉ giáo viên thấy phần này</p>
                <div className="space-y-4">
                  {problem.test_cases.map((testCase, idx) => (
                    <div key={idx} className="border border-gray-200 rounded p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Test Case #{idx + 1}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Input:</p>
                          <div className="bg-gray-100 p-2 rounded text-sm text-gray-700 font-mono overflow-x-auto whitespace-pre">
                            {testCase.input}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Output:</p>
                          <div className="bg-gray-100 p-2 rounded text-sm text-gray-700 font-mono overflow-x-auto whitespace-pre">
                            {testCase.output}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (!problem.problem_type || problem.problem_type === 'algorithm') ? (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-500 italic">
                  🔒 Test cases được ẩn — {problem.test_cases?.length || 0} test case sẽ được dùng để chấm bài.
                </p>
              </div>
            ) : null}

            {/* Teacher action buttons */}
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
                  ℹ️ Để nộp bài làm, bạn cần được giáo viên giao bài tập. Kiểm tra{' '}
                  <Link to="/assignments" className="underline font-medium">trang Bài tập</Link> của bạn.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Giao bài toán</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-700">
                <span className="font-medium">Bài toán:</span> {problem.title}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Học sinh <span className="text-red-500">*</span>
                </label>
                {students.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Bạn chưa có học sinh nào trong lớp.</p>
                ) : (
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  >
                    <option value="">— Chọn học sinh —</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn nộp (tuỳ chọn)</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                />
              </div>

              {assignError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{assignError}</div>
              )}
              {assignSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                  ✅ Đã giao bài thành công!
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning || assignSuccess || students.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {assigning ? 'Đang giao...' : 'Xác nhận giao bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
