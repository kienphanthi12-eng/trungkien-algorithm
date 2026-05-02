# TrungKien Algorithm Platform

## Project Status
- Phase 1: ✅ Complete (Auth - login/register/me)
- Phase 2: ✅ Complete (Student Management)
- Phase 3: 🔲 Pending (Problem Management)
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
- Backend uses SERVICE_ROLE key (in Railway env vars)
- Frontend uses ANON key (in Vercel env vars)
- All API calls go through backend, never direct Supabase
- Vietnamese UI throughout
