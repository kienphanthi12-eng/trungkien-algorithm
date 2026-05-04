"""
pdf_parser.py — Trích xuất text và ảnh từng trang PDF bằng PyMuPDF.
"""

import fitz  # PyMuPDF
import base64
from typing import List, Dict


def extract_pages(pdf_bytes: bytes, zoom: float = 2.0) -> List[Dict]:
    """
    Đọc PDF từ bytes, trả về list các trang.

    Mỗi trang là dict:
        page_num  : int   — số trang (bắt đầu từ 1)
        image_b64 : str   — toàn trang render thành PNG, base64-encoded
        text      : str   — text thô trích xuất từ trang
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []

    mat = fitz.Matrix(zoom, zoom)  # zoom 2x → ảnh 150 dpi → Gemini đọc rõ hơn

    for i, page in enumerate(doc):
        # Render toàn trang thành ảnh PNG
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        img_bytes = pix.tobytes("png")
        img_b64 = base64.b64encode(img_bytes).decode("utf-8")

        # Text thô (dùng làm tham chiếu phụ, Gemini sẽ đọc ảnh trực tiếp)
        text = page.get_text("text")

        pages.append({
            "page_num": i + 1,
            "image_b64": img_b64,
            "text": text.strip(),
        })

    doc.close()
    return pages
