-- Create classrooms table
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create junction table for students in classrooms
CREATE TABLE IF NOT EXISTS public.classroom_students (
    classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (classroom_id, student_id)
);

-- Add classroom_id to assignments to track class-wide assignments
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;

-- Policies for classrooms
CREATE POLICY "Teachers can manage their own classrooms" 
ON public.classrooms FOR ALL 
USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view classrooms they are in" 
ON public.classrooms FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.classroom_students 
        WHERE classroom_id = public.classrooms.id 
        AND student_id = auth.uid()
    )
);

-- Policies for classroom_students
CREATE POLICY "Teachers can manage students in their classrooms" 
ON public.classroom_students FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = public.classroom_students.classroom_id 
        AND teacher_id = auth.uid()
    )
);

CREATE POLICY "Students can view their own classroom memberships" 
ON public.classroom_students FOR SELECT 
USING (auth.uid() = student_id);
