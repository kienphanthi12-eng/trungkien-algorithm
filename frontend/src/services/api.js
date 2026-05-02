// Backend URL updated to Railway production
const API_BASE_URL = 'https://trungkien-algorithm-production.up.railway.app';

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

export async function createAssignment(token, { student_id, problem_id, due_date }) {
  const body = { student_id, problem_id };
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
