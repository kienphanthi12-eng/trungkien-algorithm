import { API_BASE_URL, _authFetch } from './api';

/**
 * Lấy danh sách môn học, lọc theo khối lớp.
 */
export const getSubjects = async (token, grade = 9) => {
  const response = await _authFetch(`${API_BASE_URL}/lessons/subjects?grade=${grade}`, {
    method: 'GET',
  }, token);
  if (!response.ok) {
    throw new Error('Không thể tải danh sách môn học');
  }
  return response.json();
};

/**
 * Lấy danh sách chủ đề theo môn học.
 */
export const getTopics = async (token, subjectId) => {
  const response = await _authFetch(`${API_BASE_URL}/lessons/subjects/${subjectId}/topics`, {
    method: 'GET',
  }, token);
  if (!response.ok) {
    throw new Error('Không thể tải danh sách chủ đề');
  }
  return response.json();
};

/**
 * Lấy danh sách bài học theo chủ đề.
 */
export const getLessons = async (token, topicId) => {
  const response = await _authFetch(`${API_BASE_URL}/lessons/topics/${topicId}/lessons`, {
    method: 'GET',
  }, token);
  if (!response.ok) {
    throw new Error('Không thể tải danh sách bài học');
  }
  return response.json();
};

/**
 * Lấy thông tin chi tiết của một bài học.
 */
export const getLesson = async (token, lessonId) => {
  const response = await _authFetch(`${API_BASE_URL}/lessons/${lessonId}`, {
    method: 'GET',
  }, token);
  if (!response.ok) {
    throw new Error('Không thể tải chi tiết bài học');
  }
  return response.json();
};

/**
 * Lấy tiến trình học tập của học sinh.
 */
export const getLearningProgress = async (token, userId) => {
  const response = await _authFetch(`${API_BASE_URL}/lessons/progress/${userId}`, {
    method: 'GET',
  }, token);
  if (!response.ok) {
    throw new Error('Không thể tải tiến độ học tập');
  }
  return response.json();
};

/**
 * Cập nhật hoặc lưu tiến trình học tập của học sinh cho bài học cụ thể.
 * progressData: { user_id, lesson_id, status: 'not_started'|'in_progress'|'completed', score, time_spent }
 */
export const upsertLearningProgress = async (token, progressData) => {
  const response = await _authFetch(`${API_BASE_URL}/lessons/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(progressData),
  }, token);
  if (!response.ok) {
    throw new Error('Không thể cập nhật tiến độ học tập');
  }
  return response.json();
};
