@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
git add frontend/src/pages/Exams.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Fix: replace broken /assignments/create link with inline assign modal in Exams page"
git push
echo.
echo === DONE - Vercel deploy ~1 phut ===
pause
