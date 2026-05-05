import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function TeacherRoute() {
  const { user } = useAuth();
  if (user?.role !== 'teacher') return <Navigate to="/assignments" replace />;
  return <Outlet />;
}
