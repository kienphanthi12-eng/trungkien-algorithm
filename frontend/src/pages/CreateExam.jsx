import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { getProblems, createExam } from '../services/api';
import logo from '../assets/logo.png';

export default function CreateExam() {
  const { user, token, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 60
  });

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    try {
      const data = await getProblems(token, 0, 100); // Load many to pick from
      setProblems(data.problems);
    } catch (err) {
      setError('Lỗi khi tải kho bài toán: ' + err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleProblem = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError('Vui lòng chọn ít nhất một câu hỏi cho đề thi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createExam(token, {
        ...formData,
        problem_ids: selectedIds
      });
      navigate('/exams');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[120px] pointer-events-none"></div>

      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <Link to="/exams" className="p-2 bg-white rounded-xl shadow-sm border border-white/40">
                <img src={logo} alt="ZENTUS" className="h-10 w-auto" />
              </Link>
              <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                TẠO ĐỀ THI
              </span>
            </div>
            <button onClick={logoutUser} className="text-gray-500 hover:text-red-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cột trái: Thông tin đề thi */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-8">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Thông tin chung</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tiêu đề đề thi *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleInput} required
                    className="w-full rounded-2xl border-gray-200 shadow-sm border p-3 focus:border-blue-500 focus:outline-none transition-all"
                    placeholder="VD: Kiểm tra Toán 15 phút" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Mô tả</label>
                  <textarea name="description" value={formData.description} onChange={handleInput} rows="3"
                    className="w-full rounded-2xl border-gray-200 shadow-sm border p-3 focus:border-blue-500 focus:outline-none transition-all"
                    placeholder="Nội dung ôn tập..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Thời gian làm bài (phút)</label>
                  <input type="number" name="duration" value={formData.duration} onChange={handleInput} min="1"
                    className="w-full rounded-2xl border-gray-200 shadow-sm border p-3 focus:border-blue-500 focus:outline-none transition-all" />
                </div>
              </div>

              {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">{error}</div>}

              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-sm font-bold text-slate-500 mb-4">Đã chọn: <span className="text-blue-600 text-lg">{selectedIds.length}</span> câu hỏi</p>
                <button type="submit" disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                  {loading ? 'Đang tạo...' : 'XÁC NHẬN TẠO ĐỀ'}
                </button>
                <Link to="/exams" className="block text-center mt-4 text-slate-400 font-bold hover:text-slate-600 transition-colors">Quay lại</Link>
              </div>
            </div>
          </div>

          {/* Cột phải: Chọn bài toán */}
          <div className="lg:col-span-2">
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-900">Chọn câu hỏi từ kho</h2>
                <div className="text-sm text-slate-400 font-bold">Hiển thị {problems.length} câu</div>
              </div>

              {fetching ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {problems.map((prob) => {
                    const isSelected = selectedIds.includes(prob.id);
                    return (
                      <div key={prob.id} onClick={() => toggleProblem(prob.id)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-300 shadow-md ring-2 ring-blue-500/20' 
                            : 'bg-white border-slate-100 hover:border-blue-200'
                        }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md mb-2 inline-block ${
                              prob.problem_type === 'algorithm' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                            }`}>
                              {prob.problem_type === 'algorithm' ? 'Lập trình' : 'Trắc nghiệm'}
                            </span>
                            <h4 className="font-bold text-slate-900 line-clamp-1">{prob.title}</h4>
                            <p className="text-sm text-slate-500 line-clamp-2 mt-1">{prob.description}</p>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200'
                          }`}>
                            {isSelected && <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </form>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
}
