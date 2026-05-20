import React, { useState, useEffect, useRef } from 'react';
import { useLessonChat } from '../../hooks/useLessonChat';
import MessageBubble from './MessageBubble';
import SuggestionBar from './SuggestionBar';
import { Send, Mic, MicOff, RefreshCw, Volume2, Sparkles, Loader2, Settings } from 'lucide-react';

/**
 * Cửa sổ học tập tương tác ChatWindow.
 * Tích hợp đầy đủ danh sách tin nhắn, tự động cuộn xuống, thanh gợi ý phản hồi,
 * nhận diện giọng nói tiếng Việt (Speech-to-Text), và điều chỉnh giọng TTS.
 */
export default function ChatWindow({ lessonId, mode }) {
  const {
    messages,
    loading,
    error,
    isPlaying,
    voice,
    speed,
    setVoice,
    setSpeed,
    sendMessage,
    playSpeech,
    stopSpeech,
    resetChat,
  } = useLessonChat(lessonId, mode);

  const [inputText, setInputText] = useState('');
  const [playingIdx, setPlayingIdx] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  // 1. Tự động cuộn xuống khi có tin nhắn mới hoặc đang tải
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // 2. Đồng bộ trạng thái audio đang phát với index tin nhắn
  useEffect(() => {
    if (!isPlaying) {
      setPlayingIdx(null);
    }
  }, [isPlaying]);

  // 3. Khởi tạo Speech Recognition (Nhận diện giọng nói)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'vi-VN';

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = (e) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        }
      };
      recognitionRef.current = rec;
    }
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      stopSpeech();
      recognitionRef.current.start();
    }
  };

  // 4. Xử lý gửi tin nhắn
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || loading) return;

    const textToSend = inputText;
    setInputText('');
    await sendMessage(textToSend);
  };

  const handleSelectSuggestion = async (sugText) => {
    if (loading) return;
    await sendMessage(sugText);
  };

  const handleTogglePlayBubble = (idx, speakText) => {
    if (playingIdx === idx) {
      stopSpeech();
      setPlayingIdx(null);
    } else {
      setPlayingIdx(idx);
      playSpeech(speakText);
    }
  };

  // Giọng đọc Vbee được hỗ trợ mặc định
  const voicesList = [
    { code: 'hn_female_thuha_vdts_44k', label: 'Cô Thu Hà (Hà Nội - Nữ)' },
    { code: 'hn_male_xuananh_vdts_48k-hs', label: 'Thầy Xuân Anh (Hà Nội - Nam)' },
    { code: 'hcm_female_mylan_vdts_44k', label: 'Cô Mỹ Lan (Sài Gòn - Nữ)' },
    { code: 'hcm_male_baoquoc_vdts_48k-hs', label: 'Thầy Bảo Quốc (Sài Gòn - Nam)' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/40 dark:bg-slate-950/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 overflow-hidden shadow-inner backdrop-blur-sm">
      
      {/* Header điều khiển và cấu hình */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Lớp Học AI Mathora
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Cài đặt giọng đọc */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border transition-all ${
              showSettings
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
            title="Cài đặt giọng đọc"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Làm mới phiên học */}
          <button
            onClick={resetChat}
            disabled={loading}
            className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            title="Học lại từ đầu"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tấm cài đặt giọng đọc trượt xuống */}
      {showSettings && (
        <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 animate-slide-up-fade flex flex-wrap gap-4 text-xs">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="font-bold text-slate-500 dark:text-slate-400">Chọn giọng đọc AI:</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 font-medium"
            >
              {voicesList.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-[120px]">
            <label className="font-bold text-slate-500 dark:text-slate-400">Tốc độ đọc:</label>
            <select
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="0.8">0.8x (Chậm)</option>
              <option value="1.0">1.0x (Chuẩn)</option>
              <option value="1.2">1.2x (Nhanh)</option>
              <option value="1.5">1.5x (Rất nhanh)</option>
            </select>
          </div>
        </div>
      )}

      {/* Khu vực hội thoại cuộn */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin dark:scrollbar-thumb-slate-800 scroll-smooth"
      >
        {messages.map((msg, idx) => (
          <MessageBubble
            key={idx}
            message={msg}
            isPlaying={playingIdx === idx}
            speed={speed}
            onSpeedChange={setSpeed}
            onTogglePlay={(speakText) => handleTogglePlayBubble(idx, speakText)}
          />
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 my-4 self-start animate-pulse text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thầy đang chuẩn bị bài học...</span>
          </div>
        )}

        {error && (
          <div className="my-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3.5 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center justify-between">
            <span>Đã xảy ra lỗi: {error}</span>
            <button onClick={resetChat} className="underline text-indigo-500 hover:text-indigo-600">Thử lại</button>
          </div>
        )}
      </div>

      {/* Thanh gợi ý phản hồi & Khung nhập liệu ở cuối */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-800/60 flex flex-col gap-3">
        {/* Lấy câu gợi mở của Giáo viên làm suggestions */}
        {!loading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
          <SuggestionBar
            suggestions={messages[messages.length - 1]?.content?.suggestions || []}
            onSelect={handleSelectSuggestion}
          />
        )}

        {/* Khung nhập text */}
        <form onSubmit={handleSend} className="flex gap-2">
          {/* Nhận diện giọng nói */}
          {recognitionRef.current && (
            <button
              type="button"
              onClick={handleToggleListening}
              className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-rose-500 hover:bg-rose-600 border-rose-500 text-white animate-pulse'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}
              title={isListening ? 'Đang lắng nghe... Nhấn để dừng' : 'Nói câu trả lời của bạn'}
            >
              {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
            </button>
          )}

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            placeholder={isListening ? 'Hãy nói câu trả lời của em...' : 'Nhập câu trả lời hoặc câu hỏi cho Thầy...'}
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-400 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-md shadow-indigo-100 dark:shadow-none"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
