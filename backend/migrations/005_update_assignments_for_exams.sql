-- Update assignments table to support exams

-- 1. Make problem_id nullable
ALTER TABLE public.assignments ALTER COLUMN problem_id DROP NOT NULL;

-- 2. Add exam_id column
ALTER TABLE public.assignments ADD COLUMN exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE;

-- 3. Add constraint to ensure either problem_id or exam_id is set (exclusive OR)
ALTER TABLE public.assignments ADD CONSTRAINT problem_or_exam_required CHECK (
  (problem_id IS NOT NULL AND exam_id IS NULL) OR
  (problem_id IS NULL AND exam_id IS NOT NULL)
);

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_assignments_exam_id ON public.assignments(exam_id);
