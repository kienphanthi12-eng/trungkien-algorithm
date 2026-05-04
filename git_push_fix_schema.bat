@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
git add backend/app/schemas/problems.py
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Fix: parse Supabase JSONB string fields (test_cases, choices) in Problem schema - fixes ResponseValidationError 500"
git push
echo.
echo === DONE - Railway deploy ~2 phut ===
pause
