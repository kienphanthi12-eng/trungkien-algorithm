@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
git add frontend/src/pages/Problems.jsx backend/app/api/endpoints/problems.py
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Fix: correct JSX structure in Problems.jsx and clean up problems.py"
git push
echo.
echo === DONE ===
pause
