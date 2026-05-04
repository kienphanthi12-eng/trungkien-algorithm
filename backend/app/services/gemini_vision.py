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
2. Với mỗi hình vẽ toán học trong bài, viết code Python Matplotlib để vẽ lại chính xác

TRẢ VỀ JSON THUẦN TÚY (không có markdown, không có ```json):
{
  "problems": [
    {
      "title": "Câu 1: Tên ngắn gọn",
      "description": "Nội dung đề bài đầy đủ. Dùng [HÌNH_1] để đánh dấu vị trí hình vẽ trong đề.",
      "difficulty": "easy | medium | hard",
      "category": "Hình học | Đại số | Giải tích | Lượng giác | Tổ hợp | Xác suất | Thống kê",
      "problem_type": "essay",
      "figures": [
        {
          "id": "HÌNH_1",
          "description": "Mô tả hình: tam giác ABC vuông tại A, AB=3cm, BC=5cm",
          "matplotlib_code": "# Code vẽ hình — xem quy tắc bên dưới\nfig, ax = plt.subplots(figsize=(6,5))\n..."
        }
      ]
    }
  ]
}

QUY TẮC CHO matplotlib_code:
- ĐÃ IMPORT SẴN: matplotlib.pyplot as plt, numpy as np, math, matplotlib.patches as patches
- KHÔNG gọi plt.show() hay plt.savefig() — hệ thống tự lưu sau
- KHÔNG import lại các thư viện trên
- Được phép import: from mpl_toolkits.mplot3d import Axes3D (cho hình không gian)
- Được phép import: from mpl_toolkits.mplot3d.art3d import Poly3DCollection

CHO TỪNG LOẠI HÌNH:

Hình học phẳng (tam giác, tứ giác, đường tròn):
- Dùng tọa độ cụ thể từ đề bài (ví dụ: A=[0,3], B=[0,0], C=[4,0])
- Vẽ đường thẳng bằng plt.plot(), góc vuông bằng patches.Rectangle()
- Thêm nhãn đỉnh (A, B, C...) và số đo cạnh/góc
- ax.set_aspect('equal'), ax.axis('off')

Đồ thị hàm số (parabol, đường thẳng, lượng giác):
- Dùng x = np.linspace(a, b, 400) để tạo dải giá trị
- Vẽ lưới nhẹ: ax.grid(True, alpha=0.3)
- Đánh dấu điểm đặc biệt bằng ax.scatter()
- Thêm nhãn hàm số trong legend

Hình không gian (hình hộp, hình chóp, mặt cầu):
- Dùng fig = plt.figure(); ax = fig.add_subplot(111, projection='3d')
- Vẽ các cạnh bằng ax.plot()
- Mặt trong suốt bằng Poly3DCollection với alpha=0.15

Biểu đồ/Thống kê (cột, tròn, đường):
- Dùng ax.bar(), ax.pie(), ax.plot() tương ứng
- Thêm nhãn giá trị trên mỗi cột/phần
- Màu sắc rõ ràng, có legend

LƯU Ý QUAN TRỌNG:
- Nếu trang không có hình vẽ, để "figures": []
- Nếu trang trắng hoặc không phải đề bài, trả về "problems": []
- Viết tiếng Việt đầy đủ dấu trong title và description
- Dùng ký hiệu Unicode cho toán: ², ³, √, ≤, ≥, π, ∞, ∈, ∀"""


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
