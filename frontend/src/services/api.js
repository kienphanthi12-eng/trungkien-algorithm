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
