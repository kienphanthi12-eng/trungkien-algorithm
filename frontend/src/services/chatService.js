import { API_BASE_URL, _authFetch } from './api';

/**
 * Gửi tin nhắn đến AI Giáo Viên theo chế độ học (giang, socrates, luyen).
 * Chế độ KHÔNG STREAM (non-streaming).
 * Trả về JSON: { speak, display, steps[], question }
 */
export const sendLessonMessage = async (token, { messages, lesson_id, mode, user_id }) => {
  const response = await _authFetch(`${API_BASE_URL}/chat/lesson`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      lesson_id,
      mode,
      user_id,
      stream: false,
    }),
  }, token);

  if (!response.ok) {
    throw new Error('Không thể kết nối đến AI Giáo Viên');
  }

  const data = await response.json();
  return data.reply; // Đã là dict: { speak, display, steps, question }
};

/**
 * Gửi tin nhắn đến AI Giáo Viên dạng STREAM.
 * Nhận callback onChunk khi có chunk mới, onComplete khi kết thúc, và onError khi gặp lỗi.
 */
export const streamLessonMessage = async (token, { messages, lesson_id, mode, user_id }, onChunk, onComplete, onError) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/lesson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages,
        lesson_id,
        mode,
        user_id,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Không thể kết nối stream AI');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let accumulatedText = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: !done });
        accumulatedText += chunk;
        onChunk(chunk, accumulatedText);
      }
    }

    onComplete(accumulatedText);
  } catch (error) {
    console.error('Lỗi trong quá trình stream:', error);
    if (onError) onError(error);
  }
};

/**
 * Tải lịch sử tin nhắn của phiên học hiện tại.
 */
export const getLessonSession = async (token, { lesson_id, mode, user_id }) => {
  const response = await _authFetch(
    `${API_BASE_URL}/chat/lesson/session?lesson_id=${lesson_id}&mode=${mode}&user_id=${user_id}`,
    {
      method: 'GET',
    },
    token
  );

  if (!response.ok) {
    throw new Error('Không thể tải lịch sử phiên học');
  }

  return response.json(); // { id, messages: [...] }
};

