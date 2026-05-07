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

## 🗺️ Long-term Roadmap

### Phase 10: AI Optimization & Multi-platform (Months 1-2)
- **AI Variant 2.0**: Advanced geometric understanding for automated problem variation.
- **Mobile First**: Full responsive optimization for tablets and smartphones.
- **Real-time Notifications**: Assignment and submission alerts via WebSockets.

### Phase 11: Smart Analytics & Dashboard (Months 3-4)
- **Teacher Analytics**: Visualizing completion rates, score distributions, and student progress.
- **Learning Alerts**: AI-driven identification of students needing support.
- **Academic Portfolio**: Long-term tracking of student performance and competency maps.

### Phase 12: Engagement & Personalization (Months 5-6)
- **AI Learning Path**: Personalized problem suggestions based on individual ability.
- **AI Tutor**: Interactive step-by-step guidance without revealing answers directly.
- **Gamification**: Badges, points, and leaderboards to boost student engagement.

### Phase 13: Ecosystem & Community (Months 7+)
- **ZENTUS Library**: Open repository for sharing high-quality exams and problems.
- **ZENTUS Arena**: Real-time online math competitions and mock exams.
- **LMS Integration**: Seamless sync with Google Classroom and Microsoft Teams.

## 🛡️ Technical Foundation (Ongoing)
1. **Security**: Advanced RLS policies and data encryption.
2. **Performance**: Query optimization and CDN integration for assets.
3. **Infrastructure**: Scaling to enterprise-grade cloud hosting (AWS/GCP).
