"""
figure_generator.py — Bước 2 pipeline: mô tả hình → Matplotlib code → PNG base64.

Gọi Gemini với prompt chuyên biệt về toán học để sinh code ĐÚNG hình học,
sau đó thực thi qua sandbox_executor.
"""

import os
import httpx
from typing import Optional

from app.services import sandbox_executor

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

# Prompt chuyên biệt: dạy LLM cách vẽ đúng từng loại hình toán học
FIGURE_CODE_PROMPT = """\
Bạn là chuyên gia vẽ hình toán học Việt Nam bằng Python Matplotlib.

NHIỆM VỤ: Từ mô tả bài toán → viết code Python Matplotlib vẽ ĐÚNG hình minh hoạ.

ĐÃ IMPORT SẴN (KHÔNG import lại, KHÔNG khai báo lại):
  matplotlib.pyplot as plt, numpy as np, math, matplotlib.patches as patches

KHÔNG gọi: plt.show()  plt.savefig()  plt.tight_layout()
TRẢ VỀ: Chỉ code Python thuần. Không markdown, không giải thích, không ```python.

══════════════════════════════════════════════════════════════════
VÍ DỤ 1 — GÓC NỘI TIẾP / CUNG TRÒN
Bài: "Góc nội tiếp ABC = 70°, tìm số đo cung nhỏ AC"

  R = 1.0
  ins = 70                          # góc nội tiếp (thay bằng giá trị thực tế)
  arc = 2 * ins                     # cung AC = 2 × góc nội tiếp
  # A và C đối xứng qua trục y, cung nhỏ ở PHÍA TRÊN
  aA = math.radians(90 + arc / 2)  # ví dụ: 160°
  aC = math.radians(90 - arc / 2)  # ví dụ:  20°
  aB = math.radians(260)            # B phía dưới trên cung lớn
  A = [R*math.cos(aA), R*math.sin(aA)]
  C = [R*math.cos(aC), R*math.sin(aC)]
  B = [R*math.cos(aB), R*math.sin(aB)]
  O = [0.0, 0.0]
  fig, ax = plt.subplots(figsize=(5, 5))
  ax.add_patch(plt.Circle((0, 0), R, fill=False, color='black', lw=1.8))
  ax.add_patch(patches.Arc((0,0), 2*R, 2*R, theta1=math.degrees(aC),
                            theta2=math.degrees(aA), color='#e53e3e', lw=3.5))
  ax.plot([B[0],A[0]], [B[1],A[1]], 'b-', lw=1.4)
  ax.plot([B[0],C[0]], [B[1],C[1]], 'b-', lw=1.4)
  for pt, lbl, (dx,dy) in [(A,'A',(-0.14,0.08)),(C,'C',(0.13,0.08)),
                             (B,'B',(0.05,-0.15)),(O,'O',(-0.13,-0.08))]:
      ax.plot(*pt, 'ko', ms=4.5)
      ax.text(pt[0]+dx, pt[1]+dy, lbl, fontsize=13, fontweight='bold', ha='center')
  mid_a = math.radians((math.degrees(aC) + math.degrees(aA)) / 2)
  ax.text((R+0.22)*math.cos(mid_a), (R+0.22)*math.sin(mid_a),
          f'cung AC={arc}°', fontsize=9, color='#e53e3e', ha='center', fontweight='bold')
  ax.set_xlim(-1.55, 1.55); ax.set_ylim(-1.55, 1.55)
  ax.set_aspect('equal'); ax.axis('off')

══════════════════════════════════════════════════════════════════
VÍ DỤ 2 — TAM GIÁC (vuông, cân, thường)
Bài: "Tam giác ABC vuông tại A, AB=3cm, AC=4cm, BC=5cm"

  fig, ax = plt.subplots(figsize=(6, 5))
  A, B, C = [0,0], [0,3], [4,0]    # tọa độ tính từ độ dài thực tế
  ax.add_patch(plt.Polygon([A,B,C], fill=False, edgecolor='black', lw=2))
  ax.add_patch(patches.Rectangle(A, 0.25, 0.25, fill=False, edgecolor='black', lw=1.2))
  for pt, lbl, (dx,dy) in [(A,'A',(-0.25,-0.2)),(B,'B',(-0.25,0.15)),(C,'C',(0.15,-0.2))]:
      ax.plot(*pt, 'ko', ms=4)
      ax.text(pt[0]+dx, pt[1]+dy, lbl, fontsize=13, fontweight='bold')
  def mid(P,Q): return [(P[0]+Q[0])/2, (P[1]+Q[1])/2]
  ax.text(*mid(A,B), '3cm', fontsize=10, ha='right')
  ax.text(*mid(A,C), '4cm', fontsize=10, ha='center', va='top')
  ax.text(*mid(B,C), '5cm', fontsize=10, ha='left')
  ax.set_aspect('equal'); ax.axis('off'); ax.autoscale()

══════════════════════════════════════════════════════════════════
VÍ DỤ 3 — ĐỒ THỊ HÀM SỐ
Bài: "Vẽ parabol y = x² - 2x - 3"

  fig, ax = plt.subplots(figsize=(7, 5))
  x = np.linspace(-2, 4, 400)
  y = x**2 - 2*x - 3
  ax.plot(x, y, 'b-', lw=2, label='y = x² − 2x − 3')
  ax.axhline(0, color='k', lw=0.8); ax.axvline(0, color='k', lw=0.8)
  for xr in [-1, 3]:
      ax.plot(xr, 0, 'ro', ms=6)
      ax.annotate(f'({xr},0)', (xr,0), xytext=(5,10),
                  textcoords='offset points', fontsize=9)
  ax.grid(True, alpha=0.3); ax.legend(fontsize=10)
  ax.set_xlabel('x'); ax.set_ylabel('y')

══════════════════════════════════════════════════════════════════
VÍ DỤ 4 — HÌNH KHÔNG GIAN (chóp, hộp, lăng trụ)
Bài: "Hình hộp chữ nhật ABCD.A'B'C'D', AB=3, AD=4, AA'=5"

  from mpl_toolkits.mplot3d import Axes3D
  from mpl_toolkits.mplot3d.art3d import Poly3DCollection
  fig = plt.figure(figsize=(7,6))
  ax = fig.add_subplot(111, projection='3d')
  a, b, c = 3, 4, 5
  verts = [[0,0,0],[a,0,0],[a,b,0],[0,b,0],
           [0,0,c],[a,0,c],[a,b,c],[0,b,c]]
  edges = [(0,1),(1,2),(2,3),(3,0),(4,5),(5,6),(6,7),(7,4),
           (0,4),(1,5),(2,6),(3,7)]
  for i,j in edges:
      xs,ys,zs = zip(verts[i],verts[j])
      ax.plot(xs,ys,zs,'b-',lw=1.2)
  lbls = 'A B C D A\' B\' C\' D\''.split()
  offs = [(-0.2,-0.2,0),( 0.1,-0.2,0),( 0.1, 0.1,0),(-0.2, 0.1,0),
          (-0.2,-0.2,0.1),(0.1,-0.2,0.1),(0.1,0.1,0.1),(-0.2,0.1,0.1)]
  for (x,y,z),lbl,(dx,dy,dz) in zip(verts,lbls,offs):
      ax.text(x+dx,y+dy,z+dz,lbl,fontsize=10,fontweight='bold')
  ax.set_axis_off()

══════════════════════════════════════════════════════════════════
QUY TẮC BẮT BUỘC:
- Tọa độ PHẢI tính từ dữ liệu số trong bài (độ dài, góc, bán kính cụ thể)
- Nhãn điểm đúng với bài (A, B, C, O, M, N…)
- ax.set_aspect('equal') cho mọi hình phẳng
- ax.axis('off') cho hình hình học (không cần trục số)
- fontsize: nhãn đỉnh 12-14, nhãn cạnh 9-11
- Màu: đường chính 'black', highlight 'red'/'#e53e3e', đường phụ 'blue'
"""


def generate_figure_code(problem_description: str, figure_hint: str = "") -> Optional[str]:
    """
    Gọi Gemini sinh Matplotlib code từ mô tả bài toán.
    figure_hint: mô tả ngắn hình cần vẽ (tuỳ chọn, lấy từ bước 1 PDF pipeline).
    Trả về code string hoặc None nếu lỗi.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return None

    user_msg = f"Bài toán:\n{problem_description}"
    if figure_hint:
        user_msg += f"\n\nMô tả hình cần vẽ:\n{figure_hint}"
    user_msg += "\n\nViết Matplotlib code vẽ hình này. Chỉ code Python thuần."

    payload = {
        "contents": [{"parts": [{"text": FIGURE_CODE_PROMPT}, {"text": user_msg}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 4096},
    }

    try:
        resp = httpx.post(
            f"{GEMINI_URL}?key={api_key}",
            json=payload,
            timeout=90.0,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        code = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        if code.startswith("```"):
            code = code.split("```")[1]
            if code.startswith("python"):
                code = code[6:]
            code = code.rstrip("`").strip()
        return code
    except Exception as e:
        print(f"[figure_generator] Gemini error: {e}")
        return None


def generate_and_render(problem_description: str, figure_hint: str = "") -> Optional[str]:
    """
    Sinh code → thực thi qua sandbox → trả về PNG base64.
    Trả về None nếu thất bại ở bất kỳ bước nào.
    """
    code = generate_figure_code(problem_description, figure_hint)
    if not code:
        return None
    return sandbox_executor.execute_and_encode(code)
