import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { getAssignments, getStudents, getProblems, getExams } from '../services/api';

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, gradient, icon, loading }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient}`}>
      <div className="absolute -top-4 -right-4 opacity-20 text-8xl">{icon}</div>
      <div className="relative z-10">
        <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
        {loading
          ? <div className="h-9 w-16 bg-white/20 rounded-lg animate-pulse mt-1" />
          : <p className="text-4xl font-black">{value ?? '—'}</p>
        }
        {sub && <p className="text-white/60 text-xs mt-1 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

// ── Nav Link Card ─────────────────────────────────────────────────────────────
function NavCard({ to, gradient, iconBg, icon, title, desc, badge }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden p-7 bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity ${gradient}`} />
      <div className="relative z-10 flex items-start gap-5">
        <div className={`w-13 h-13 shrink-0 ${iconBg} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 p-3`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {badge && (
              <span className="shrink-0 px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                {badge}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, token } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!token) return;
    loadStats();
  }, [token]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      if (isTeacher) {
        const [assignments, students, problems, exams] = await Promise.allSettled([
          getAssignments(token),
          getStudents(token),
          getProblems(token, 0, 1),   // chỉ cần total
          getExams(token, 0, 1),       // chỉ cần total
        ]);

        // getAssignments → array trực tiếp
        const aList = assignments.status === 'fulfilled'
          ? (Array.isArray(assignments.value) ? assignments.value : [])
          : [];

        // getStudents → array trực tiếp
        const s = students.status === 'fulfilled'
          ? (Array.isArray(students.value) ? students.value : [])
          : [];

        // getProblems → { problems: [], total: N }
        const p = problems.status === 'fulfilled' ? problems.value : {};
        // getExams → { exams: [], total: N }
        const e = exams.status === 'fulfilled' ? exams.value : {};

        setStats({
          students: s.length,
          problems: p.total ?? 0,
          exams: e.total ?? 0,
          assignments: aList.length,
          pending: aList.filter(x => x.status === 'pending').length,
          submitted: aList.filter(x => x.status === 'submitted').length,
          graded: aList.filter(x => x.status === 'graded').length,
        });
      } else {
        // Student: getAssignments → array trực tiếp
        const [result] = await Promise.allSettled([getAssignments(token)]);
        const aList = result.status === 'fulfilled'
          ? (Array.isArray(result.value) ? result.value : [])
          : [];

        const pending = aList.filter(x => x.status === 'pending').length;
        const submitted = aList.filter(x => x.status === 'submitted').length;
        const graded = aList.filter(x => x.status === 'graded').length;

        // Điểm trung bình từ các bài đã chấm (nếu submission.grade.score có trong response)
        const scored = aList.filter(x => x.status === 'graded' && x.grade?.score != null);
        const avgScore = scored.length > 0
          ? (scored.reduce((sum, x) => sum + parseFloat(x.grade.score), 0) / scored.length).toFixed(1)
          : null;

        setStats({ total: aList.length, pending, submitted, graded, avgScore });
      }
    } catch {
      setStats({});
    } finally {
      setLoadingStats(false);
    }
  };


  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <div className="relative overflow-hidden">
      {/* Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] bg-green-100/30 rounded-full blur-[100px] pointer-events-none" />

      <main className="relative z-10 max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Header */}
        <header>
          <p className="text-slate-400 font-medium text-sm mb-1">{greeting()},</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            {user?.name || 'Bạn'} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            {isTeacher ? 'Đây là tổng quan lớp học của bạn hôm nay.' : 'Hãy kiểm tra bài tập và tiếp tục học nhé!'}
          </p>
        </header>

        {/* Stats Grid */}
        {isTeacher ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Học sinh" value={stats?.students} sub="trong lớp học" gradient="bg-gradient-to-br from-blue-500 to-blue-700" icon="👨‍🎓" loading={loadingStats} />
            <StatCard label="Bài tập đã giao" value={stats?.assignments} sub={`${stats?.pending ?? '…'} chờ nộp · ${stats?.submitted ?? '…'} đã nộp`} gradient="bg-gradient-to-br from-yellow-500 to-orange-500" icon="📋" loading={loadingStats} />
            <StatCard label="Đã chấm xong" value={stats?.graded} sub="bài tập được chấm điểm" gradient="bg-gradient-to-br from-green-500 to-emerald-600" icon="✅" loading={loadingStats} />
            <StatCard label="Kho đề thi" value={stats?.exams} sub={`${stats?.problems ?? '…'} câu hỏi trong kho`} gradient="bg-gradient-to-br from-purple-500 to-violet-700" icon="📄" loading={loadingStats} />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tổng bài tập" value={stats?.total} sub="được giao" gradient="bg-gradient-to-br from-blue-500 to-blue-700" icon="📚" loading={loadingStats} />
            <StatCard label="Chờ nộp bài" value={stats?.pending} sub="bài cần làm" gradient="bg-gradient-to-br from-yellow-500 to-orange-500" icon="⏳" loading={loadingStats} />
            <StatCard label="Đã nộp" value={stats?.submitted} sub="chờ chấm điểm" gradient="bg-gradient-to-br from-indigo-500 to-indigo-700" icon="📤" loading={loadingStats} />
            <StatCard
              label="Điểm trung bình"
              value={stats?.avgScore != null ? `${stats.avgScore}/10` : (stats?.graded === 0 ? '—' : null)}
              sub={stats?.graded ? `${stats.graded} bài đã có điểm` : 'chưa có bài được chấm'}
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
              icon="🏆"
              loading={loadingStats}
            />
          </div>
        )}

        {/* Progress bar (teacher: tỷ lệ chấm bài / student: tỷ lệ hoàn thành) */}
        {stats && !loadingStats && (
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/40 shadow-lg p-6">
            {isTeacher ? (
              <>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-bold text-slate-700">Tiến độ chấm bài</p>
                  <p className="text-sm font-bold text-slate-500">
                    {stats.graded}/{stats.assignments} bài ({stats.assignments > 0 ? Math.round((stats.graded / stats.assignments) * 100) : 0}%)
                  </p>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${stats.assignments > 0 ? (stats.graded / stats.assignments) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex gap-6 mt-3 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Chờ nộp: {stats.pending}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />Đã nộp: {stats.submitted}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />Đã chấm: {stats.graded}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-bold text-slate-700">Tiến độ hoàn thành bài tập</p>
                  <p className="text-sm font-bold text-slate-500">
                    {(stats.submitted ?? 0) + (stats.graded ?? 0)}/{stats.total ?? 0} bài ({stats.total > 0 ? Math.round(((stats.submitted + stats.graded) / stats.total) * 100) : 0}%)
                  </p>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-700"
                    style={{ width: `${stats.total > 0 ? (((stats.submitted + stats.graded) / stats.total) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex gap-6 mt-3 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Chưa nộp: {stats.pending}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />Đã nộp: {stats.submitted}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />Đã chấm: {stats.graded}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Navigation Cards */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Chức năng</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <NavCard
              to="/classrooms"
              gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
              iconBg="bg-gradient-to-br from-indigo-500 to-indigo-700"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
              title="Quản lý lớp học"
              desc={isTeacher ? "Tạo lớp, thêm học sinh và giao bài tập cho cả lớp cùng lúc." : "Xem danh sách lớp học và các thông báo từ giáo viên."}
              badge={isTeacher ? "Mới" : null}
            />
            {isTeacher && (
              <NavCard
                to="/students"
                gradient="bg-gradient-to-br from-blue-500 to-blue-700"
                iconBg="bg-gradient-to-br from-blue-500 to-blue-700"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                title="Quản lý học sinh"
                desc="Theo dõi danh sách lớp, quản lý thông tin và kết quả học tập."
                badge={stats?.students != null ? `${stats.students} HS` : null}
              />
            )}
            <NavCard
              to="/exams"
              gradient="bg-gradient-to-br from-purple-500 to-violet-700"
              iconBg="bg-gradient-to-br from-purple-500 to-violet-700"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              title="Kho đề thi"
              desc="Tổ chức câu hỏi thành đề thi, dùng AI phân tích đề từ PDF."
              badge={isTeacher && stats?.exams != null ? `${stats.exams} đề` : null}
            />
            <NavCard
              to="/problems"
              gradient="bg-gradient-to-br from-green-500 to-emerald-600"
              iconBg="bg-gradient-to-br from-green-500 to-emerald-600"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
              title={isTeacher ? 'Quản lý bài toán' : 'Kho bài toán'}
              desc={isTeacher ? 'Tạo đề bài thông minh với AI, quản lý thư viện đa môn học.' : 'Khám phá các bài toán và luyện tập nâng cao trình độ.'}
              badge={isTeacher && stats?.problems != null ? `${stats.problems} câu` : null}
            />
            <NavCard
              to="/assignments"
              gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
              iconBg="bg-gradient-to-br from-yellow-500 to-orange-500"
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
              title={isTeacher ? 'Giao bài tập' : 'Bài tập của tôi'}
              desc={isTeacher ? 'Giao đề thi & bài tập, theo dõi tiến độ, chấm điểm tự động.' : 'Xem bài được giao, nộp bài và theo dõi điểm số.'}
              badge={!isTeacher && stats?.pending ? `${stats.pending} chờ nộp` : (isTeacher && stats?.submitted ? `${stats.submitted} chờ chấm` : null)}
            />
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-300 pb-4">
          ZENTUS © 2026 — AI-powered learning platform
        </p>
      </main>
    </div>
  );
}
