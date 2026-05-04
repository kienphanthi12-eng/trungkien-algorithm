"""
pdf_convert.py — FastAPI endpoint chuyển đổi PDF đề thi → JSON ZENTUS

Pipeline:
  PDF Upload
    → pdf_parser   : trích xuất ảnh + text từng trang
    → gemini_vision: phân tích bài toán + sinh Matplotlib code cho hình
    → sandbox      : thực thi code → PNG bytes (base64)
    → JSON output  : chuẩn schema ZENTUS problems
"""

import asyncio
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.api.dependencies import get_current_teacher
from app.services import pdf_parser, gemini_vision, sandbox_executor

router = APIRouter()

# ── Response schema ────────────────────────────────────────────────────────────

class FigureResult(BaseModel):
    id: str                        # "HÌNH_1", "HÌNH_2"...
    description: str
    image_b64: Optional[str]       # PNG base64 — None nếu vẽ lỗi


class ProblemResult(BaseModel):
    title: str
    description: str               # Có chứa placeholder [HÌNH_1] trong text
    difficulty: str
    category: str
    problem_type: str
    figures: List[FigureResult]    # Danh sách hình đã được vẽ
    page_num: int


class ConvertPDFResponse(BaseModel):
    total_pages: int
    total_problems: int
    problems: List[ProblemResult]


# ── Core pipeline (sync — chạy trong thread pool) ──────────────────────────────

def _process_page_sync(page: dict) -> List[dict]:
    """
    Xử lý 1 trang PDF:
      1. Gọi Gemini để phân tích + lấy matplotlib_code
      2. Chạy sandbox cho từng hình
      3. Trả về list bài toán đã có hình được vẽ
    """
    page_num = page["page_num"]

    # Bỏ qua trang trắng
    if not page["text"] and len(page["image_b64"]) < 1000:
        return []

    # Bước 1: Gemini Vision phân tích trang
    try:
        raw_problems = gemini_vision.analyze_page(
            image_b64=page["image_b64"],
            page_text=page["text"],
        )
    except Exception as e:
        print(f"[pdf_convert] Trang {page_num}: Gemini lỗi — {e}")
        return []

    results = []

    for prob in raw_problems:
        figures_out = []

        # Bước 2: Sandbox thực thi matplotlib_code cho từng hình
        for fig in prob.get("figures", []):
            code = fig.get("matplotlib_code", "").strip()
            img_b64 = None

            if code:
                img_b64 = sandbox_executor.execute_and_encode(code, timeout=15)

            figures_out.append({
                "id": fig.get("id", f"HÌNH_{len(figures_out)+1}"),
                "description": fig.get("description", ""),
                "image_b64": img_b64,
            })

        results.append({
            "title": prob.get("title", f"Câu — Trang {page_num}"),
            "description": prob.get("description", ""),
            "difficulty": prob.get("difficulty", "medium"),
            "category": prob.get("category", "Toán học"),
            "problem_type": prob.get("problem_type", "essay"),
            "figures": figures_out,
            "page_num": page_num,
        })

    return results


def _run_pipeline_sync(pdf_bytes: bytes) -> dict:
    """Chạy toàn bộ pipeline đồng bộ."""
    # Bước 0: Parse PDF
    pages = pdf_parser.extract_pages(pdf_bytes)

    all_problems = []
    for page in pages:
        problems = _process_page_sync(page)
        all_problems.extend(problems)

    return {
        "total_pages": len(pages),
        "total_problems": len(all_problems),
        "problems": all_problems,
    }


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post(
    "/convert-pdf",
    response_model=ConvertPDFResponse,
    summary="Chuyển đổi PDF đề thi → JSON ZENTUS (có hình vẽ Matplotlib)",
)
async def convert_pdf(
    file: UploadFile = File(..., description="File PDF đề thi toán học"),
    current_user=Depends(get_current_teacher),
):
    """
    Upload một file PDF đề thi toán.
    Hệ thống sẽ:
    - Đọc từng trang bằng PyMuPDF
    - Dùng Gemini Flash phân tích bài toán và hình vẽ
    - Sinh Matplotlib code và vẽ lại từng hình thành ảnh PNG
    - Trả về JSON danh sách bài toán kèm hình ảnh (base64)

    Thời gian xử lý: ~10-30 giây/trang tùy số lượng hình.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chấp nhận file PDF (.pdf).",
        )

    # Giới hạn kích thước 20MB
    MAX_SIZE = 20 * 1024 * 1024
    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File quá lớn ({len(pdf_bytes)//1024//1024}MB). Tối đa 20MB.",
        )

    if len(pdf_bytes) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File PDF rỗng hoặc không hợp lệ.",
        )

    # Chạy pipeline trong thread pool (tránh block event loop)
    try:
        result = await asyncio.to_thread(_run_pipeline_sync, pdf_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xử lý PDF: {str(e)}",
        )

    if result["total_problems"] == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Không tìm thấy bài toán nào trong file PDF. Hãy kiểm tra lại nội dung.",
        )

    return result
