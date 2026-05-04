@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm

if exist ".git\index.lock" del /f ".git\index.lock"

git add backend/requirements.txt
git add backend/app/api/endpoints/exams.py
git add backend/app/api/endpoints/submissions.py
git add backend/app/api/endpoints/chat.py
git add backend/app/api/endpoints/problems.py
git add frontend/src/pages/AnalyzeExam.jsx

git commit -m "fix: switch all AI to DeepSeek only; fix 400 error by removing image_url from text-only model; PDF-only upload; clear error messages"

git push origin main

echo.
echo === DONE - Railway + Vercel deploy ~2 phut ===
pause
