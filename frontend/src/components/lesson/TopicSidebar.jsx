import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, PlayCircle, BookOpen } from 'lucide-react';

/**
 * Sidebar dạng Accordion hiển thị Chủ đề -> Bài học.
 * Tích hợp đo lường và hiển thị tiến trình hoàn thành bài học của học sinh.
 */
export default function TopicSidebar({
  currentLessonId,
  topics = [],
  progress = {},
  onSelectLesson,
}) {
  const [openTopicId, setOpenTopicId] = useState(null);

  // 1. Tự động mở rộng chủ đề chứa bài học đang hoạt động
  useEffect(() => {
    if (currentLessonId && topics.length > 0) {
      const activeTopic = topics.find((topic) =>
        topic.lessons?.some((lesson) => lesson.id === currentLessonId)
      );
      if (activeTopic) {
        setOpenTopicId(activeTopic.id);
      }
    }
  }, [currentLessonId, topics]);

  // 2. Tính toán tổng số phần trăm hoàn thành của môn học
  const totalLessons = topics.reduce((acc, topic) => acc + (topic.lessons?.length || 0), 0);
  const completedLessons = Object.values(progress).filter((p) => p.status === 'completed').length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const toggleTopic = (topicId) => {
    setOpenTopicId(openTopicId === topicId ? null : topicId);
  };

  const getStatusIcon = (lessonId) => {
    const status = progress[lessonId]?.status;
    if (status === 'completed') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
    } else if (status === 'in_progress') {
      return <PlayCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 animate-pulse" />;
    }
    return <Circle className="w-4 h-4 text-slate-300 dark:text-slate-700 flex-shrink-0" />;
  };

  return (
    <div className="w-80 border-r border-slate-200/50 dark:border-slate-800/60 bg-white dark:bg-slate-900/90 backdrop-blur-md flex flex-col h-full overflow-hidden">
      
      {/* Thông tin môn học & Tiến trình hoàn thành ở trên cùng */}
      <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">Nội Dung Chương Trình</h2>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Toán lớp 9</span>
          </div>
        </div>

        {/* Đồng hồ phần trăm tiến trình */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[11px] font-bold">
            <span className="text-slate-400 uppercase tracking-wide">Tiến độ hoàn thành:</span>
            <span className="text-indigo-600 dark:text-indigo-400">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/10 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Đã học {completedLessons}/{totalLessons} bài
          </span>
        </div>
      </div>

      {/* Accordion List Chủ đề -> Bài học */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin dark:scrollbar-thumb-slate-800">
        {topics.map((topic) => {
          const isOpen = openTopicId === topic.id;
          return (
            <div key={topic.id} className="border-b border-slate-100 dark:border-slate-800/40 last:border-b-0">
              {/* Tiêu đề chủ đề (Header) */}
              <button
                onClick={() => toggleTopic(topic.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all ${
                  isOpen
                    ? 'bg-indigo-50/30 dark:bg-slate-800/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex flex-col gap-0.5 max-w-[85%]">
                  <span className="text-xs font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                    Chủ đề {topic.order_index}
                  </span>
                  <span className="text-sm font-bold truncate leading-tight">{topic.title}</span>
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {/* Danh sách bài học của chủ đề */}
              {isOpen && (
                <div className="bg-slate-50/20 dark:bg-slate-950/10 py-1 border-t border-slate-100/50 dark:border-slate-800/20">
                  {topic.lessons && topic.lessons.length > 0 ? (
                    topic.lessons.map((lesson) => {
                      const isActive = lesson.id === currentLessonId;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => onSelectLesson(lesson.id)}
                          className={`w-full flex items-center gap-3 px-6 py-2.5 text-left text-xs font-semibold border-l-4 transition-all ${
                            isActive
                              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/15 text-indigo-600 dark:text-indigo-400 font-bold'
                              : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          {getStatusIcon(lesson.id)}
                          <span className="line-clamp-2 leading-snug">{lesson.title}</span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="block px-6 py-2.5 text-[11px] text-slate-400 italic">
                      Chưa có bài học nào
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
