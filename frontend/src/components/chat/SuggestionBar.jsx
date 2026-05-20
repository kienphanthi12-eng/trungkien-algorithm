import React from 'react';
import { Lightbulb } from 'lucide-react';

/**
 * Thanh gợi ý câu trả lời nhanh (Suggestion Bar).
 * Học sinh có thể nhấn vào để gửi câu trả lời hoặc yêu cầu trợ giúp nhanh chóng.
 */
export default function SuggestionBar({ suggestions = [], onSelect }) {
  // Các câu gợi ý mặc định nếu AI không chỉ định cụ thể
  const defaultSuggestions = [
    'Thầy hướng dẫn bước tiếp theo đi ạ! 🧭',
    'Em chưa hiểu rõ bước này lắm, thầy giảng lại được không? 📚',
    'Em làm đúng hướng chưa thầy? 🎯',
    'Thầy lấy một ví dụ tương tự được không? 💡',
    'Bài toán này có những cách giải nào khác nữa thầy? 🧩',
  ];

  const listToRender = suggestions && suggestions.length > 0 ? suggestions : defaultSuggestions;

  return (
    <div className="flex flex-col gap-2 animate-slide-up-fade px-1">
      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
        <span>Gợi ý trả lời nhanh:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 mask-image-horizontal">
        <div className="flex gap-2 flex-nowrap">
          {listToRender.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(sug)}
              className="flex-shrink-0 text-xs px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-900/60 dark:hover:bg-indigo-950/20 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/50 dark:border-slate-800/80 transition-all font-medium active:scale-95 shadow-sm"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
