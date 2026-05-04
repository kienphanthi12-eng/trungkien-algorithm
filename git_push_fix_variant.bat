@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm

if exist ".git\index.lock" del /f ".git\index.lock"

git add backend/app/api/endpoints/exams.py

git commit -m "fix: batch variant generation (5 questions/call) to prevent JSON truncation"

git push origin main

echo.
echo === DONE - Railway deploy ~2 phut ===
pause
