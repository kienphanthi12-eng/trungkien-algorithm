@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
git add backend/app/api/endpoints/submissions.py
git add backend/requirements.txt
git add frontend/src/pages/AssignmentDetail.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Phase 5b: DeepSeek + Anthropic dual LLM grader, httpx dep"
git push
echo.
echo === DONE ===
pause
