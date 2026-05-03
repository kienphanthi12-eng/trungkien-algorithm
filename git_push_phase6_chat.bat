@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
del /f .git\HEAD.lock 2>nul
git add backend/app/api/endpoints/chat.py
git add backend/main.py
git add frontend/src/services/api.js
git add frontend/src/pages/AssignmentDetail.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Phase 6: LLM Chat Proxy - hoc sinh hoi AI tro giang vien, AI goi y khong cho dap an"
git push
echo.
echo === DONE ===
pause
