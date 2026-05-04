@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
git add backend/app/schemas/assignments.py
git add backend/app/api/endpoints/assignments.py
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Fix: assignments schema & endpoint support exam_id + problem_id nullable, fix enrich for NULL fields"
git push
echo.
echo === DONE - cho Railway deploy ~2 phut roi test lai ===
pause
