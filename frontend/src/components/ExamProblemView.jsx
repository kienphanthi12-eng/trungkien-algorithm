/**
 * ExamProblemView — Hiển thị bài toán theo bố cục học thuật (giống đề thi).
 *
 * Props:
 *   problem         – object bài toán từ API
 *   mode            – 'view' (xem/chữa), 'answer' (học sinh đang làm), 'result' (sau khi nộp)
 *   userRole        – 'teacher' | 'student'
 *   selectedAnswer  – đáp án đang chọn (mode answer/result)
 *   onSelectAnswer  – callback khi chọn đáp án
 *   showCorrect     – hiện đáp án đúng (teacher view hoặc sau khi chấm)
 */

import MarkdownRenderer from './MarkdownRenderer';
import FigureRenderer from './FigureRenderer';

const KEYS = ['A', 'B', 'C', 'D'];

// Kiểm tra choices có đủ ngắn để dùng 2 cột không
function usesTwoColumns(choices) {
  if (!choices) return false;
  const vals = KEYS.map(k => choices[k]).filter(Boolean);
  if (vals.length < 2) return false;
  return vals.every(v => v.length <= 72 && !v.includes('\n'));
}

function ExamChoice({ label, content, state, onClick }) {
  // state: 'default' | 'selected' | 'correct' | 'wrong'
  const stateStyles = {
    default:  'border-gray-300 bg-white',
    selected: 'border-blue-500 bg-blue-50/50',
    correct:  'border-green-500 bg-green-50',
    wrong:    'border-red-400 bg-red-50',
  };
  const labelStyles = {
    default:  'text-gray-600',
    selected: 'text-blue-700',
    correct:  'text-green-700',
    wrong:    'text-red-600',
  };

  return (
    <div
      onClick={onClick}
      className={`flex items-baseline gap-2.5 px-3.5 py-2.5 rounded-md border
        ${stateStyles[state]}
        ${onClick ? 'cursor-pointer hover:border-blue-400 active:bg-blue-100/60' : ''}
        transition-colors duration-100`}
    >
      <span className={`text-sm font-bold shrink-0 w-5 leading-6 ${labelStyles[state]}`}>
        {label}.
      </span>
      <div className="flex-1 min-w-0">
        <MarkdownRenderer content={content} compact />
      </div>
      {state === 'correct' && (
        <span className="shrink-0 text-green-600 text-xs font-semibold ml-1">✓</span>
      )}
    </div>
  );
}

export default function ExamProblemView({
  problem,
  mode = 'view',
  userRole = 'student',
  selectedAnswer = null,
  onSelectAnswer = null,
  showCorrect = false,
}) {
  if (!problem) return null;

  const isTeacher = userRole === 'teacher';
  const isMCQ = problem.problem_type === 'multiple_choice';
  const isTrueFalse = problem.problem_type === 'true_false';
  const twoCol = isMCQ && usesTwoColumns(problem.choices);

  function choiceState(k) {
    const correct = problem.correct_answer === k;
    const selected = selectedAnswer === k;

    if (mode === 'result') {
      if (correct) return 'correct';
      if (selected) return 'wrong';
      return 'default';
    }
    if (showCorrect && correct) return 'correct';
    if (mode === 'answer' && selected) return 'selected';
    return 'default';
  }

  return (
    <div className="space-y-4">
      {/* ── Đề bài ── */}
      <MarkdownRenderer content={problem.description} />

      {/* ── Hình vẽ ── */}
      {problem.figure_image && (
        <div className="flex justify-center py-2">
          <img
            src={`data:image/png;base64,${problem.figure_image}`}
            alt="Hình vẽ minh hoạ"
            className="max-w-full h-auto border border-gray-200 rounded bg-white"
            style={{ maxHeight: '380px' }}
          />
        </div>
      )}
      {!problem.figure_image && problem.figure_json && (
        <div className="flex justify-center py-2">
          <FigureRenderer data={problem.figure_json} />
        </div>
      )}

      {/* ── Phương án trắc nghiệm ── */}
      {isMCQ && problem.choices && (
        <div className={twoCol ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
          {KEYS.map(k => {
            if (!problem.choices[k]) return null;
            const canClick = mode === 'answer' && onSelectAnswer;
            return (
              <ExamChoice
                key={k}
                label={k}
                content={problem.choices[k]}
                state={choiceState(k)}
                onClick={canClick ? () => onSelectAnswer(k) : undefined}
              />
            );
          })}
        </div>
      )}

      {/* ── Đúng / Sai ── */}
      {isTrueFalse && mode === 'answer' && (
        <div className="flex gap-3 pt-1">
          {[['true', '✓ Đúng'], ['false', '✗ Sai']].map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => onSelectAnswer?.(v)}
              className={`flex-1 py-2.5 rounded-md border font-semibold text-sm transition-colors ${
                selectedAnswer === v
                  ? v === 'true'
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-red-400 bg-red-50 text-red-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Đáp án Đ/S sau khi nộp hoặc teacher xem ── */}
      {isTrueFalse && (showCorrect || mode === 'result') && problem.correct_answer && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-gray-500 font-medium">Đáp án đúng:</span>
          <span className={`px-3 py-1 rounded text-sm font-semibold ${
            problem.correct_answer === 'true'
              ? 'bg-green-50 text-green-700 border border-green-400'
              : 'bg-red-50 text-red-700 border border-red-400'
          }`}>
            {problem.correct_answer === 'true' ? '✓ Đúng' : '✗ Sai'}
          </span>
        </div>
      )}
    </div>
  );
}
