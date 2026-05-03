@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm
del /f .git\index.lock 2>nul
git add backend/app/schemas/auth.py
git add backend/app/api/endpoints/auth.py
git add frontend/src/contexts/AuthContext.jsx
git add frontend/src/services/api.js
git add frontend/src/pages/Login.jsx
git -c user.email="kienphanthi12@gmail.com" -c user.name="kienphanthi12-eng" commit -m "Fix: auto token refresh - store refresh_token, schedule refresh 2min before expiry, POST /auth/refresh"
git push
echo.
echo === DONE ===
pause
