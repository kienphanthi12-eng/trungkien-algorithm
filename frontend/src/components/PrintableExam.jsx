import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

const PrintableExam = React.forwardRef(({ exam }, ref) => {
  if (!exam) return null;

  // Handle both possible key names for questions
  const questions = exam.questions || exam.problems || [];
  console.log("[PrintableExam] Rendering questions:", questions.length);

  return (
    <div ref={ref} className="print-container bg-white p-[2cm] text-black font-serif" style={{ minHeight: '29.7cm' }}>
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
        <div className="text-center w-1/2">
          <p className="font-bold text-sm uppercase">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
          <p className="font-bold text-base uppercase border-b border-black inline-block pb-1 mb-2">TRƯỜNG THPT ZENTUS</p>
          <p className="text-xs italic">(Đề thi có {questions.length || 0} câu hỏi)</p>
        </div>
        <div className="text-center w-1/2">
          <p className="font-bold text-lg uppercase">KỲ THI KHẢO SÁT CHẤT LƯỢNG</p>
          <p className="font-bold text-sm uppercase">MÔN: {questions[0]?.category || 'TOÁN HỌC'}</p>
          <p className="text-sm">Thời gian làm bài: {exam.duration} phút</p>
        </div>
      </div>

      {/* Student Info Section */}
      <div className="mb-8 p-4 border border-black rounded-lg">
        <div className="flex gap-8 mb-4">
          <div className="flex-1 border-b border-dotted border-black">Họ và tên học sinh: </div>
          <div className="w-1/3 border-b border-dotted border-black">Số báo danh: </div>
        </div>
        <div className="flex gap-8">
          <div className="w-1/4 border-b border-dotted border-black">Lớp: </div>
          <div className="flex-1 font-bold text-right">Mã đề thi: {String(exam.id).substring(0, 3).toUpperCase()}</div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="space-y-6">
        {questions.map((q, idx) => (
          <div key={idx} className="question-item break-inside-avoid mb-4">
            <div className="flex gap-2 items-start mb-2">
              <span className="font-bold shrink-0">Câu {idx + 1}:</span>
              <div className="prose prose-slate max-w-none print-math">
                <MarkdownRenderer content={q.description} />
              </div>
            </div>

            {q.problem_type === 'multiple_choice' && q.choices && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 ml-8">
                {Object.entries(q.choices).map(([key, val]) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-bold">{key}.</span>
                    <MarkdownRenderer content={val} />
                  </div>
                ))}
              </div>
            )}

            {q.problem_type === 'true_false' && (
              <div className="ml-8 italic text-sm text-gray-600">
                (Chọn Đúng hoặc Sai cho mỗi ý)
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-300 text-center text-xs text-gray-500 italic">
        --- HẾT ---
        <p className="mt-2">(Học sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm)</p>
      </div>

      {/* CSS for print */}
      <style>{`
        @media print {
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .question-item {
            page-break-inside: avoid;
            margin-bottom: 1.5rem;
          }
          .print-math p {
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
});

export default PrintableExam;
