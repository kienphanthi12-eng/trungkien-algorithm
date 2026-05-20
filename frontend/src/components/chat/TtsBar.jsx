import React from 'react';
import { Play, Square, Volume2, FastForward } from 'lucide-react';

/**
 * Thanh điều khiển đọc bài giảng AI TTS.
 * Hỗ trợ chọn tốc độ đọc (0.8x - 1.5x), bật/tắt phát âm và hiển thị sóng âm động.
 */
export default function TtsBar({ isPlaying, speed, onSpeedChange, onTogglePlay, disabled = false }) {
  const speeds = [0.8, 1.0, 1.2, 1.5];

  return (
    <div className="flex items-center gap-3 py-1.5 px-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-slate-800/40 w-fit animate-slide-up-fade shadow-sm">
      {/* Sóng âm động (Soundwave visualizer) */}
      <div className="flex items-end gap-0.5 h-4 w-6 px-1 justify-center">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            className={`w-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-300 ${
              isPlaying ? 'animate-soundwave' : ''
            }`}
            style={{
              animationDelay: `${i * 0.15}s`,
              height: isPlaying ? undefined : '4px',
            }}
          />
        ))}
      </div>

      {/* Nút Play / Stop */}
      <button
        onClick={onTogglePlay}
        disabled={disabled}
        className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
          isPlaying
            ? 'bg-rose-500 hover:bg-rose-600 text-white'
            : 'bg-indigo-500 hover:bg-indigo-600 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-sm`}
        title={isPlaying ? 'Dừng đọc' : 'Nghe bài giảng'}
      >
        {isPlaying ? (
          <Square className="w-3 h-3 fill-current" />
        ) : (
          <Play className="w-3 h-3 fill-current ml-0.5" />
        )}
      </button>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

      {/* Điều chỉnh tốc độ */}
      <div className="flex items-center gap-1.5">
        <FastForward className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              disabled={disabled}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all ${
                speed === s
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
