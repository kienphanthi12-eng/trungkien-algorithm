@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
git add backend/app/api/endpoints/exams.py
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "fix: use AsyncAnthropic in analyze endpoint to prevent APIConnectionError in async context"
git push
echo.
echo === DONE - Railway deploy ~2 phut ===
pause
