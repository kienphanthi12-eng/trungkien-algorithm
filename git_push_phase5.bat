@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
git add backend/migrations/003_create_submissions_table.sql
git add backend/app/schemas/submissions.py
git add backend/app/api/endpoints/submissions.py
git add backend/main.py
git add frontend/src/services/api.js
git add frontend/src/pages/AssignmentDetail.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Phase 5: Submission & Grading - submit, view, AI grading with Claude"
git push
echo.
echo === DONE ===
pause
