import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import TeacherRoute from './components/TeacherRoute'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Problems from './pages/Problems'
import ProblemDetail from './pages/ProblemDetail'
import CreateProblem from './pages/CreateProblem'
import Assignments from './pages/Assignments'
import AssignmentDetail from './pages/AssignmentDetail'
import Exams from './pages/Exams'
import CreateExam from './pages/CreateExam'
import AnalyzeExam from './pages/AnalyzeExam'
import ClassroomList from './pages/ClassroomList'
import ClassroomDetail from './pages/ClassroomDetail'
import ExamDetail from './pages/ExamDetail'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* All protected routes share auth guard + role-based layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Shared routes (teacher + student) */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/problems" element={<Problems />} />
              <Route path="/problems/:problemId" element={<ProblemDetail />} />
              <Route path="/exams" element={<Exams />} />
              <Route path="/exams/:examId" element={<ExamDetail />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/assignments/:assignmentId" element={<AssignmentDetail />} />
              <Route path="/classrooms" element={<ClassroomList />} />
              <Route path="/classrooms/:classroomId" element={<ClassroomDetail />} />

              {/* Teacher-only routes */}
              <Route element={<TeacherRoute />}>
                <Route path="/students" element={<Students />} />
                <Route path="/problems/create" element={<CreateProblem />} />
                <Route path="/problems/:problemId/edit" element={<CreateProblem />} />
                <Route path="/exams/create" element={<CreateExam />} />
                <Route path="/exams/analyze" element={<AnalyzeExam />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
