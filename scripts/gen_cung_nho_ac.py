"""
Script: Sinh hình vẽ đúng cho các bài "Số đo cung nhỏ AC"
Hình học: Góc nội tiếp ABC trên đường tròn (O), tính cung nhỏ AC

Chạy: python scripts/gen_cung_nho_ac.py
"""

import base64
import io
import math
import httpx
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# ── Supabase config ────────────────────────────────────────────────────────────
SUPABASE_URL = "https://zabvdgnucfanvbjjgnic.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphYnZkZ251Y2ZhbnZiampnbmljIiwicm9sZSI"
    "6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ1MDE1MSwiZXhwIjoyMDkzMDI2MTUxfQ"
    ".S4FPa6L1uvv01DQNsQEj2CXFLt97m7pbJku9GWbcN64"
)

# ── Danh sách bài cần cập nhật ─────────────────────────────────────────────────
PROBLEMS = [
    {"id": "175b4df6-ce90-4c2e-8d1e-63e7933d9c6f", "angle": 70},
    {"id": "6e918534-f420-4b04-a54c-00a8488fe0ce", "angle": 40},
    {"id": "d9ade71c-098d-4438-8c79-916e7f184c2c", "angle": 50},
    {"id": "e428952a-796f-4565-9a49-9227df394e21", "angle": 70},
]


def make_figure(inscribed_angle: int) -> bytes:
    """
    Vẽ hình minh hoạ góc nội tiếp ABC = inscribed_angle°.

    Bố cục:
    - Đường tròn tâm O, bán kính 1
    - A (trái trên) và C (phải trên) đối xứng qua trục y
    - Cung nhỏ AC (phần trên) = 2 * inscribed_angle° (tô đỏ)
    - B ở phía dưới, trên cung lớn
    - Hai dây BA và BC tạo góc nội tiếp ABC
    """
    arc_AC_deg = 2 * inscribed_angle      # Cung nhỏ AC theo định lý góc nội tiếp

    R = 1.0
    # A và C đối xứng qua trục y, cung AC ở phía trên
    #   A ở góc (90 + arc_AC/2)° ,  C ở góc (90 - arc_AC/2)°
    angle_A = math.radians(90 + arc_AC_deg / 2)
    angle_C = math.radians(90 - arc_AC_deg / 2)
    angle_B = math.radians(250)            # B ở phía dưới, lệch nhẹ để label đẹp

    A = np.array([R * math.cos(angle_A), R * math.sin(angle_A)])
    C = np.array([R * math.cos(angle_C), R * math.sin(angle_C)])
    B = np.array([R * math.cos(angle_B), R * math.sin(angle_B)])
    O = np.array([0.0, 0.0])

    fig, ax = plt.subplots(figsize=(5, 5))

    # Đường tròn chính
    circle = plt.Circle((0, 0), R, fill=False, color="black", linewidth=1.8, zorder=1)
    ax.add_patch(circle)

    # Tô cung nhỏ AC màu đỏ
    arc_start = math.degrees(angle_C)   # góc nhỏ hơn (bên phải)
    arc_end   = math.degrees(angle_A)   # góc lớn hơn (bên trái)
    arc_red = patches.Arc(
        (0, 0), 2 * R, 2 * R,
        angle=0, theta1=arc_start, theta2=arc_end,
        color="#e53e3e", linewidth=3.5, zorder=3,
    )
    ax.add_patch(arc_red)

    # Dây BA và BC
    ax.plot([B[0], A[0]], [B[1], A[1]], color="#2b6cb0", linewidth=1.4, zorder=2)
    ax.plot([B[0], C[0]], [B[1], C[1]], color="#2b6cb0", linewidth=1.4, zorder=2)

    # Góc nội tiếp tại B
    dir_BA = A - B;  dir_BA /= np.linalg.norm(dir_BA)
    dir_BC = C - B;  dir_BC /= np.linalg.norm(dir_BC)
    ang_BA = math.degrees(math.atan2(dir_BA[1], dir_BA[0]))
    ang_BC = math.degrees(math.atan2(dir_BC[1], dir_BC[0]))
    # Đảm bảo theta1 < theta2
    t1, t2 = sorted([ang_BA, ang_BC])
    angle_arc = patches.Arc(
        B, 0.28, 0.28, angle=0, theta1=t1, theta2=t2,
        color="#2b6cb0", linewidth=1.3, zorder=4,
    )
    ax.add_patch(angle_arc)
    # Nhãn góc
    mid_ang = math.radians((t1 + t2) / 2)
    lx = B[0] + 0.22 * math.cos(mid_ang)
    ly = B[1] + 0.22 * math.sin(mid_ang)
    ax.text(lx, ly, f"{inscribed_angle}°", fontsize=9, color="#2b6cb0",
            ha="center", va="center", fontweight="bold")

    # Các điểm
    POINTS = [
        (A, "A", (-0.13, 0.06)),
        (C, "C", ( 0.12, 0.06)),
        (B, "B", ( 0.04,-0.14)),
        (O, "O", (-0.12,-0.07)),
    ]
    for pt, label, (dx, dy) in POINTS:
        ax.plot(*pt, "o", color="black", markersize=4.5, zorder=5)
        ax.text(pt[0] + dx, pt[1] + dy, label,
                fontsize=13, fontweight="bold", ha="center", va="center")

    # Nhãn cung nhỏ AC
    mid_arc_ang = math.radians((arc_start + arc_end) / 2)
    lax = (R + 0.22) * math.cos(mid_arc_ang)
    lay = (R + 0.22) * math.sin(mid_arc_ang)
    ax.text(lax, lay, f"cung AC\n= {arc_AC_deg}°",
            fontsize=8.5, color="#e53e3e", ha="center", va="center",
            fontweight="bold")

    ax.set_xlim(-1.55, 1.55)
    ax.set_ylim(-1.55, 1.55)
    ax.set_aspect("equal")
    ax.axis("off")

    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=120, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def update_supabase(problem_id: str, png_bytes: bytes) -> bool:
    b64 = base64.b64encode(png_bytes).decode("utf-8")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    resp = httpx.patch(
        f"{SUPABASE_URL}/rest/v1/problems?id=eq.{problem_id}",
        headers=headers,
        json={"figure_image": b64},
        timeout=30.0,
    )
    return resp.status_code in (200, 204)


if __name__ == "__main__":
    for prob in PROBLEMS:
        pid   = prob["id"]
        angle = prob["angle"]
        print(f"[{pid[:8]}...] angle={angle}° → generating...", end=" ", flush=True)

        png = make_figure(angle)
        print(f"{len(png)//1024}KB", end=" → uploading...", flush=True)

        ok = update_supabase(pid, png)
        print("✓ OK" if ok else "✗ FAIL")
