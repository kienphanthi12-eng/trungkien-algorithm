import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLesson } from '../hooks/useLesson';
import {
  BarChart2, Clock, Flame, Star, CheckCircle2,
  BookOpen, PlayCircle, ArrowRight, Loader2, AlertCircle, Trophy,
} from 'lucide-react';

export default function Progress() {
  const navigate = useNavigate();
  const { subjects, topics, progress, loading, error, fetchSubjects, fetchTopicsAndLessons, fetchUserProgress } = useLesson();

  useEffect(() => {
    fetchSubjects(9);
    fetchUserProgress();
  }, [fetchSubjects, fetchUserProgress]);

  // Load all topics for all subjects to calculate totals
  useEffect(() => {
    subjects.forEach((s) => fetchTopicsAndLessons(s.id));
  }, [subjects, fetchTopicsAndLessons]);

  const stats = useMemo(() => {
    const entries = Object.values(progress);
    const completed = entries.filter((p) => p.status === 'completed').length;
    const totalTime = entries.reduce((sum, p) => sum + (p.time_spent || 0), 0);
    const avgScore = entries.length > 0
      ? Math.round(entries.filter((p) => p.score > 0).reduce((s, p) => s + (p.score || 0), 0) / Math.max(entries.filter((p) => p.score > 0).length, 1))
      : 0;
    return { completed, totalTime, avgScore };
  }, [progress]);

  const allLessons = useMemo(() => {
    return topics.flatMap((t) => (t.lessons || []).map((l) => ({ ...l, topicTitle: t.title })));
  }, [topics]);

  const recentProgress = useMemo(() => {
    return Object.values(progress)
      .sort((a, b) => new Date(b.last_accessed_at) - new Date(a.last_accessed_at))
      .slice(0, 5)
      .map((p) => {
        const lesson = allLessons.find((l) => l.id === p.lesson_id);
        return lesson ? { ...p, lesson } : null;
      })
      .filter(Boolean);
  }, [progress, allLessons]);

  const suggestions = useMemo(() => {
    return allLessons
      .filter((l) => !progress[l.id] || progress[l.id].status === 'not_started' || progress[l.id].status === 'in_progress')
      .slice(0, 3);
  }, [allLessons, progress]);

  const subjectProgress = useMemo(() => {
    return subjects.map((s) => {
      const subjectLessons = allLessons.filter((l) => {
        const topic = topics.find((t) => t.lessons?.some((tl) => tl.id === l.id));
        return topic?.subject_id === s.id;
      });
      const total = subjectLessons.length;
      const completed = subjectLessons.filter((l) => progress[l.id]?.status === 'completed').length;
      return { ...s, total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });
  }, [subjects, allLessons, topics, progress]);

  const formatTime = (seconds) => {
    if (!seconds) return '0 phút';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} phút`;
  };

  const statusLabel = (status) => {
    if (status === 'completed') return { label: 'Hoàn thành', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40' };
    if (status === 'in_progress') return { label: 'Đang học', color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800/40' };
    return { label: 'Chưa học', color: 'text-slate-500 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-200 dark:shadow-none">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Tiến độ học tập
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Theo dõi hành trình chinh phục Toán của bạn cùng Mathora AI.
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 py-8 text-slate-400 justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-sm font-semibold">Đang tải tiến độ...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl p-4 text-sm text-rose-600 dark:text-rose-400 font-semibold">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: CheckCircle2, label: 'Bài đã hoàn thành', value: stats.completed, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
            { icon: Clock, label: 'Tổng thời gian học', value: formatTime(stats.totalTime), color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' },
            { icon: Flame, label: 'Streak hôm nay', value: '1 ngày 🔥', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20' },
            { icon: Star, label: 'Điểm trung bình', value: stats.avgScore > 0 ? `${stats.avgScore}/100` : '—', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/60 flex flex-col gap-2`}>
              <Icon className={`w-5 h-5 ${color}`} />
              <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{value}</p>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Subject progress */}
        {subjectProgress.length > 0 && (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              Tiến độ theo môn
            </h2>
            <div className="space-y-4">
              {subjectProgress.map((s) => (
                <div key={s.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span>{s.icon || '📚'}</span>
                      {s.name}
                    </span>
                    <span className="text-slate-400">
                      {s.completed}/{s.total} bài · <span className="text-indigo-600 dark:text-indigo-400">{s.pct}%</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent lessons */}
        {recentProgress.length > 0 && (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Bài học gần đây
            </h2>
            <div className="space-y-2">
              {recentProgress.map(({ lesson, status, last_accessed_at }) => {
                const s = statusLabel(status);
                return (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BookOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{lesson.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(last_accessed_at).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wide border rounded-full px-2.5 py-1 ${s.color}`}>
                        {s.label}
                      </span>
                      {status !== 'completed' && (
                        <button
                          onClick={() => navigate(`/learn/${lesson.subject_id || ''}/${lesson.id}`)}
                          className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Học tiếp <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-emerald-500" />
              Gợi ý học tiếp
            </h2>
            <div className="space-y-3">
              {suggestions.map((lesson) => {
                const p = progress[lesson.id];
                const isInProgress = p?.status === 'in_progress';
                return (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl ${isInProgress ? 'bg-indigo-50 dark:bg-indigo-950/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        {isInProgress
                          ? <PlayCircle className="w-4 h-4 text-indigo-500" />
                          : <BookOpen className="w-4 h-4 text-slate-400" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{lesson.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{lesson.topicTitle}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/learn/${lesson.subject_id || ''}/${lesson.id}`)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all active:scale-95 flex-shrink-0"
                    >
                      {isInProgress ? 'Tiếp tục' : 'Bắt đầu'} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
