"""
gemini_vision.py — Gọi Gemini Flash multimodal để:
  1. Đọc ảnh trang PDF
  2. Trích xuất bài toán
  3. Sinh Matplotlib code cho từng hình vẽ
"""

import os
import json
import base64
import httpx
from typing import List, Dict


GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

SYSTEM_PROMPT = """Bạn là chuyên gia phân tích đề thi toán học Việt Nam. Tôi sẽ cho bạn xem ảnh một trang PDF đề thi.

NHIỆM VỤ:
1. Xác định từng bài toán/câu hỏi trên trang
2. Với mỗi hình vẽ toán học, mô tả CHI TIẾT hình bằng lời (KHÔNG viết code)

TRẢ VỀ JSON THUẦN TÚY (không có markdown, không có ```json):
{
  "problems": [
    {
      "title": "Câu 1: Tên ngắn gọn",
      "description": "Nội dung đề bài đầy đủ. Dùng [HÌNH_1] để đánh dấu vị trí hình vẽ.",
      "difficulty": "easy | medium | hard",
      "category": "Hình học | Đại số | Giải tích | Lượng giác | Tổ hợp | Xác suất | Thống kê",
      "problem_type": "essay",
      "figures": [
        {
          "id": "HÌNH_1",
          "description": "Mô tả đầy đủ: loại hình (tam giác/đường tròn/đồ thị...), tên điểm (A,B,C,O...), kích thước số (AB=3cm, R=5, góc=70°...), quan hệ hình học (vuông tại A, nội tiếp, tiếp tuyến...), phần cần tô màu hoặc nhấn mạnh"
        }
      ]
    }
  ]
}

LƯU Ý:
- figures[].description phải đủ thông tin để vẽ lại hình mà không cần nhìn ảnh gốc
- Ghi rõ TẤT CẢ giá trị số (độ dài, góc, bán kính) từ hình
- Nếu trang không có hình vẽ: "figures": []
- Nếu trang trắng hoặc không phải đề bài: "problems": []
- Viết tiếng Việt đầy đủ dấu
- Dùng ký hiệu Unicode: ², ³, √, ≤, ≥, π, ∞, ∈, ∀"""


def _call_gemini_sync(image_b64: str, page_text: str) -> List[Dict]:
    """
    Gọi Gemini Flash API với ảnh trang PDF.
    Trả về list các bài toán đã parse.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY chưa được cấu hình trong environment variables.")

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": SYSTEM_PROMPT
                    },
                    {
                        "inline_data": {
                            "mime_type": "image/png",
                            "data": image_b64
                        }
                    },
                    {
                        "text": (
                            f"Text thô từ trang (để tham khảo thêm):\n{page_text}\n\n"
                            "Hãy phân tích ảnh trang PDF trên và trả về JSON theo đúng cấu trúc đã mô tả."
                        )
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,       # Thấp để kết quả ổn định, chính xác
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json"
        }
    }

    resp = httpx.post(
        f"{GEMINI_API_URL}?key={api_key}",
        json=payload,
        timeout=120.0,
        headers={"Content-Type": "application/json"}
    )
    resp.raise_for_status()

    result = resp.json()
    raw_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()

    # Strip markdown nếu Gemini vẫn wrap
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    parsed = json.loads(raw_text)
    return parsed.get("problems", [])


def analyze_page(image_b64: str, page_text: str) -> List[Dict]:
    """
    Public interface: phân tích 1 trang PDF, trả về list bài toán.
    Mỗi bài toán có thêm field 'figures' chứa matplotlib_code.
    """
    return _call_gemini_sync(image_b64, page_text)
