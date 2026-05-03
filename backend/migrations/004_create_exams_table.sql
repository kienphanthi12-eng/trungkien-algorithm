-- Create exams and exam_problems tables for Phase 7: Exam Management

-- 1. Create exams table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER DEFAULT 60, -- duration in minutes, NULL means no limit
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create exam_problems table (junction table)
CREATE TABLE IF NOT EXISTS public.exam_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  points FLOAT NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_id, problem_id)
);

-- 3. Create indices for performance
CREATE INDEX idx_exams_created_by ON public.exams(created_by);
CREATE INDEX idx_exams_created_at ON public.exams(created_at DESC);
CREATE INDEX idx_exam_problems_exam_id ON public.exam_problems(exam_id);
CREATE INDEX idx_exam_problems_problem_id ON public.exam_problems(problem_id);

-- 4. Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_problems ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for exams
CREATE POLICY "Enable read access for authenticated users"
  ON public.exams FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for teachers"
  ON public.exams FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher'
  );

CREATE POLICY "Enable update for exam creator"
  ON public.exams FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Enable delete for exam creator"
  ON public.exams FOR DELETE
  USING (created_by = auth.uid());

-- 6. RLS Policies for exam_problems
CREATE POLICY "Enable read access for exam_problems"
  ON public.exam_problems FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for exam creator"
  ON public.exam_problems FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE id = exam_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Enable update for exam creator"
  ON public.exam_problems FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE id = exam_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Enable delete for exam creator"
  ON public.exam_problems FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.exams 
      WHERE id = exam_id AND created_by = auth.uid()
    )
  );

-- 7. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exams_updated_at_trigger
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION update_exams_updated_at();
