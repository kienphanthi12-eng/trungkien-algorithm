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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {user?.role === 'teacher' && (
              <a 
                href="/students"
                className="block p-6 bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h5 className="text-xl font-bold tracking-tight text-gray-900">Quản lý học sinh</h5>
                </div>
                <p className="font-normal text-gray-700">Xem danh sách, thêm hoặc xóa học sinh trong lớp của bạn.</p>
              </a>
            )}
            
            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-md">
              <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900">Thông báo</h5>
              <p className="font-normal text-gray-700">Phase 2: Quản lý học sinh đã được triển khai. Bạn có thể bắt đầu thêm học sinh của mình.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
