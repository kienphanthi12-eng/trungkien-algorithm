@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
git add backend/app/api/endpoints/assignments.py
git add backend/app/schemas/assignments.py
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Fix critical: restore truncated delete_assignment endpoint, fix syntax error causing Railway crash"
git push
echo.
echo === DONE - Railway se tu deploy trong ~2 phut ===
pause
