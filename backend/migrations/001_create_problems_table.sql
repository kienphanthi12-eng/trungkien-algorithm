-- Create problems table for Phase 3
CREATE TABLE IF NOT EXISTS public.problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT NOT NULL,
  example_input TEXT NOT NULL,
  example_output TEXT NOT NULL,
  test_cases JSONB NOT NULL DEFAULT '[]',
  time_limit INTEGER NOT NULL DEFAULT 1000, -- milliseconds
  memory_limit INTEGER NOT NULL DEFAULT 256, -- MB
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_limit CHECK (time_limit >= 100),
  CONSTRAINT valid_memory_limit CHECK (memory_limit >= 32)
);

-- Create index for faster queries
CREATE INDEX idx_problems_created_by ON public.problems(created_by);
CREATE INDEX idx_problems_difficulty ON public.problems(difficulty);
CREATE INDEX idx_problems_category ON public.problems(category);
CREATE INDEX idx_problems_created_at ON public.problems(created_at DESC);

-- Enable RLS
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view problems
CREATE POLICY "Enable public read access"
  ON public.problems FOR SELECT
  USING (true);

-- RLS Policy: Only teachers can create problems
CREATE POLICY "Enable insert for teachers"
  ON public.problems FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher'
  );

-- RLS Policy: Only creator can update their problems
CREATE POLICY "Enable update for problem creator"
  ON public.problems FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- RLS Policy: Only creator can delete their problems
CREATE POLICY "Enable delete for problem creator"
  ON public.problems FOR DELETE
  USING (created_by = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_problems_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER problems_updated_at_trigger
BEFORE UPDATE ON public.problems
FOR EACH ROW
EXECUTE FUNCTION update_problems_updated_at();
