import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Dashboard() {
  const { user, logoutUser } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Trang trí nền (Background Blobs) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/50 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/50 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header Glassmorphism */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-white/40">
                <img 
                  src={logo} 
                  alt="ZENTUS Logo" 
                  className="h-10 w-auto"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.parentElement.innerHTML = '<h1 class="text-xl font-bold text-blue-600">ZENTUS</h1>';
                  }}
                />
              </div>
              <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 hidden sm:block">
                ZENTUS
              </span>
            </div>

            <div className="flex items-center space-x-6">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-slate-900 font-bold text-sm">
                  {user?.name}
                </span>
                <span className={`text-[10px] uppercase tracking-wider font-bold ${user?.role === 'teacher' ? 'text-purple-600' : 'text-green-600'}`}>
                  {user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                </span>
              </div>
              <button
                onClick={logoutUser}
                className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white text-sm font-bold rounded-xl transition-all duration-300 border border-red-500/20"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
            Chào mừng trở lại!
          </h2>
          <p className="text-slate-500 font-medium">Hôm nay bạn muốn thực hiện công việc gì?</p>
        </header>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card: Quản lý học sinh */}
          {user?.role === 'teacher' && (
            <Link
              to="/students"
              className="group relative overflow-hidden p-8 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-200/40 hover:-translate-y-2 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Quản lý học sinh</h3>
                <p className="text-slate-500 leading-relaxed font-medium">Theo dõi danh sách lớp, quản lý thông tin và kết quả học tập của từng học sinh.</p>
              </div>
            </Link>
          )}

          {/* Card: Kho bài toán */}
          <Link
            to="/problems"
            className="group relative overflow-hidden p-8 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-green-200/40 hover:-translate-y-2 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200 mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                {user?.role === 'teacher' ? 'Quản lý bài toán' : 'Kho bài toán'}
              </h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                {user?.role === 'teacher'
                  ? 'Tạo đề bài thông minh với AI, quản lý thư viện bài tập đa môn học phong phú.'
                  : 'Khám phá hàng ngàn bài toán thú vị và bắt đầu luyện tập nâng cao trình độ.'}
              </p>
            </div>
          </Link>

          {/* Card: Bài tập */}
          <Link
            to="/assignments"
            className="group relative overflow-hidden p-8 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-yellow-200/40 hover:-translate-y-2 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-yellow-200 mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                {user?.role === 'teacher' ? 'Giao bài tập' : 'Bài tập của tôi'}
              </h3>
              <p className="text-slate-500 leading-relaxed font-medium">
                {user?.role === 'teacher'
                  ? 'Giao đề thi cho học sinh và theo dõi tiến độ làm bài, chấm điểm tự động.'
                  : 'Theo dõi các bài tập được giao, thời hạn nộp bài và xem lại kết quả đã làm.'}
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
