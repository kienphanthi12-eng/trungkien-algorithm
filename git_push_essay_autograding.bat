@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
git add backend/app/api/endpoints/submissions.py
git add backend/app/api/endpoints/problems.py
git add frontend/src/pages/CreateProblem.jsx
git add frontend/src/pages/AssignmentDetail.jsx
git add frontend/src/pages/ProblemDetail.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Feature: them loai bai tu luan + fix logic grading MCQ/TF tu dong, essay dung AI essay prompt"
git push
echo.
echo === DONE ===
pause
