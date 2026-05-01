import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, getMe } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const data = await login(email, password);
      // Fetch full details since login only returns partial info
      const fullUser = await getMe(data.access_token);
      loginUser(data.access_token, fullUser);
      navigate('/');
    } catch (err) {
      let errorMsg = err.message;
      const lowerError = errorMsg.toLowerCase();
      
      if (lowerError.includes('invalid credentials') || lowerError.includes('invalid login credentials')) {
        errorMsg = 'Email hoặc mật khẩu không chính xác.';
      } else if (lowerError.includes('unauthorized')) {
        errorMsg = 'Lỗi xác thực. Vui lòng đăng nhập lại.';
      } else if (lowerError.includes('user not found')) {
        errorMsg = 'Tài khoản không tồn tại hoặc chưa được kích hoạt.';
      } else {
        errorMsg = `Đã xảy ra lỗi: ${errorMsg}`;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Đăng Nhập</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
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
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Mật khẩu</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required 
            />
          </div>
          <div className="flex items-center justify-between">
            <button 
              type="submit" 
              disabled={loading}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
            </button>
          </div>
          <div className="mt-4 text-center">
            <span className="text-sm text-gray-600">Chưa có tài khoản? </span>
            <Link to="/register" className="text-sm text-blue-600 hover:text-blue-800 font-semibold">Đăng ký ngay</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
