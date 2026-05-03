# ZENTUS — Technical Specification

## Overview
Teacher-student platform for Vietnamese math olympiad training. Teachers create/assign problems, students submit solutions, AI grades automatically.

## Architecture Constraints

**MUST USE:**
- Backend: Python FastAPI (NOT Node.js, NOT Go)
- Frontend: Vite + React + TailwindCSS (NOT Next.js)
- Database: Postgres via Supabase (NOT self-hosted, NOT SQLite in production)
- Auth: Supabase Auth (NOT custom JWT, NOT OAuth from scratch)
- Storage: Cloudflare R2 (NOT AWS S3)
- Deployment: Railway (backend) + Vercel (frontend)

**MUST NOT:**
- No Kubernetes, Docker Swarm, or microservices
- No Redis/MongoDB/NoSQL
- No WebSocket/real-time features yet
- No custom email server (use Supabase email)

## Database Schema

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students_teachers (
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, student_id)
);

CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement TEXT NOT NULL,
  solution TEXT,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES users(id),
  student_id UUID REFERENCES users(id),
  problem_id UUID REFERENCES problems(id),
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  text_content TEXT,
  image_urls TEXT[],
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  feedback_json JSONB,
  graded_at TIMESTAMPTZ DEFAULT NOW()
);

## API Endpoints (Priority Order)

### Phase 1: Auth + Setup
- POST /auth/register (teacher creates student accounts)
- POST /auth/login (returns JWT)
- GET /auth/me (verify token)

### Phase 2: Student Management
- GET /students (teacher sees their students)
- POST /students (teacher adds student)
- DELETE /students/{id}

### Phase 3: Problem Management
- POST /problems (create problem, can call LLM)
- GET /problems (list problems)
- GET /problems/{id}

### Phase 4: Assignment Flow
- POST /assignments (teacher assigns problem to student)
- GET /assignments (filter by student_id or teacher_id)
- GET /assignments/{id}

### Phase 5: Submission & Grading
- POST /submissions (student submits text + images)
- POST /submissions/upload-image (returns R2 URL)
- POST /submissions/{id}/grade (calls LLM grader)
- GET /submissions/{id}

### Phase 6: LLM Proxy (backend only)
- POST /llm/solve (Module I: Solver)
- POST /llm/generate (Module II: Generator)
- POST /llm/grade (Module III: Grader)

**Critical:** ALL LLM calls go through backend. Frontend NEVER sees API keys.

## Security Requirements

1. **Auth**: Every endpoint except /auth/* requires valid JWT in Authorization header
2. **Authorization**: Teachers can only see their own students; students can only see their own assignments
3. **Input validation**: Validate all inputs (email format, file size, SQL injection prevention)
4. **Secrets**: API keys stored in environment variables, never in code
5. **CORS**: Only allow frontend domain
6. **Rate limiting**: 100 requests/minute per user

## File Upload Constraints

- Max size: 10MB
- Allowed types: JPEG, PNG only
- Resize to max 2048px width before storing
- Store in Cloudflare R2, return public URL
- Validate file headers (not just extension)

## LLM Integration

Support both Anthropic Claude and DeepSeek:
- Backend reads ANTHROPIC_API_KEY and DEEPSEEK_API_KEY from env
- Frontend sends { provider: 'anthropic' | 'deepseek', model: '...', prompt: '...' }
- Backend proxies to correct API
- Log every call: user_id, provider, model, input_tokens, output_tokens, cost
- Store logs in `llm_usage` table for cost tracking

## UI/UX Requirements

- Vietnamese language throughout
- LaTeX rendering with KaTeX
- Mobile-responsive (Tailwind responsive classes)
- Loading states for all async operations
- Error messages in Vietnamese

## Development Workflow

1. Start with Supabase Auth setup (don't roll custom JWT)
2. Use Supabase SDK (@supabase/supabase-js) for DB queries, not raw SQL
3. Test each endpoint with Postman/Thunder Client before frontend
4. Commit after each working feature
5. Deploy to Railway/Vercel after Phase 1 complete
