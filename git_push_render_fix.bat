@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
git add frontend/src/pages/ProblemDetail.jsx
git add backend/app/api/endpoints/problems.py
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Fix: description renderer dep hon + AI prompt viet tieng Viet day du dau"
git push
echo.
echo === DONE ===
pause
