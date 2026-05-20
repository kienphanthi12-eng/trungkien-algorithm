import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as lessonService from '../services/lessonService';

/**
 * Custom hook quản lý trạng thái tải môn học, chủ đề, bài học và tiến độ.
 */
export const useLesson = (subjectId = null, lessonId = null) => {
  const { token, user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Tải danh sách môn học
  const fetchSubjects = useCallback(async (grade = 9) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await lessonService.getSubjects(token, grade);
      setSubjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // 2. Tải danh sách chủ đề kèm bài học (gộp trong Promise.all để tối ưu hoá số lần render)
  const fetchTopicsAndLessons = useCallback(async (subId) => {
    if (!token || !subId) return;
    setLoading(true);
    setError(null);
    try {
      const topicsData = await lessonService.getTopics(token, subId);
      const topicsWithLessons = await Promise.all(
        topicsData.map(async (topic) => {
          try {
            const lessonsData = await lessonService.getLessons(token, topic.id);
            return { ...topic, lessons: lessonsData };
          } catch {
            return { ...topic, lessons: [] };
          }
        })
      );
      setTopics(topicsWithLessons);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // 3. Tải chi tiết một bài học
  const fetchLessonDetail = useCallback(async (lesId) => {
    if (!token || !lesId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await lessonService.getLesson(token, lesId);
      setCurrentLesson(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // 4. Tải tiến trình học tập của học sinh
  const fetchUserProgress = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      const data = await lessonService.getLearningProgress(token, user.id);
      const progressMap = {};
      data.forEach((p) => {
        progressMap[p.lesson_id] = p;
      });
      setProgress(progressMap);
    } catch (err) {
      console.error('Không thể tải tiến trình học:', err);
    }
  }, [token, user]);

  // 5. Cập nhật tiến độ bài học
  const updateProgress = useCallback(async (lesId, status, score = null, timeSpent = null) => {
    if (!token || !user?.id) return null;
    try {
      const data = await lessonService.upsertLearningProgress(token, {
        user_id: user.id,
        lesson_id: lesId,
        status,
        score,
        time_spent: timeSpent,
      });
      setProgress((prev) => ({
        ...prev,
        [lesId]: data,
      }));
      return data;
    } catch (err) {
      console.error('Không thể cập nhật tiến trình học:', err);
      return null;
    }
  }, [token, user]);

  // Tự động tải danh sách môn học & tiến độ của user khi token hợp lệ
  useEffect(() => {
    if (token) {
      fetchSubjects();
      fetchUserProgress();
    }
  }, [token, fetchSubjects, fetchUserProgress]);

  // Tự động tải chủ đề nếu subjectId thay đổi
  useEffect(() => {
    if (token && subjectId) {
      fetchTopicsAndLessons(subjectId);
    }
  }, [token, subjectId, fetchTopicsAndLessons]);

  // Tự động tải thông tin bài học nếu lessonId thay đổi
  useEffect(() => {
    if (token && lessonId) {
      fetchLessonDetail(lessonId);
    } else {
      setCurrentLesson(null);
    }
  }, [token, lessonId, fetchLessonDetail]);

  return {
    subjects,
    topics,
    currentLesson,
    progress,
    loading,
    error,
    fetchSubjects,
    fetchTopicsAndLessons,
    fetchLessonDetail,
    fetchUserProgress,
    updateProgress,
  };
};
