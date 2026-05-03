// Backend URL updated to Railway production
const API_BASE_URL = 'https://trungkien-algorithm-production.up.railway.app';

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
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    let errorDetail = 'Lỗi xác thực (Unauthorized)';
    try {
      const error = await response.json();
      errorDetail = error.detail || errorDetail;
    } catch (e) {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }
  
  return response.json();
}

export async function getStudents(token) {
  const response = await fetch(`${API_BASE_URL}/students/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi tải danh sách học sinh');
  }
  return response.json();
}

export async function addStudent(token, email) {
  const response = await fetch(`${API_BASE_URL}/students/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi thêm học sinh');
  }
  return response.json();
}

export async function removeStudent(token, studentId) {
  const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi xóa học sinh');
  }
  return response.json();
}

// Problem API functions
export async function generateProblem(token, prompt) {
  const response = await fetch(`${API_BASE_URL}/problems/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi tạo bài toán bằng AI');
  }
  return response.json();
}

export async function generateProblemsBulk(token, prompt, count) {
  const response = await fetch(`${API_BASE_URL}/problems/generate-bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, count }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi tạo hàng loạt bằng AI');
  }
  return response.json();
}

export async function getProblems(token, skip = 0, limit = 10, difficulty = null, category = null) {
  let url = `${API_BASE_URL}/problems/?skip=${skip}&limit=${limit}`;
  if (difficulty) url += `&difficulty=${difficulty}`;
  if (category) url += `&category=${category}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi tải danh sách bài toán');
  }
  return response.json();
}

export async function getProblem(token, problemId) {
  const response = await fetch(`${API_BASE_URL}/problems/${problemId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi tải bài toán');
  }
  return response.json();
}

export async function createProblem(token, problemData) {
  const response = await fetch(`${API_BASE_URL}/problems/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(problemData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi tạo bài toán');
  }
  return response.json();
}

export async function updateProblem(token, problemId, problemData) {
  const response = await fetch(`${API_BASE_URL}/problems/${problemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(problemData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi cập nhật bài toán');
  }
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
  const response = await fetch(`${API_BASE_URL}/exams/?skip=${skip}&limit=${limit}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(await _parseError(response, 'Lỗi khi tải danh sách đề thi'));
  }
  return response.json();
}

export async function getExam(token, examId) {
  if (!token) throw new Error('Chưa đăng nhập');
  const response = await fetch(`${API_BASE_URL}/exams/${examId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(await _parseError(response, 'Lỗi khi tải đề thi'));
  }
  return response.json();
}

export async function createExam(token, examData) {
  const response = await fetch(`${API_BASE_URL}/exams/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(examData),
  });
  if (!response.ok) {
    throw new Error(await _parseError(response, 'Lỗi khi tạo đề thi'));
  }
  return response.json();
}

export async function deleteExam(token, examId) {
  const response = await fetch(`${API_BASE_URL}/exams/${examId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(await _parseError(response, 'Lỗi khi xóa đề thi'));
  }
  return response.json();
}

// Assignment API functions
export async function getAssignments(token, { studentId, status, skip = 0, limit = 20 } = {}) {
  let url = `${API_BASE_URL}/assignments/?skip=${skip}&limit=${limit}`;
  if (studentId) url += `&student_id=${studentId}`;
  if (status) url += `&status=${status}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi tải danh sách bài tập');
  }
  return response.json();
}

export async function getAssignment(token, assignmentId) {
  const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi tải bài tập');
  }
  return response.json();
}

export async function createAssignment(token, { student_id, problem_id, exam_id, due_date }) {
  const body = { student_id };
  if (problem_id) body.problem_id = problem_id;
  if (exam_id) body.exam_id = exam_id;
  if (due_date) body.due_date = due_date;
  const response = await fetch(`${API_BASE_URL}/assignments/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi tạo bài tập');
  }
  return response.json();
}

export async function deleteAssignment(token, assignmentId) {
  const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi xóa bài tập');
  }
  return response.json();
}

export async function deleteProblem(token, problemId) {
  const response = await fetch(`${API_BASE_URL}/problems/${problemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi xóa bài toán');
  }
  return response.json();
}

// Submission API functions
export async function createSubmission(token, { assignment_id, text_content, image_urls }) {
  const response = await fetch(`${API_BASE_URL}/submissions/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ assignment_id, text_content, image_urls: image_urls || [] }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi nộp bài');
  }
  return response.json();
}

export async function getSubmissionByAssignment(token, assignmentId) {
  const response = await fetch(`${API_BASE_URL}/submissions/by-assignment/${assignmentId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi tải bài nộp');
  }
  return response.json();
}

export async function getSubmission(token, submissionId) {
  const response = await fetch(`${API_BASE_URL}/submissions/${submissionId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi tải bài nộp');
  }
  return response.json();
}

// Chat API
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
  return response.json(); // { reply: "..." }
}

export async function gradeSubmission(token, submissionId) {
  const response = await fetch(`${API_BASE_URL}/submissions/${submissionId}/grade`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Lỗi khi chấm bài');
  }
  return response.json();
}

// AI Exam Analyzer — Phase 7 Stage 2
export async function analyzeExam(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/exams/analyze`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await _parseError(response, 'Lỗi khi phân tích đề thi'));
  }
  return response.json(); // { questions: [...], count: N }
}

export async function createExamFromQuestions(token, { title, description, duration, questions }) {
  const response = await fetch(`${API_BASE_URL}/exams/create-from-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description, duration, questions }),
  });
  if (!response.ok) {
    throw new Error(await _parseError(response, 'Lỗi khi tạo đề thi từ câu hỏi'));
  }
  return response.json();
}
