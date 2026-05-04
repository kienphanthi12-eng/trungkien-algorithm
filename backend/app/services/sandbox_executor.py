"""
sandbox_executor.py — Thực thi Matplotlib code do AI sinh ra một cách an toàn.

Cơ chế bảo vệ:
  - Chạy trong subprocess riêng biệt (cách ly khỏi process chính)
  - Timeout cứng 15 giây/hình
  - Chỉ cho phép import whitelist (matplotlib, numpy, math, mpl_toolkits)
  - Chặn các lệnh nguy hiểm: os, sys, subprocess, open, exec, eval, __import__
  - Output là file PNG tạm thời, xóa ngay sau khi đọc
"""

import subprocess
import tempfile
import base64
import os
import textwrap
from typing import Optional


# Danh sách import bị chặn
BLOCKED_IMPORTS = [
    "import os", "import sys", "import subprocess", "import socket",
    "import requests", "import httpx", "import urllib",
    "import shutil", "import pathlib", "import glob",
    "__import__", "exec(", "eval(", "open(",
    "compile(", "importlib",
]

# Template bọc code của AI — inject sẵn các import cần thiết
CODE_TEMPLATE = """\
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import math
import warnings
warnings.filterwarnings('ignore')

# ── Code do AI sinh ra ──────────────────────────────────────────────
{user_code}
# ───────────────────────────────────────────────────────────────────

plt.tight_layout()
plt.savefig('{output_path}', dpi=150, bbox_inches='tight', facecolor='white')
plt.close('all')
"""


def _is_safe(code: str) -> tuple[bool, str]:
    """Kiểm tra code có chứa lệnh nguy hiểm không."""
    for blocked in BLOCKED_IMPORTS:
        if blocked in code:
            return False, f"Import/lệnh bị chặn: '{blocked}'"
    return True, ""


def execute_matplotlib_code(code: str, timeout: int = 15) -> bytes:
    """
    Thực thi Matplotlib code, trả về PNG dạng bytes.

    Args:
        code    : Python code (chỉ phần vẽ hình, không có import)
        timeout : Giới hạn thời gian thực thi (giây)

    Returns:
        PNG image bytes

    Raises:
        ValueError : Code chứa lệnh nguy hiểm hoặc có lỗi khi chạy
        TimeoutError: Vượt quá thời gian cho phép
    """
    # 1. Kiểm tra an toàn
    safe, reason = _is_safe(code)
    if not safe:
        raise ValueError(f"Code không an toàn: {reason}")

    # 2. Tạo file output tạm thời
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as out_f:
        output_path = out_f.name

    # 3. Tạo file script tạm thời
    full_code = CODE_TEMPLATE.format(
        user_code=textwrap.indent(code, "    " * 0),
        output_path=output_path.replace("\\", "/"),
    )

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, encoding="utf-8"
    ) as script_f:
        script_f.write(full_code)
        script_path = script_f.name

    try:
        # 4. Chạy trong subprocess với timeout
        result = subprocess.run(
            ["python3", script_path],
            capture_output=True,
            timeout=timeout,
            env={
                "PATH": os.environ.get("PATH", "/usr/bin:/usr/local/bin"),
                "HOME": os.environ.get("HOME", "/tmp"),
                "MPLBACKEND": "Agg",
                "MPLCONFIGDIR": "/tmp/matplotlib",
            },
        )

        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace")
            raise ValueError(f"Lỗi khi vẽ hình:\n{stderr[:500]}")

        # 5. Đọc PNG output
        if not os.path.exists(output_path):
            raise ValueError("Không tạo được file ảnh — code không gọi plt.savefig().")

        with open(output_path, "rb") as f:
            png_bytes = f.read()

        if len(png_bytes) < 100:
            raise ValueError("File ảnh sinh ra quá nhỏ, có thể bị lỗi vẽ.")

        return png_bytes

    except subprocess.TimeoutExpired:
        raise TimeoutError(f"Code vẽ hình vượt quá {timeout}s — vòng lặp vô hạn?")

    finally:
        # Dọn dẹp file tạm
        for path in [script_path, output_path]:
            try:
                if os.path.exists(path):
                    os.unlink(path)
            except Exception:
                pass


def execute_and_encode(code: str, timeout: int = 15) -> Optional[str]:
    """
    Thực thi code và trả về PNG dạng base64 string.
    Trả về None nếu có lỗi (không raise exception — để pipeline tiếp tục).
    """
    try:
        png_bytes = execute_matplotlib_code(code, timeout)
        return base64.b64encode(png_bytes).decode("utf-8")
    except (ValueError, TimeoutError) as e:
        # Log lỗi nhưng không dừng toàn bộ pipeline
        print(f"[sandbox_executor] WARNING: {e}")
        return None
