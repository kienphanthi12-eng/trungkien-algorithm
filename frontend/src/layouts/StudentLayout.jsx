import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

const NAV_ITEMS = [
  { to: '/learn', label: '🎓 Học bài' },
  { to: '/progress', label: '📊 Tiến độ' },
  { to: '/assignments', label: 'Bài tập' },
  { to: '/exams', label: 'Đề thi' },
  { to: '/problems', label: 'Bài toán' },
];

export default function StudentLayout() {
  const { user, logoutUser } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            {/* Logo + nav links */}
            <div className="flex items-center gap-5">
              <Link to="/assignments" className="flex items-center gap-2 shrink-0">
                <img src={logo} alt="ZENTUS" className="h-8 w-auto" />
              </Link>
              <div className="flex gap-0.5">
                {NAV_ITEMS.map(({ to, label }) => {
                  const isActive =
                    location.pathname === to || location.pathname.startsWith(to + '/');
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User + logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-sm font-bold text-slate-900 leading-none">{user?.name}</p>
                <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide mt-0.5">
                  Học sinh
                </p>
              </div>
              <button
                onClick={logoutUser}
                title="Đăng xuất"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
