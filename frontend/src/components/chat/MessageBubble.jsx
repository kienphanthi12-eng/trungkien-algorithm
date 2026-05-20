import React from 'react';
import MarkdownRenderer from '../MarkdownRenderer';
import TtsBar from './TtsBar';
import { User, Award, CheckCircle2, HelpCircle } from 'lucide-react';

/**
 * Bong bóng chat hiển thị tin nhắn của Học sinh (User) hoặc Giáo Viên AI (Assistant).
 * Hiển thị cấu trúc JSON phức tạp từ DeepSeek: display, steps, question, speak.
 */
export default function MessageBubble({
  message,
  isPlaying = false,
  speed = 1.0,
  onSpeedChange,
  onTogglePlay,
}) {
  const { role, content } = message;
  const isUser = role === 'user';

  // Định dạng nội dung tin nhắn của học sinh (String thuần tuý)
  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end animate-slide-up-fade my-4">
        <div className="flex flex-col items-end max-w-[80%]">
          <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl rounded-tr-none shadow-md shadow-indigo-100 dark:shadow-none text-sm font-medium">
            {typeof content === 'string' ? content : content?.display || ''}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">Bạn</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner border border-indigo-200/20">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  // Định dạng tin nhắn của AI Giáo Viên (Bao gồm display, steps, question, speak)
  const data = typeof content === 'string' ? { display: content } : content || {};
  const { display = '', steps = [], question = '', speak = '' } = data;

  return (
    <div className="flex items-start gap-3 justify-start animate-slide-up-fade my-6">
      {/* Avatar Giáo Viên */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md animate-float border border-white/20">
        <Award className="w-5 h-5" />
      </div>

      <div className="flex flex-col items-start gap-3.5 max-w-[85%]">
        {/* Hộp thoại nội dung chính của Giáo Viên */}
        <div className="w-full bg-white dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/50 rounded-2xl rounded-tl-none shadow-sm p-4 flex flex-col gap-4">
          
          {/* Lời thoại chính (Markdown + LaTeX) */}
          {display && (
            <MarkdownRenderer
              content={display}
              className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
            />
          )}

          {/* Các bước hướng dẫn (Steps timeline) */}
          {steps && steps.length > 0 && (
            <div className="flex flex-col gap-2.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Các bước thực hiện:</span>
              <div className="flex flex-col gap-2">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <MarkdownRenderer
                      content={step}
                      compact
                      className="text-slate-700 dark:text-slate-300 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Câu hỏi gợi mở / Socratic Callout */}
          {question && (
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border-l-4 border-indigo-500 rounded-r-xl p-3 flex gap-2 items-start mt-1">
              <HelpCircle className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Câu hỏi gợi ý</span>
                <MarkdownRenderer
                  content={question}
                  compact
                  className="text-slate-800 dark:text-slate-200 text-sm font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* Thanh TTS Bar điều khiển đọc bên dưới bong bóng chat */}
        {speak && (
          <TtsBar
            isPlaying={isPlaying}
            speed={speed}
            onSpeedChange={onSpeedChange}
            onTogglePlay={() => onTogglePlay(speak)}
          />
        )}
      </div>
    </div>
  );
}
