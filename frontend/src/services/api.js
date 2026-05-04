// Backend URL updated to Railway production
const API_BASE_URL = 'https://trungkien-algorithm-production.up.railway.app';

// ─── 401 Auto-Refresh Interceptor ────────────────────────────────────────────
// AuthContext calls setRefreshCallback(doRefresh) on mount so that any 401
// response automatically triggers a token refresh and retries the request.
let _refreshCallback = null;
let _logoutCallback = null;
let _isRefreshing = false;
let _refreshQueue = [];

export function setApiCallbacks({ onRefresh, onLogout }) {
  _refreshCallback = onRefresh;
  _logoutCallback = onLogout;
}

async function _doRefreshOnce() {
  if (_isRefreshing) {
    // Queue callers while a refresh is already in flight
    return new Promise((resolve, reject) => {
      _refreshQueue.push({ resolve, reject });
    });
  }
  _isRefreshing = true;
  try {
    const newToken = _refreshCallback ? await _refreshCallback() : null;
    _refreshQueue.forEach(({ resolve }) => resolve(newToken));
    return newToken;
  } catch (err) {
    _refreshQueue.forEach(({ reject }) => reject(err));
    throw err;
  } finally {
    _isRefreshing = false;
    _refreshQueue = [];
  }
}

// Central fetch wrapper: retries once with a fresh token on 401.
async function _authFetch(url, init, token) {
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 && _refreshCallback) {
    const newToken = await _doRefreshOnce();
    if (newToken) {
      return fetch(url, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${newToken}` },
      });
    }
    // Refresh failed — force logout
    if (_logoutCallback) _logoutCallback();
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  return response;
}

export async function refreshToken(refresh_token) {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  });
  if (!response.ok) throw new Error('Refresh failed');
  return response.json(); // { access_token, refresh_token }
}

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Đăng nhập thất bại');
  }
  
  return response.json();
}

export async function register(email, password, name, role) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name, role }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error("api.js register error response:", error, "Status:", response.status);
    throw new Error(error.detail || 'Đăng ký thất bại');
  }
  
  return response.json();
}

export async function getMe(token) {
  const response = await _authFetch(`${API_BASE_URL}/auth/me`, { method: 'GET', headers: {} }, token);
  if (!response.ok) {
    let errorDetail = 'Lỗi xác thực (Unauthorized)';
    try { const e = await response.json(); errorDetail = e.detail || errorDetail; } catch {}
    throw new Error(errorDetail);
  }
  return response.json();
}

export async function getStudents(token) {
  const response = await _authFetch(`${API_BASE_URL}/students/`, { method: 'GET', headers: {} }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi tải danh sách học sinh'); }
  return response.json();
}

export async function addStudent(token, email) {
  const response = await _authFetch(`${API_BASE_URL}/students/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
  }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi thêm học sinh'); }
  return response.json();
}

export async function removeStudent(token, studentId) {
  const response = await _authFetch(`${API_BASE_URL}/students/${studentId}`, { method: 'DELETE', headers: {} }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi xóa học sinh'); }
  return response.json();
}

// Problem API functions
export async function generateProblem(token, prompt) {
  const response = await _authFetch(`${API_BASE_URL}/problems/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }),
  }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi tạo bài toán bằng AI'); }
  return response.json();
}

export async function generateProblemsBulk(token, prompt, count) {
  const response = await _authFetch(`${API_BASE_URL}/problems/generate-bulk`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, count }),
  }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi tạo hàng loạt bằng AI'); }
  return response.json();
}

export async function getProblems(token, skip = 0, limit = 10, difficulty = null, category = null) {
  let url = `${API_BASE_URL}/problems/?skip=${skip}&limit=${limit}`;
  if (difficulty) url += `&difficulty=${difficulty}`;
  if (category) url += `&category=${category}`;
  const response = await _authFetch(url, { method: 'GET', headers: {} }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi tải danh sách bài toán'); }
  return response.json();
}

export async function getProblem(token, problemId) {
  const response = await _authFetch(`${API_BASE_URL}/problems/${problemId}`, { method: 'GET', headers: {} }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi tải bài toán'); }
  return response.json();
}

export async function createProblem(token, problemData) {
  const response = await _authFetch(`${API_BASE_URL}/problems/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(problemData),
  }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi tạo bài toán'); }
  return response.json();
}

export async function updateProblem(token, problemId, problemData) {
  const response = await _authFetch(`${API_BASE_URL}/problems/${problemId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(problemData),
  }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi cập nhật bài toán'); }
  return response.json();
}

// Helper: parse error detail safely
async function _parseError(response, fallback) {
  try {
    const err = await response.json();
    return err.detail || fallback;
  } catch {
    return `${fallback} (HTTP ${response.status})`;
  }
}

// Exam API functions
export async function getExams(token, skip = 0, limit = 10) {
  if (!token) throw new Error('Chưa đăng nhập');
  const response = await _authFetch(`${API_BASE_URL}/exams/?skip=${skip}&limit=${limit}`, { method: 'GET', headers: {} }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi tải danh sách đề thi'));
  return response.json();
}

export async function getExam(token, examId) {
  if (!token) throw new Error('Chưa đăng nhập');
  const response = await _authFetch(`${API_BASE_URL}/exams/${examId}`, { method: 'GET', headers: {} }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi tải đề thi'));
  return response.json();
}

export async function createExam(token, examData) {
  const response = await _authFetch(`${API_BASE_URL}/exams/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(examData),
  }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi tạo đề thi'));
  return response.json();
}

export async function deleteExam(token, examId) {
  const response = await _authFetch(`${API_BASE_URL}/exams/${examId}`, { method: 'DELETE', headers: {} }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi xóa đề thi'));
  return response.json();
}

export async function generateExamVariant(token, examId) {
  const response = await _authFetch(`${API_BASE_URL}/exams/${examId}/generate-variants`, {
    method: 'POST', headers: {}
  }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi tạo biến thể AI'));
  return response.json();
}

// Assignment API functions
export async function getAssignments(token, { studentId, status, skip = 0, limit = 20 } = {}) {
  let url = `${API_BASE_URL}/assignments/?skip=${skip}&limit=${limit}`;
  if (studentId) url += `&student_id=${studentId}`;
  if (status) url += `&status=${status}`;
  const response = await _authFetch(url, { method: 'GET', headers: {} }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi tải danh sách bài tập'); }
  return response.json();
}

export async function getAssignment(token, assignmentId) {
  const response = await _authFetch(`${API_BASE_URL}/assignments/${assignmentId}`, { method: 'GET', headers: {} }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi tải bài tập'); }
  return response.json();
}

export async function createAssignment(token, { student_id, problem_id, exam_id, due_date }) {
  const body = { student_id };
  if (problem_id) body.problem_id = problem_id;
  if (exam_id) body.exam_id = exam_id;
  if (due_date) body.due_date = due_date;
  const response = await _authFetch(`${API_BASE_URL}/assignments/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi tạo bài tập'); }
  return response.json();
}

export async function deleteAssignment(token, assignmentId) {
  const response = await _authFetch(`${API_BASE_URL}/assignments/${assignmentId}`, { method: 'DELETE', headers: {} }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi xóa bài tập'); }
  return response.json();
}

export async function deleteProblem(token, problemId) {
  const response = await _authFetch(`${API_BASE_URL}/problems/${problemId}`, { method: 'DELETE', headers: {} }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi xóa bài toán'); }
  return response.json();
}

// Submission API functions
export async function createSubmission(token, { assignment_id, text_content, image_urls }) {
  const response = await _authFetch(`${API_BASE_URL}/submissions/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignment_id, text_content, image_urls: image_urls || [] }),
  }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi nộp bài'); }
  return response.json();
}

export async function getSubmissionByAssignment(token, assignmentId) {
  const response = await _authFetch(`${API_BASE_URL}/submissions/by-assignment/${assignmentId}`, { method: 'GET', headers: {} }, token);
  if (response.status === 404) return null;
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi tải bài nộp'); }
  return response.json();
}

export async function getSubmission(token, submissionId) {
  const response = await _authFetch(`${API_BASE_URL}/submissions/${submissionId}`, { method: 'GET', headers: {} }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi tải bài nộp'); }
  return response.json();
}

// Chat API
export async function getChatQuota(token) {
  const response = await fetch(`${API_BASE_URL}/chat/quota`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) return { used: 0, limit: 20, remaining: 20 };
  return response.json();
}

export async function sendChatMessage(token, { assignment_id, message, history }) {
  const response = await fetch(`${API_BASE_URL}/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ assignment_id, message, history }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi gọi AI');
  }
  return response.json(); // { reply: "...", quota: { used, remaining, limit } }
}

export async function gradeSubmission(token, submissionId) {
  const response = await _authFetch(`${API_BASE_URL}/submissions/${submissionId}/grade`, { method: 'POST', headers: {} }, token);
  if (!response.ok) { const e = await response.json(); throw new Error(e.detail || 'Lỗi khi chấm bài'); }
  return response.json();
}

// AI Exam Analyzer — Phase 7 Stage 2
export async function analyzeExam(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  // Note: _authFetch merges headers but FormData needs no Content-Type (browser sets boundary)
  const response = await _authFetch(`${API_BASE_URL}/exams/analyze`, {
    method: 'POST', headers: {}, body: formData,
  }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi phân tích đề thi'));
  return response.json();
}

export async function createExamFromQuestions(token, { title, description, duration, questions }) {
  const response = await _authFetch(`${API_BASE_URL}/exams/create-from-questions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, duration, questions }),
  }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi tạo đề thi từ câu hỏi'));
  return response.json();
}

// Classroom API functions
export async function getClassrooms(token, { skip = 0, limit = 20 } = {}) {
  const response = await _authFetch(`${API_BASE_URL}/classrooms/?skip=${skip}&limit=${limit}`, {
    method: 'GET', headers: {}
  }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi tải danh sách lớp'));
  return response.json();
}

export async function createClassroom(token, data) {
  const response = await _authFetch(`${API_BASE_URL}/classrooms/`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi tạo lớp học'));
  return response.json();
}

export async function getClassroom(token, classroomId) {
  const response = await _authFetch(`${API_BASE_URL}/classrooms/${classroomId}`, {
    method: 'GET', headers: {}
  }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi tải chi tiết lớp'));
  return response.json();
}

export async function addStudentToClass(token, classroomId, studentId) {
  const response = await _authFetch(`${API_BASE_URL}/classrooms/${classroomId}/students?student_id=${studentId}`, {
    method: 'POST', headers: {}
  }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi thêm học sinh vào lớp'));
  return response.json();
}

export async function removeStudentFromClass(token, classroomId, studentId) {
  const response = await _authFetch(`${API_BASE_URL}/classrooms/${classroomId}/students/${studentId}`, {
    method: 'DELETE', headers: {}
  }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi xóa học sinh khỏi lớp'));
  return response.json();
}

export async function assignExamToClass(token, classroomId, examId, dueDate = null) {
  const response = await _authFetch(`${API_BASE_URL}/classrooms/${classroomId}/assign-exam?exam_id=${examId}${dueDate ? `&due_date=${dueDate}` : ''}`, {
    method: 'POST', headers: {}
  }, token);
  if (!response.ok) throw new Error(await _parseError(response, 'Lỗi khi giao bài cho lớp'));
  return response.json();
}




