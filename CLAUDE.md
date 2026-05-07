# ZENTUS Platform - AI-Powered EdTech

## 🚀 Project Status
- **Phase 1-5**: ✅ Complete (Auth, Students, Problems, Assignments, AI Grading)
- **Phase 6**: ✅ Complete (AI Exam Analysis & Integration)
- **Phase 7**: ✅ Complete (Exam Management & Geometry Editor - JSON/SVG)
- **Phase 8**: ✅ Complete (Rebranding to ZENTUS & Glassmorphism UI)
- **Phase 9**: ✅ Complete (Role-based Layout Refactor - Teacher Sidebar vs Student TopNav)
- **Phase 10**: 🔲 Pending (Improved AI Variant Generation templates)
- **Phase 11**: 🔲 Pending (Mobile Responsiveness optimization)

## 🛠 Tech Stack
- **Backend**: Python FastAPI + Supabase (PostgreSQL)
- **Frontend**: Vite + React + TailwindCSS (Glassmorphism design)
- **Icons & UI**: Lucide-React + Tailwind
- **Math/Academic**: KaTeX (LaTeX) + React-Markdown
- **Geometry**: SVG Renderer + JSON-based Figure Editor
- **Deploy**: Railway (Backend) + Vercel (Frontend)

## 🌐 Production URLs
- **Frontend**: https://trungkien-algorithm-ejqs.vercel.app
- **Backend**: https://trungkien-algorithm-production.up.railway.app
- **Database**: Supabase (Project: zabvdgnucfanvbjjgnic)

## 💻 Local Development
- **Backend**: `uvicorn main:app --reload` (Port 8000)
- **Frontend**: `npm run dev` (Port 5173)
- **Structure**: `backend/` and `frontend/` directories

## 🏛 Architecture & Roles
As of Phase 9, the app uses a unified codebase with role-based layouts:
- **TeacherLayout**: Fixed sidebar navigation, management-heavy tools (Dashboard, Classrooms, Exams, Problems, Assignments).
- **StudentLayout**: Clean top navigation, focus on learning and tasks (My Assignments, Exams, Problems).
- **Route Guarding**: `TeacherRoute` component prevents students from accessing administrative paths.

## 📝 Key Components
- `ExamProblemView`: Academic-style rendering of problems (MCQ, T/F, Math).
- `FigureEditor/Renderer`: Custom tool for creating and displaying geometric figures via JSON/SVG.
- `MarkdownRenderer`: Unified component for LaTeX and Markdown support.

## 🎯 Next Steps & Plans
1. **AI Enhancement**: Optimize the prompts for "Tạo biến thể AI" to support more complex geometry templates.
2. **Classroom Analytics**: Add charts/stats to the Teacher Dashboard to track student progress over time.
3. **Real-time Notifications**: Notify students when a new assignment is assigned.
4. **Mobile Polish**: Ensure the new sidebar and topnav work perfectly on tablets and phones.
5. **Classroom Detail Improvement**: Add student performance summary within the Classroom Detail view.
