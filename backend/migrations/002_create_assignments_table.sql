-- Create assignments table for Phase 4
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON public.assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_problem_id ON public.assignments(problem_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_at ON public.assignments(assigned_at DESC);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Teachers can see assignments they created
CREATE POLICY "Teachers can view their assignments"
  ON public.assignments FOR SELECT
  USING (teacher_id = auth.uid());

-- Students can see their own assignments
CREATE POLICY "Students can view their assignments"
  ON public.assignments FOR SELECT
  USING (student_id = auth.uid());

-- Only teachers can create assignments
CREATE POLICY "Teachers can create assignments"
  ON public.assignments FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher'
  );

-- Only the creating teacher can update their assignments
CREATE POLICY "Teachers can update their assignments"
  ON public.assignments FOR UPDATE
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Only the creating teacher can delete their assignments
CREATE POLICY "Teachers can delete their assignments"
  ON public.assignments FOR DELETE
  USING (teacher_id = auth.uid());
