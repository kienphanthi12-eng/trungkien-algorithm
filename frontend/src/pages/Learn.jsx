import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLesson } from '../hooks/useLesson';
import { BookOpen, ChevronRight, Loader2, AlertCircle, GraduationCap } from 'lucide-react';

export default function Learn() {
  const navigate = useNavigate();
  const { subjects, progress, loading, error, fetchSubjects } = useLesson();

  useEffect(() => {
    fetchSubjects(9);
  }, [fetchSubjects]);

  const getSubjectProgress = (subjectId) => {
    const entries = Object.values(progress).filter((p) => p.subject_id === subjectId);
    const total = entries.length;
    const completed = entries.filter((p) => p.status === 'completed').length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10 flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Học cùng AI Giáo Viên
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Chọn môn học để bắt đầu hành trình chinh phục Toán lớp 9 cùng Thầy AI Mathora.
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <span className="text-sm font-semibold">Đang tải danh sách môn học...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl p-4 text-sm text-rose-600 dark:text-rose-400 font-semibold">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Không thể tải môn học: {error}</span>
          </div>
        )}

        {/* Subjects grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((subject) => {
              const pct = getSubjectProgress(subject.id);
              return (
                <button
                  key={subject.id}
                  onClick={() => navigate(`/learn/${subject.id}`)}
                  className="group relative flex flex-col gap-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 text-left shadow-sm hover:shadow-xl hover:shadow-indigo-100/40 dark:hover:shadow-none hover:-translate-y-1 transition-all duration-200 active:scale-98 overflow-hidden"
                >
                  {/* Decorative gradient blob */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/60 group-hover:to-violet-50/20 dark:group-hover:from-indigo-950/20 dark:group-hover:to-slate-950/0 transition-all duration-300 rounded-2xl" />

                  <div className="relative flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl" role="img" aria-label={subject.name}>
                        {subject.icon || '📚'}
                      </span>
                      <div>
                        <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest mb-0.5">
                          Toán lớp {subject.grade}
                        </p>
                        <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                          {subject.name}
                        </h3>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-1" />
                  </div>

                  {/* Progress bar */}
                  <div className="relative flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400 uppercase tracking-wide">Tiến độ</span>
                      <span className={pct > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300'}>
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}

            {subjects.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <BookOpen className="w-10 h-10 opacity-30" />
                <p className="text-sm font-semibold">Chưa có môn học nào. Vui lòng kiểm tra lại sau.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
