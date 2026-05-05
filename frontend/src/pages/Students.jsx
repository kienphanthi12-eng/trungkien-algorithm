import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStudents, addStudent, removeStudent } from '../services/api';
import { Link } from 'react-router-dom';

export default function Students() {
  const { user, token } = useAuth();
  const [students, setStudents] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await getStudents(token);
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await addStudent(token, newEmail);
      setNewEmail('');
      setMessage('Đã thêm học sinh thành công!');
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa học sinh này?')) return;
    try {
      await removeStudent(token, studentId);
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quản lý học sinh</h2>

          {/* Add Student Form */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Thêm học sinh mới</h3>
            <form onSubmit={handleAddStudent} className="flex gap-4">
              <input
                type="email"
                required
                placeholder="Email học sinh"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Thêm học sinh
              </button>
            </form>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
          </div>

          {/* Students List */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Danh sách học sinh</h3>
            </div>
            {loading ? (
              <div className="p-6 text-center text-gray-500">Đang tải...</div>
            ) : students.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Chưa có học sinh nào trong danh sách.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {students.map((student) => (
                  <li key={student.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveStudent(student.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                    >
                      Xóa
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
