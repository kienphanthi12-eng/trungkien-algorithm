@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
git add backend/main.py
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Fix CORS: add catchall OPTIONS handler to fix preflight 405 - root cause of Failed to fetch"
git push
echo.
echo === DONE - Railway deploy ~2 phut ===
pause
