@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
git add backend/migrations/002_create_assignments_table.sql
git add backend/app/schemas/assignments.py
git add backend/app/api/endpoints/assignments.py
git add backend/main.py
git add frontend/src/services/api.js
git add frontend/src/App.jsx
git add frontend/src/pages/Assignments.jsx
git add frontend/src/pages/AssignmentDetail.jsx
git add frontend/src/pages/ProblemDetail.jsx
git add frontend/src/pages/Dashboard.jsx
git add frontend/src/pages/Problems.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Phase 4: Assignment Flow - create/list/detail assignments, Giao bai modal"
git push
echo.
echo === DONE ===
pause
