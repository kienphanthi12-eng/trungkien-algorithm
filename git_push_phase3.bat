@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
git add frontend/src/pages/Problems.jsx frontend/src/pages/Dashboard.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Fix: restore truncated Problems.jsx, add Dashboard Phase 3 card"
git push
echo.
echo === DONE ===
pause
