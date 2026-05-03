@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
git add frontend/src/contexts/AuthContext.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Fix: validate JWT structure in AuthContext, discard corrupted tokens"
git push
echo.
echo === DONE ===
pause
