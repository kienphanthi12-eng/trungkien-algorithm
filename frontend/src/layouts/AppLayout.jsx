import { useAuth } from '../contexts/AuthContext';
import TeacherLayout from './TeacherLayout';
import StudentLayout from './StudentLayout';

export default function AppLayout() {
  const { user } = useAuth();
  if (user?.role === 'teacher') return <TeacherLayout />;
  return <StudentLayout />;
}
