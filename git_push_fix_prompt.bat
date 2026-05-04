@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm

if exist ".git\index.lock" del /f ".git\index.lock"

git add backend/app/api/endpoints/exams.py

git commit -m "fix: rewrite VARIANT_SYSTEM_PROMPT with mandatory self-check step to prevent multiple correct answers"

git push origin main

echo.
echo === DONE - Railway deploy ~2 phut ===
pause
