@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm

if exist ".git\index.lock" del /f ".git\index.lock"

git add backend/requirements.txt
git add backend/app/api/endpoints/exams.py
git rm --cached backend/nixpacks.toml 2>nul
git add backend/nixpacks.toml 2>nul

git commit -m "fix: replace Tesseract with Gemini Vision for image-based PDFs; DeepSeek for text PDFs"

git push origin main

echo.
echo === DONE ===
echo.
echo BUOC TIEP THEO - Them GEMINI_API_KEY vao Railway:
echo 1. Vao https://aistudio.google.com/apikey - lay API key mien phi
echo 2. Railway Dashboard ^> Variables ^> Add: GEMINI_API_KEY = your_key
echo 3. Railway tu deploy lai
pause
