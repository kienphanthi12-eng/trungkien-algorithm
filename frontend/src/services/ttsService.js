import { API_BASE_URL, _authFetch } from './api';

/**
 * Gọi backend để tạo giọng đọc AI từ văn bản bằng Vbee TTS.
 * Nếu thành công, trả về link file âm thanh (audio_url).
 * Nếu Vbee bị cấu hình thiếu hoặc gặp lỗi, trả về string rỗng để frontend tự động chuyển sang Web Speech API fallback.
 */
export const synthesizeSpeech = async (token, text, voice = 'hn_female_thuha_vdts_44k', speed = 1.0) => {
  try {
    const response = await _authFetch(`${API_BASE_URL}/tts/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voice, speed }),
    }, token);

    if (!response.ok) {
      console.warn('Backend TTS Synthesis returned error status:', response.status);
      return '';
    }

    const data = await response.json();
    return data.audio_url || '';
  } catch (error) {
    console.error('Lỗi khi gọi API TTS:', error);
    return '';
  }
};
