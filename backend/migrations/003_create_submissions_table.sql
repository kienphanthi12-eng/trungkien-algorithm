-- Migration 003: Create submissions table
-- Phase 5: Submission & Grading

CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    answer_text TEXT,
    image_urls JSONB DEFAULT '[]'::jsonb,
    grade INTEGER CHECK (grade >= 0 AND grade <= 10),
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(assignment_id)  -- one submission per assignment
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON public.submissions(submitted_at DESC);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Students can only see their own submissions
CREATE POLICY "Students can view their own submissions"
    ON public.submissions
    FOR SELECT
    USING (auth.uid() = student_id);

-- Teachers can see submissions for their assignments
CREATE POLICY "Teachers can view submissions for their assignments"
    ON public.submissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_id
            AND a.teacher_id = auth.uid()
        )
    );

-- Students can create submissions for their own assignments
CREATE POLICY "Students can create submissions"
    ON public.submissions
    FOR INSERT
    WITH CHECK (
        auth.uid() = student_id
        AND EXISTS (
            SELECT 1 FROM public.assignments a
            WHERE a.id = assignment_id
            AND a.student_id = auth.uid()
            AND a.status = 'pending'
        )
    );

-- Service role bypass (used by backend)
CREATE POLICY "Service role bypass"
    ON public.submissions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Image storage bucket for submissions (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false) ON CONFLICT DO NOTHING;
