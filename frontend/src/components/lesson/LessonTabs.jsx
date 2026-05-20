import React, { useState } from 'react';
import ChatWindow from '../chat/ChatWindow';
import { BookOpen, MessagesSquare, CheckSquare, Award, Star } from 'lucide-react';

/**
 * Component quản lý các chế độ học tập (Tabs switcher).
 * Chuyển đổi giữa: Giảng bài (giang), Socrates (socrates), Luyện tập (luyen).
 * Cách tách biệt state: Sử dụng key={`${lessonId}-${mode}`} cho từng ChatWindow.
 */
export default function LessonTabs({ lessonId, progressStatus, onMarkComplete }) {
  const [activeTab, setActiveTab] = useState('giang');

  const tabs = [
    {
      id: 'giang',
      label: '📖 Giảng lý thuyết',
      desc: 'Giáo viên AI giảng giải khái niệm, định lý và công thức trọng tâm.',
    },
    {
      id: 'socrates',
      label: '💬 Socrates hỏi đáp',
      desc: 'Học tương tác qua ví dụ, Giáo viên AI đặt câu hỏi dẫn dắt để bạn tự hiểu.',
    },
    {
      id: 'luyen',
      label: '🧩 Luyện tập & Đánh giá',
      desc: 'Tự luyện các bài tập vận dụng từ cơ bản đến nâng cao để ghi nhớ sâu.',
    },
  ];

  const handleMarkComplete = () => {
    if (onMarkComplete) {
      onMarkComplete(lessonId);
    }
  };

  const isCompleted = progressStatus === 'completed';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-lg overflow-hidden">
      
      {/* Thanh chọn Tab & Nút Hoàn thành */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200/50 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/10 px-4 py-2 gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/20'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Nút đánh dấu hoàn thành bài học (gamification) */}
        <button
          onClick={handleMarkComplete}
          disabled={isCompleted}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white hover:scale-102 hover:shadow-emerald-100 dark:hover:shadow-none'
          }`}
        >
          <Award className={`w-4 h-4 ${isCompleted ? 'animate-bounce' : ''}`} />
          <span>{isCompleted ? 'Đã hoàn thành! 🎉' : 'Hoàn thành bài học 🎯'}</span>
        </button>
      </div>

      {/* Mô tả ngắn về chế độ đang chọn */}
      <div className="px-4 py-2.5 bg-slate-50/30 dark:bg-slate-950/10 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 select-none">
        <Star className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
        <span>{tabs.find((t) => t.id === activeTab)?.desc}</span>
      </div>

      {/* Khung chat cho từng chế độ được bảo toàn state qua key */}
      <div className="flex-1 overflow-hidden p-4 bg-slate-50/10 dark:bg-slate-950/5">
        <ChatWindow key={`${lessonId}-${activeTab}`} lessonId={lessonId} mode={activeTab} />
      </div>
    </div>
  );
}
