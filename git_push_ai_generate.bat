@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
git add backend/app/api/endpoints/problems.py
git add frontend/src/services/api.js
git add frontend/src/pages/CreateProblem.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Feature: AI problem generation - POST /problems/generate + UI modal in CreateProblem"
git push
echo.
echo === DONE ===
pause
