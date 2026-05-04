import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
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
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/problems"
            element={
              <ProtectedRoute>
                <Problems />
              </ProtectedRoute>
            }
          />
          <Route
            path="/problems/create"
            element={
              <ProtectedRoute>
                <CreateProblem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/problems/:problemId"
            element={
              <ProtectedRoute>
                <ProblemDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/problems/:problemId/edit"
            element={
              <ProtectedRoute>
                <CreateProblem />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams"
            element={
              <ProtectedRoute>
                <Exams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams/create"
            element={
              <ProtectedRoute>
                <CreateExam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams/analyze"
            element={
              <ProtectedRoute>
                <AnalyzeExam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exams/:examId"
            element={
              <ProtectedRoute>
                <ExamDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments"
            element={
              <ProtectedRoute>
                <Assignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assignments/:assignmentId"
            element={
              <ProtectedRoute>
                <AssignmentDetail />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
