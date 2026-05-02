# TrungKien Algorithm Platform

## Project Status
- Phase 1: ✅ Complete (Auth - login/register/me)
- Phase 2: ✅ Complete (Student Management)
- Phase 3: 🚀 In Progress (Problem Management - CRUD operations)
- Phase 4: 🔲 Pending (Assignment Flow)
- Phase 5: 🔲 Pending (Submission & Grading)
- Phase 6: 🔲 Pending (LLM Proxy)

## Tech Stack
- Backend: Python FastAPI + Supabase
- Frontend: Vite + React + TailwindCSS
- Database: Supabase (Postgres)
- Deploy: Railway (backend) + Vercel (frontend)

## Production URLs
- Backend: https://trungkien-algorithm-production.up.railway.app
- Frontend: https://trungkien-algorithm-ejqs.vercel.app
- Supabase: https://zabvdgnucfanvbjjgnic.supabase.co

## Local Development
- Backend: uvicorn main:app --reload (port 8000)
- Frontend: npm run dev (port 5173)
- Backend path: backend/
- Frontend path: frontend/

## Git Config
- user.email: kienphanthi12@gmail.com
- user.name: kienphanthi12-eng

## Important Notes
- RLS is DISABLED on public.users (fix in Phase 2+)
- RLS is ENABLED on public.problems (Phase 3+)
- Backend uses SERVICE_ROLE key (in Railway env vars)
- Frontend uses ANON key (in Vercel env vars)
- All API calls go through backend, never direct Supabase
- Vietnamese UI throughout

## Phase 3 - Problem Management Implementation

### Database Schema
- Table: `public.problems`
- Columns: id, title, description, difficulty, category, example_input, example_output, test_cases (JSONB), time_limit, memory_limit, created_by, created_at, updated_at
- RLS Policies: Public read, Teachers only create, Creator can edit/delete

### Backend Endpoints
- `GET /problems` - List all problems (with pagination, filters)
- `GET /problems/{id}` - Get problem details
- `POST /problems` - Create problem (teacher only)
- `PUT /problems/{id}` - Update problem (creator only)
- `DELETE /problems/{id}` - Delete problem (creator only)

### Frontend Pages
- `/problems` - List all problems with pagination
- `/problems/{id}` - View problem details
- `/problems/create` - Create new problem (teacher only)
- `/problems/{id}/edit` - Edit problem (creator only)

### Files Added
**Backend:**
- `app/schemas/problems.py` - Pydantic models
- `app/api/endpoints/problems.py` - API endpoints
- `migrations/001_create_problems_table.sql` - Database migration

**Frontend:**
- `src/pages/Problems.jsx` - List page
- `src/pages/ProblemDetail.jsx` - Detail page
- `src/pages/CreateProblem.jsx` - Create/Edit page
- Updated `src/services/api.js` - API client functions
- Updated `src/App.jsx` - Routes

### Next Steps for Phase 3
1. Run database migration in Supabase
2. Test all API endpoints
3. Test frontend components
4. Deploy to production
