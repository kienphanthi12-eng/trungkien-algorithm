@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
git add backend/app/api/endpoints/exams.py
git add frontend/src/services/api.js
git add frontend/src/pages/AnalyzeExam.jsx
git add frontend/src/App.jsx
git add frontend/src/pages/Exams.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "feat: Phase 7 Stage 2 - AI Exam Analyzer (Claude Vision PDF/image -> structured questions -> create exam)"
git push
echo.
echo === DONE - Railway + Vercel deploy ~2 phut ===
pause
