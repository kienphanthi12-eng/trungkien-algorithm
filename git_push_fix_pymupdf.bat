@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm

if exist ".git\index.lock" del /f ".git\index.lock"

git add backend/requirements.txt
git add backend/app/api/endpoints/exams.py
git add frontend/src/pages/AnalyzeExam.jsx

git commit -m "fix: add PyMuPDF fallback for PDFs with MathType/LaTeX fonts; PDF-only mode for DeepSeek"

git push origin main

echo.
echo === DONE - Railway + Vercel deploy ~2 phut ===
pause
