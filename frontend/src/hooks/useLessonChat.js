import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendLessonMessage, getLessonSession } from '../services/chatService';
import { synthesizeSpeech } from '../services/ttsService';

/**
 * Custom hook quản lý cuộc trò chuyện học tập với AI Giáo Viên theo từng chế độ học.
 */
export const useLessonChat = (lessonId, mode) => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cấu hình âm thanh & Trạng thái phát TTS
  const [voice, setVoice] = useState('hn_female_thuha_vdts_44k');
  const [speed, setSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const utteranceRef = useRef(null);

  // Dừng phát âm thanh ngay lập tức
  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  // Hỗ trợ Web Speech API fallback
  const playBrowserSpeech = useCallback((text) => {
    if (!window.speechSynthesis) {
      setIsPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = speed;
    utteranceRef.current = utterance;

    utterance.onend = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
    };

    // Tìm giọng đọc tiếng Việt nếu trình duyệt hỗ trợ
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.startsWith('vi'));
    if (viVoice) utterance.voice = viVoice;

    window.speechSynthesis.speak(utterance);
  }, [speed]);

  // Phát giọng đọc từ văn bản
  const playSpeech = useCallback(async (text) => {
    stopSpeech();
    if (!text || !token) return;

    setIsPlaying(true);
    // 1. Thử phát qua Vbee TTS API
    const audioUrl = await synthesizeSpeech(token, text, voice, speed);
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.playbackRate = speed;
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        // Nếu file âm thanh lỗi, dùng Web Speech API làm fallback
        playBrowserSpeech(text);
      };
      try {
        await audio.play();
      } catch (err) {
        console.warn('Lỗi play audio qua Vbee, chuyển sang Web Speech:', err);
        playBrowserSpeech(text);
      }
    } else {
      // 2. Không có Vbee audio URL, dùng Web Speech API
      playBrowserSpeech(text);
    }
  }, [token, voice, speed, stopSpeech, playBrowserSpeech]);

  // Tải lịch sử cuộc hội thoại
  const initializeChat = useCallback(async () => {
    if (!token || !user?.id || !lessonId) return;
    setLoading(true);
    setError(null);
    try {
      const session = await getLessonSession(token, { lesson_id: lessonId, mode, user_id: user.id });
      if (session.messages && session.messages.length > 0) {
        // Ép kiểu tin nhắn từ DB (nếu là dạng string JSON thì cần parse)
        const parsedMsgs = session.messages.map(msg => {
          let content = msg.content;
          if (typeof content === 'string' && content.startsWith('{')) {
            try {
              content = JSON.parse(content);
            } catch {}
          }
          return { ...msg, content };
        });
        setMessages(parsedMsgs);
      } else {
        // Phiên mới hoàn toàn - gửi tin nhắn rỗng để AI Giáo Viên mở đầu chào
        const reply = await sendLessonMessage(token, {
          messages: [],
          lesson_id: lessonId,
          mode,
          user_id: user.id
        });
        const initialAiMsg = { role: 'assistant', content: reply };
        setMessages([initialAiMsg]);
        if (reply.speak) {
          playSpeech(reply.speak);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, user, lessonId, mode, playSpeech]);

  // Gửi tin nhắn học sinh phản hồi
  const sendMessage = useCallback(async (text) => {
    if (!token || !user?.id || !lessonId || !text.trim()) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);
    setError(null);
    stopSpeech();

    try {
      const reply = await sendLessonMessage(token, {
        messages: updatedMessages,
        lesson_id: lessonId,
        mode,
        user_id: user.id
      });
      const aiMsg = { role: 'assistant', content: reply };
      setMessages([...updatedMessages, aiMsg]);

      if (reply.speak) {
        playSpeech(reply.speak);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, user, lessonId, mode, messages, playSpeech, stopSpeech]);

  // Trình dọn dẹp khi thay đổi trang / tắt component
  useEffect(() => {
    initializeChat();
    return () => {
      stopSpeech();
    };
  }, [lessonId, mode, initializeChat, stopSpeech]);

  return {
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
    resetChat: initializeChat,
  };
};
