import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user, logoutUser } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-blue-600">TrungKien Algorithm</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 text-sm sm:text-base">
                Xin chào, <span className="font-semibold">{user?.name}</span>
              </span>
              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user?.role === 'teacher' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                {user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
              </span>
              <button
                onClick={logoutUser}
                className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex flex-col items-center justify-center text-gray-500 bg-white shadow-sm">
            <p className="text-2xl font-bold mb-4 text-gray-800">Chào mừng đến với Nền tảng Học Toán!</p>
            <p className="text-lg">Phase 1: Đăng nhập & Đăng ký đã được hoàn tất thành công.</p>
            <p className="mt-2 text-sm text-gray-400">Các tính năng của {user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'} sẽ được cập nhật ở Phase tiếp theo.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
