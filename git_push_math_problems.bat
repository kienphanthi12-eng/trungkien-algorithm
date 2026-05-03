@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
git add backend/app/schemas/problems.py
git add backend/app/api/endpoints/problems.py
git add frontend/src/pages/CreateProblem.jsx
git add frontend/src/pages/ProblemDetail.jsx
git add frontend/src/pages/AssignmentDetail.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Feature: ho tro bai toan trac nghiem (multiple_choice, true_false) - giao vien tao bai, hoc sinh chon dap an A/B/C/D"
git push
echo.
echo === DONE ===
pause
