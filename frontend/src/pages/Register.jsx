import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    
    try {
      const response = await register(email, password, name, role);
      console.log("Backend response:", response);
      
      // If backend returns the success message, handle it explicitly
      if (response && response.message === "User registered successfully") {
        setSuccessMsg("Đăng ký thành công! Đang chuyển hướng...");
        setTimeout(() => navigate('/login'), 1500);
      } else {
        navigate('/login');
      }
    } catch (err) {
      console.error("Register catch block error:", err);
      let errorMsg = err.message;
      const lowerError = errorMsg.toLowerCase();

      if (lowerError.includes('already registered') || lowerError.includes('already exists')) {
        errorMsg = 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.';
      } else if (lowerError.includes('user not allowed')) {
        errorMsg = 'Đăng ký không được phép. Email có thể đã được đăng ký hoặc hệ thống tạm thời không cho phép đăng ký mới.';
      } else if (lowerError.includes('invalid email')) {
        errorMsg = 'Địa chỉ email không hợp lệ.';
      } else if (lowerError.includes('password')) {
        errorMsg = 'Mật khẩu phải có ít nhất 6 ký tự.';
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="ZENTUS Logo" className="h-16 w-auto" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Đăng Ký Tài Khoản</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
        {successMsg && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">{successMsg}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Họ và tên</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required 
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required 
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Mật khẩu</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required 
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Vai trò</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white cursor-pointer"
            >
              <option value="student">Học sinh</option>
              <option value="teacher">Giáo viên</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <button 
              type="submit" 
              disabled={loading}
              className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Đang xử lý...' : 'Đăng Ký'}
            </button>
          </div>
          <div className="mt-4 text-center">
            <span className="text-sm text-gray-600">Đã có tài khoản? </span>
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800 font-semibold">Đăng nhập</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
