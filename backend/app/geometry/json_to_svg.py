"""
json_to_svg.py — Convert figure_json to SVG string.

Supported figure types:
  - "geometry"       : 2D geometric shapes (points, segments, circles, arcs, etc.)
  - "function_graph" : Coordinate axes + function curves + special points
  - "graph"          : Weighted/directed graph (vertices + edges)

JSON schema (geometry):
{
  "type": "geometry",
  "points": {
    "A": {"x": 0, "y": 0, "label": "A", "label_pos": "bottom-left"}
  },
  "elements": [
    {"type": "segment",     "from": "A", "to": "B", "label": "3cm"},
    {"type": "circle",      "center": "O", "radius": 2},
    {"type": "arc",         "center": "O", "from": "A", "to": "B", "label": "60°"},
    {"type": "right_angle", "at": "A", "leg1": "B", "leg2": "C"},
    {"type": "vector",      "from": "O", "to": "A", "label": "→a"},
    {"type": "polygon",     "vertices": ["A","B","C"], "fill": "none"},
    {"type": "dashed",      "from": "A", "to": "B"}
  ]
}

JSON schema (function_graph):
{
  "type": "function_graph",
  "x_range": [-3, 3],
  "y_range": [-4, 5],
  "functions": [
    {"expr": "x**3 - 3*x", "label": "y=f(x)", "color": "#2563eb"}
  ],
  "special_points": [
    {"x": -1, "y": 2, "label": "(-1;2)", "kind": "max"},
    {"x": 1,  "y": -2, "label": "(1;-2)", "kind": "min"}
  ],
  "asymptotes": [
    {"axis": "x", "value": -2, "label": "x=-2"},
    {"axis": "y", "value": 3,  "label": "y=3"}
  ]
}

JSON schema (graph):
{
  "type": "graph",
  "directed": false,
  "vertices": [
    {"id": "A", "x": 0,   "y": 2},
    {"id": "B", "x": 1.9, "y": 0.6}
  ],
  "edges": [
    {"from": "A", "to": "B", "weight": 9}
  ]
}
"""

import json
import math
from typing import Union

# ── SVG canvas constants ──────────────────────────────────────────────────────

W = 380
H = 300
PAD = 45
FONT = "STIX Two Math, Latin Modern Math, Times New Roman, serif"
FS = 13          # base font size
FS_LABEL = 12   # label font size
FS_SMALL = 11   # small annotation font size
STROKE = "#1e293b"
STROKE_W = 1.6
STROKE_DASH = "#64748b"
BLUE = "#2563eb"
RED  = "#dc2626"


# ── Public API ────────────────────────────────────────────────────────────────

def json_to_svg(figure_json: Union[dict, str, None]) -> str:
    """Convert figure_json to an SVG string. Returns empty string on failure."""
    if not figure_json:
        return ""
    try:
        if isinstance(figure_json, str):
            figure_json = json.loads(figure_json)
        fig_type = figure_json.get("type", "geometry")
        if fig_type == "geometry":
            return _render_geometry(figure_json)
        elif fig_type == "function_graph":
            return _render_function_graph(figure_json)
        elif fig_type == "graph":
            return _render_weighted_graph(figure_json)
        return ""
    except Exception as e:
        print(f"[json_to_svg] error: {e}", flush=True)
        return ""


# ── Coordinate transform ──────────────────────────────────────────────────────

class _CT:
    """Math→SVG coordinate transform with uniform scaling and centering."""

    def __init__(self, xs, ys, pad=PAD, w=W, h=H):
        if not xs or not ys:
            self.scale = 1.0
            self.ox, self.oy = pad, h - pad
            return
        mnx, mxx = min(xs), max(xs)
        mny, mxy = min(ys), max(ys)
        rx = mxx - mnx or 1.0
        ry = mxy - mny or 1.0
        avw = w - 2 * pad
        avh = h - 2 * pad
        s = min(avw / rx, avh / ry)
        self.scale = s
        aw, ah = rx * s, ry * s
        self.ox = pad + (avw - aw) / 2 - mnx * s
        self.oy = (h - pad) - (avh - ah) / 2 + mny * s

    def x(self, mx):  return self.ox + mx * self.scale
    def y(self, my):  return self.oy - my * self.scale   # flip y-axis


# ── SVG helpers ───────────────────────────────────────────────────────────────

def _svg_wrap(inner: str, w=W, h=H) -> str:
    defs = (
        '<defs>'
        '<marker id="ah" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">'
        f'<polygon points="0 0, 10 3.5, 0 7" fill="{STROKE}"/>'
        '</marker>'
        '<marker id="ah_ax" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">'
        f'<polygon points="0 0, 8 3, 0 6" fill="{STROKE}"/>'
        '</marker>'
        '</defs>'
    )
    return (
        f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
        f'xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto">'
        f'{defs}{inner}</svg>'
    )


def _text(x, y, content, anchor="middle", baseline="middle",
          size=FS_LABEL, italic=False, color=STROKE, bold=False):
    style_parts = [f"font-size:{size}px", f"font-family:{FONT}"]
    if italic:    style_parts.append("font-style:italic")
    if bold:      style_parts.append("font-weight:700")
    style = ";".join(style_parts)
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" '
        f'dominant-baseline="{baseline}" fill="{color}" style="{style}">'
        f'{_esc(content)}</text>'
    )


def _esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _label_pos(px, py, pos, off=14):
    """Compute label (x,y) from anchor position string."""
    d = off * 0.72
    m = {
        "top":          (px,     py - off),
        "bottom":       (px,     py + off),
        "left":         (px - off, py),
        "right":        (px + off, py),
        "top-left":     (px - d,  py - d),
        "top-right":    (px + d,  py - d),
        "bottom-left":  (px - d,  py + d),
        "bottom-right": (px + d,  py + d),
    }
    return m.get(pos, (px, py - off))


def _seg_label(x1, y1, x2, y2, label, off=12):
    """Perpendicular label for a segment."""
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    dx, dy = x2 - x1, y2 - y1
    ln = math.hypot(dx, dy) or 1
    nx, ny = -dy / ln * off, dx / ln * off
    return _text(mx + nx, my + ny, label)


def _right_angle_mark(ax, ay, x1, y1, x2, y2, size=10):
    """Draw a right-angle square at (ax,ay) toward (x1,y1) and (x2,y2)."""
    def unit(sx, sy, ex, ey):
        d = math.hypot(ex - sx, ey - sy) or 1
        return (ex - sx) / d, (ey - sy) / d
    ux1, uy1 = unit(ax, ay, x1, y1)
    ux2, uy2 = unit(ax, ay, x2, y2)
    p1x, p1y = ax + ux1 * size, ay + uy1 * size
    p2x, p2y = ax + ux2 * size, ay + uy2 * size
    cx,  cy   = p1x + ux2 * size, p1y + uy2 * size
    return (
        f'<path d="M {p1x:.1f},{p1y:.1f} L {cx:.1f},{cy:.1f} L {p2x:.1f},{p2y:.1f}" '
        f'stroke="{STROKE}" stroke-width="{STROKE_W}" fill="none"/>'
    )


# ── Geometry renderer ─────────────────────────────────────────────────────────

def _render_geometry(fig: dict) -> str:
    raw_pts  = fig.get("points", {})
    elements = fig.get("elements", [])

    # ── Collect all coordinate hints (include circle extents) ────────────────
    xs, ys = [], []
    for p in raw_pts.values():
        xs.append(p["x"]); ys.append(p["y"])
    for el in elements:
        if el.get("type") == "circle":
            c = raw_pts.get(el.get("center"))
            r = el.get("radius", 1)
            if c:
                xs += [c["x"] - r, c["x"] + r]
                ys += [c["y"] - r, c["y"] + r]

    if not xs:
        return _svg_wrap("", W, 60)   # empty figure

    ct = _CT(xs, ys)
    out = []

    # ── Draw elements ─────────────────────────────────────────────────────────
    for el in elements:
        t = el.get("type", "")

        if t in ("segment", "dashed"):
            p1 = raw_pts.get(el.get("from"))
            p2 = raw_pts.get(el.get("to"))
            if not (p1 and p2): continue
            x1, y1 = ct.x(p1["x"]), ct.y(p1["y"])
            x2, y2 = ct.x(p2["x"]), ct.y(p2["y"])
            dash = ' stroke-dasharray="6,4"' if t == "dashed" else ""
            color = STROKE_DASH if t == "dashed" else STROKE
            out.append(
                f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                f'stroke="{color}" stroke-width="{STROKE_W}"{dash}/>'
            )
            if el.get("label"):
                out.append(_seg_label(x1, y1, x2, y2, el["label"]))

        elif t == "vector":
            p1 = raw_pts.get(el.get("from"))
            p2 = raw_pts.get(el.get("to"))
            if not (p1 and p2): continue
            x1, y1 = ct.x(p1["x"]), ct.y(p1["y"])
            x2, y2 = ct.x(p2["x"]), ct.y(p2["y"])
            out.append(
                f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                f'stroke="{STROKE}" stroke-width="{STROKE_W}" marker-end="url(#ah)"/>'
            )
            if el.get("label"):
                out.append(_seg_label(x1, y1, x2, y2, el["label"]))

        elif t == "circle":
            c = raw_pts.get(el.get("center"))
            r = el.get("radius", 1)
            if not c: continue
            cx, cy = ct.x(c["x"]), ct.y(c["y"])
            sr = r * ct.scale
            out.append(
                f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{sr:.1f}" '
                f'stroke="{STROKE}" stroke-width="{STROKE_W}" fill="none"/>'
            )

        elif t == "arc":
            c  = raw_pts.get(el.get("center"))
            pf = raw_pts.get(el.get("from"))
            pt = raw_pts.get(el.get("to"))
            if not (c and pf and pt): continue
            cx, cy = ct.x(c["x"]), ct.y(c["y"])
            ax1, ay1 = ct.x(pf["x"]), ct.y(pf["y"])
            ax2, ay2 = ct.x(pt["x"]), ct.y(pt["y"])
            r = math.hypot(ax1 - cx, ay1 - cy)
            large = el.get("large_arc", 0)
            sweep = el.get("sweep", 1)
            out.append(
                f'<path d="M {ax1:.1f},{ay1:.1f} A {r:.1f},{r:.1f} 0 {large},{sweep} {ax2:.1f},{ay2:.1f}" '
                f'stroke="{STROKE}" stroke-width="{STROKE_W}" fill="none"/>'
            )
            if el.get("label"):
                a1 = math.atan2(ay1 - cy, ax1 - cx)
                a2 = math.atan2(ay2 - cy, ax2 - cx)
                am = (a1 + a2) / 2
                lx = cx + (r + 16) * math.cos(am)
                ly = cy + (r + 16) * math.sin(am)
                out.append(_text(lx, ly, el["label"], size=FS_SMALL))

        elif t == "right_angle":
            at = raw_pts.get(el.get("at"))
            l1 = raw_pts.get(el.get("leg1") or el.get("from"))
            l2 = raw_pts.get(el.get("leg2") or el.get("to"))
            if not (at and l1 and l2): continue
            ax, ay = ct.x(at["x"]), ct.y(at["y"])
            out.append(_right_angle_mark(
                ax, ay,
                ct.x(l1["x"]), ct.y(l1["y"]),
                ct.x(l2["x"]), ct.y(l2["y"])
            ))

        elif t == "polygon":
            vids = el.get("vertices", [])
            pts  = [raw_pts[v] for v in vids if v in raw_pts]
            if len(pts) < 2: continue
            pts_str = " ".join(f"{ct.x(p['x']):.1f},{ct.y(p['y']):.1f}" for p in pts)
            fill  = el.get("fill", "none")
            color = el.get("color", STROKE)
            out.append(
                f'<polygon points="{pts_str}" stroke="{color}" '
                f'stroke-width="{STROKE_W}" fill="{fill}"/>'
            )

        elif t == "label":
            # Freestanding label (e.g. angle label not attached to a point)
            x = el.get("x")
            y = el.get("y")
            if x is not None and y is not None:
                out.append(_text(ct.x(x), ct.y(y), el.get("text", "")))

    # ── Draw points & labels on top ───────────────────────────────────────────
    for pid, p in raw_pts.items():
        px, py = ct.x(p["x"]), ct.y(p["y"])
        out.append(
            f'<circle cx="{px:.1f}" cy="{py:.1f}" r="3" '
            f'fill="{STROKE}" stroke="white" stroke-width="1"/>'
        )
        lbl  = p.get("label", pid)
        lpos = p.get("label_pos", "top")
        lx, ly = _label_pos(px, py, lpos)
        out.append(_text(lx, ly, lbl, italic=True))

    return _svg_wrap("".join(out))


# ── Function graph renderer ───────────────────────────────────────────────────

def _render_function_graph(fig: dict) -> str:
    xr   = fig.get("x_range", [-3, 3])
    yr   = fig.get("y_range", [-4, 5])
    funcs = fig.get("functions", [])
    spts  = fig.get("special_points", [])
    asyms = fig.get("asymptotes", [])

    w, h, pad = W, H, PAD
    ct = _CT(xr + yr, yr + xr, pad=pad, w=w, h=h)
    out = []

    # ── Grid lines (light) ────────────────────────────────────────────────────
    for gx in range(math.ceil(xr[0]), math.floor(xr[1]) + 1):
        sx = ct.x(gx); sy0 = ct.y(yr[0]); sy1 = ct.y(yr[1])
        if xr[0] < gx < xr[1]:
            out.append(f'<line x1="{sx:.1f}" y1="{sy0:.1f}" x2="{sx:.1f}" y2="{sy1:.1f}" stroke="#e2e8f0" stroke-width="1"/>')
    for gy in range(math.ceil(yr[0]), math.floor(yr[1]) + 1):
        sy = ct.y(gy); sx0 = ct.x(xr[0]); sx1 = ct.x(xr[1])
        if yr[0] < gy < yr[1]:
            out.append(f'<line x1="{sx0:.1f}" y1="{sy:.1f}" x2="{sx1:.1f}" y2="{sy:.1f}" stroke="#e2e8f0" stroke-width="1"/>')

    # ── Axes ──────────────────────────────────────────────────────────────────
    ox, oy = ct.x(0), ct.y(0)
    ax0, ax1 = ct.x(xr[0]), ct.x(xr[1])
    ay0, ay1 = ct.y(yr[0]), ct.y(yr[1])
    # x-axis
    out.append(
        f'<line x1="{ax0:.1f}" y1="{oy:.1f}" x2="{ax1:.1f}" y2="{oy:.1f}" '
        f'stroke="{STROKE}" stroke-width="1.5" marker-end="url(#ah_ax)"/>'
    )
    out.append(_text(ax1 + 12, oy, "x", size=FS_LABEL, italic=True))
    # y-axis
    out.append(
        f'<line x1="{ox:.1f}" y1="{ay0:.1f}" x2="{ox:.1f}" y2="{ay1:.1f}" '
        f'stroke="{STROKE}" stroke-width="1.5" marker-end="url(#ah_ax)"/>'
    )
    out.append(_text(ox, ay1 - 12, "y", size=FS_LABEL, italic=True))
    out.append(_text(ox - 12, oy + 12, "O", size=FS_SMALL))

    # Axis tick labels
    for gx in range(math.ceil(xr[0]), math.floor(xr[1]) + 1):
        if gx == 0: continue
        sx = ct.x(gx)
        out.append(f'<line x1="{sx:.1f}" y1="{oy-3:.1f}" x2="{sx:.1f}" y2="{oy+3:.1f}" stroke="{STROKE}" stroke-width="1"/>')
        out.append(_text(sx, oy + 14, str(gx), size=10))
    for gy in range(math.ceil(yr[0]), math.floor(yr[1]) + 1):
        if gy == 0: continue
        sy = ct.y(gy)
        out.append(f'<line x1="{ox-3:.1f}" y1="{sy:.1f}" x2="{ox+3:.1f}" y2="{sy:.1f}" stroke="{STROKE}" stroke-width="1"/>')
        out.append(_text(ox - 14, sy, str(gy), size=10))

    # ── Asymptotes ────────────────────────────────────────────────────────────
    for asym in asyms:
        if asym.get("axis") == "x":
            v = asym["value"]
            if xr[0] < v < xr[1]:
                sx = ct.x(v)
                out.append(
                    f'<line x1="{sx:.1f}" y1="{ay0:.1f}" x2="{sx:.1f}" y2="{ay1:.1f}" '
                    f'stroke="{RED}" stroke-width="1" stroke-dasharray="6,3"/>'
                )
                if asym.get("label"):
                    out.append(_text(sx + 6, ay1 + 10, asym["label"], anchor="start", size=FS_SMALL, color=RED))
        elif asym.get("axis") == "y":
            v = asym["value"]
            if yr[0] < v < yr[1]:
                sy = ct.y(v)
                out.append(
                    f'<line x1="{ax0:.1f}" y1="{sy:.1f}" x2="{ax1:.1f}" y2="{sy:.1f}" '
                    f'stroke="{RED}" stroke-width="1" stroke-dasharray="6,3"/>'
                )
                if asym.get("label"):
                    out.append(_text(ax1 + 4, sy, asym["label"], anchor="start", size=FS_SMALL, color=RED))

    # ── Function curves ───────────────────────────────────────────────────────
    COLORS = [BLUE, RED, "#16a34a", "#d97706"]
    safe_math = {
        "sin": math.sin, "cos": math.cos, "tan": math.tan,
        "exp": math.exp, "log": math.log, "sqrt": math.sqrt,
        "abs": abs, "pi": math.pi, "e": math.e,
    }
    for fi, fn in enumerate(funcs):
        expr  = fn.get("expr", "")
        color = fn.get("color") or COLORS[fi % len(COLORS)]
        N     = 300
        pts_svg = []
        for i in range(N + 1):
            mx = xr[0] + (xr[1] - xr[0]) * i / N
            try:
                my = eval(expr, {"__builtins__": {}}, {**safe_math, "x": mx})  # noqa: S307
                if not math.isfinite(my): raise ValueError
                if yr[0] - 1 <= my <= yr[1] + 1:
                    pts_svg.append((ct.x(mx), ct.y(my)))
                else:
                    pts_svg.append(None)
            except Exception:
                pts_svg.append(None)

        # Build path (split on None = discontinuity)
        path = ""
        for pt in pts_svg:
            if pt is None:
                path += " "
            elif path == "" or path.endswith(" "):
                path += f"M {pt[0]:.1f},{pt[1]:.1f}"
            else:
                path += f" L {pt[0]:.1f},{pt[1]:.1f}"
        if path.strip():
            out.append(
                f'<path d="{path.strip()}" stroke="{color}" stroke-width="2" '
                f'fill="none" stroke-linejoin="round" stroke-linecap="round"/>'
            )
        # Function label at right end
        if fn.get("label") and pts_svg and pts_svg[-1]:
            lx, ly = pts_svg[-1]
            out.append(_text(lx + 6, ly, fn["label"], anchor="start", size=FS_SMALL, color=color))

    # ── Special points (max, min, intercepts) ────────────────────────────────
    for sp in spts:
        sx, sy = ct.x(sp["x"]), ct.y(sp["y"])
        kind = sp.get("kind", "")
        color = RED if kind in ("max", "min") else STROKE
        out.append(
            f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="4" '
            f'fill="{color}" stroke="white" stroke-width="1.5"/>'
        )
        # Dashed drop lines to axes
        out.append(
            f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{sx:.1f}" y2="{oy:.1f}" '
            f'stroke="{color}" stroke-width="1" stroke-dasharray="4,3"/>'
        )
        out.append(
            f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{ox:.1f}" y2="{sy:.1f}" '
            f'stroke="{color}" stroke-width="1" stroke-dasharray="4,3"/>'
        )
        if sp.get("label"):
            lx = sx + 8 if sp["x"] >= 0 else sx - 8
            anchor = "start" if sp["x"] >= 0 else "end"
            out.append(_text(lx, sy - 10, sp["label"], anchor=anchor, size=FS_SMALL))

    return _svg_wrap("".join(out), W, H)


# ── Weighted graph renderer ───────────────────────────────────────────────────

def _render_weighted_graph(fig: dict) -> str:
    vertices = {v["id"]: v for v in fig.get("vertices", [])}
    edges    = fig.get("edges", [])
    directed = fig.get("directed", False)

    if not vertices:
        return _svg_wrap("", W, 80)

    xs = [v["x"] for v in vertices.values()]
    ys = [v["y"] for v in vertices.values()]
    ct = _CT(xs, ys, pad=PAD + 10)
    out = []

    # ── Edges ─────────────────────────────────────────────────────────────────
    for e in edges:
        p1 = vertices.get(e.get("from"))
        p2 = vertices.get(e.get("to"))
        if not (p1 and p2): continue
        x1, y1 = ct.x(p1["x"]), ct.y(p1["y"])
        x2, y2 = ct.x(p2["x"]), ct.y(p2["y"])
        marker = ' marker-end="url(#ah)"' if directed else ""
        out.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{STROKE}" stroke-width="{STROKE_W}"{marker}/>'
        )
        if e.get("weight") is not None:
            # Draw weight in a small white bubble at midpoint
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            out.append(
                f'<rect x="{mx-10:.1f}" y="{my-8:.1f}" width="20" height="16" '
                f'rx="3" fill="white" stroke="#cbd5e1" stroke-width="1"/>'
            )
            out.append(_text(mx, my, str(e["weight"]), size=FS_SMALL))

    # ── Vertices ──────────────────────────────────────────────────────────────
    for vid, v in vertices.items():
        vx, vy = ct.x(v["x"]), ct.y(v["y"])
        out.append(
            f'<circle cx="{vx:.1f}" cy="{vy:.1f}" r="14" '
            f'fill="white" stroke="{STROKE}" stroke-width="{STROKE_W}"/>'
        )
        out.append(_text(vx, vy, vid, bold=True))

    return _svg_wrap("".join(out))
