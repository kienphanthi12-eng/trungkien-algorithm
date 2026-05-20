-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    grade INT NOT NULL,
    icon TEXT,
    order_index INT DEFAULT 0
);

-- Create topics table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INT DEFAULT 0
);

-- Create lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    theory_prompt TEXT,
    objectives TEXT[] DEFAULT '{}',
    order_index INT DEFAULT 0
);

-- Create learning_progress table
CREATE TABLE IF NOT EXISTS public.learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started', -- not_started / in_progress / completed
    score INT DEFAULT 0,
    time_spent INT DEFAULT 0, -- in seconds
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_user_lesson UNIQUE(user_id, lesson_id)
);

-- Create lesson_sessions table
CREATE TABLE IF NOT EXISTS public.lesson_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb,
    mode TEXT DEFAULT 'giang', -- giang / socrates / luyen / kiemtra
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for subjects, topics, and lessons
-- Allow authenticated users to view subjects, topics, and lessons
CREATE POLICY "Allow public read access to subjects" ON public.subjects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow public read access to topics" ON public.topics
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow public read access to lessons" ON public.lessons
    FOR SELECT TO authenticated USING (true);

-- Allow admins/teachers to manage subjects, topics, lessons
CREATE POLICY "Allow teachers to manage subjects" ON public.subjects
    FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'teacher' OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher');

CREATE POLICY "Allow teachers to manage topics" ON public.topics
    FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'teacher' OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher');

CREATE POLICY "Allow teachers to manage lessons" ON public.lessons
    FOR ALL TO authenticated USING (auth.jwt() ->> 'role' = 'teacher' OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher');

-- learning_progress RLS policies (students/users can manage their own, teachers can view all)
CREATE POLICY "Users can manage their own progress" ON public.learning_progress
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all progress" ON public.learning_progress
    FOR SELECT TO authenticated USING (auth.jwt() ->> 'role' = 'teacher' OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'teacher');

-- lesson_sessions RLS policies (users can manage their own)
CREATE POLICY "Users can manage their own sessions" ON public.lesson_sessions
    FOR ALL TO authenticated USING (auth.uid() = user_id);
