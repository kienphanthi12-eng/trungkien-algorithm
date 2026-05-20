import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLesson } from '../hooks/useLesson';
import { useAuth } from '../contexts/AuthContext';
import TopicSidebar from '../components/lesson/TopicSidebar';
import LessonTabs from '../components/lesson/LessonTabs';
import { ArrowLeft, BookOpen, Loader2, AlertCircle } from 'lucide-react';

export default function LessonPage() {
  const { subjectId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    topics,
    currentLesson,
    progress,
    loading,
    error,
    fetchTopicsAndLessons,
    fetchLessonDetail,
    updateProgress,
  } = useLesson(subjectId, lessonId);

  // Load topics when subjectId changes
  useEffect(() => {
    if (subjectId) {
      fetchTopicsAndLessons(subjectId);
    }
  }, [subjectId, fetchTopicsAndLessons]);

  // Load lesson detail when lessonId changes
  useEffect(() => {
    if (lessonId) {
      fetchLessonDetail(lessonId);
    }
  }, [lessonId, fetchLessonDetail]);

  // Mark lesson as in_progress on enter
  useEffect(() => {
    if (lessonId && user?.id && progress[lessonId]?.status !== 'in_progress' && progress[lessonId]?.status !== 'completed') {
      updateProgress(lessonId, 'in_progress');
    }
  }, [lessonId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectLesson = (id) => {
    navigate(`/learn/${subjectId}/${id}`);
  };

  const handleMarkComplete = async (id) => {
    await updateProgress(id, 'completed', 100);
  };

  const currentProgress = progress[lessonId];

  return (
    <div className="flex h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* Left: Topic Sidebar */}
      <TopicSidebar
        currentLessonId={lessonId}
        topics={topics}
        progress={progress}
        onSelectLesson={handleSelectLesson}
      />

      {/* Right: Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Breadcrumb header */}
        <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/60 shadow-sm">
          <button
            onClick={() => navigate(`/learn/${subjectId}`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Quay lại danh sách bài"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            {loading && !currentLesson ? (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            ) : (
              <h1 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 truncate">
                {currentLesson?.title || 'Đang tải bài học...'}
              </h1>
            )}
          </div>

          {currentLesson?.objectives?.length > 0 && (
            <div className="hidden md:flex items-center gap-1 ml-auto text-[10px] font-semibold text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
              🎯 {currentLesson.objectives[0]}
              {currentLesson.objectives.length > 1 && (
                <span className="ml-1 text-indigo-400">+{currentLesson.objectives.length - 1}</span>
              )}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden p-4">
          {error && (
            <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl p-4 mb-4 text-sm text-rose-600 dark:text-rose-400 font-semibold">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!lessonId ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
              <BookOpen className="w-12 h-12 opacity-30" />
              <p className="text-sm font-semibold">Chọn một bài học từ danh sách bên trái để bắt đầu.</p>
            </div>
          ) : (
            <LessonTabs
              lessonId={lessonId}
              progressStatus={currentProgress?.status}
              onMarkComplete={handleMarkComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
