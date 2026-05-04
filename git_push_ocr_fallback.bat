@echo off
cd /d C:\Users\HP\.gemini\antigravity\scratch\TrungKienAlgorithm

if exist ".git\index.lock" del /f ".git\index.lock"

git add backend/requirements.txt
git add backend/nixpacks.toml
git add backend/app/api/endpoints/exams.py

git commit -m "fix: add Tesseract OCR fallback for image-based PDFs (scan/MathType); nixpacks for Railway"

git push origin main

echo.
echo === DONE ===
echo Railway se cai tesseract-ocr + tesseract-ocr-vie khi build (~3-5 phut)
echo Sau do upload testde.pdf se doc duoc bang OCR
pause
