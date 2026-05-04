@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm

echo Xoa git lock file...
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\COMMIT_EDITMSG.lock" del /f ".git\COMMIT_EDITMSG.lock"

git add backend/requirements.txt backend/app/api/endpoints/exams.py
git commit -m "fix: update deprecated model names (haiku-4-5, sonnet-4-6) + trailing newline in requirements.txt for pypdf install + smarter text quality check"
git push origin main

echo.
echo === DONE - Railway deploy ~2 phut ===
pause
