from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from typing import List, Optional, Dict
from uuid import UUID
from pydantic import BaseModel
import uuid, os, json, base64
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user, get_current_teacher
from app.schemas.exams import Exam, ExamCreate, ExamUpdate, ExamList

router = APIRouter()

# ─── Prompt for AI exam analysis ────────────────────────────────────────────────

ANALYZE_SYSTEM_PROMPT = """Bạn là chuyên gia phân tích đề thi Việt Nam. Nhiệm vụ của bạn là đọc ảnh hoặc PDF đề thi và trích xuất TẤT CẢ câu hỏi thành JSON.

Với mỗi câu hỏi, trả về:
{
  "title": "Tiêu đề ngắn (ví dụ: 'Câu 1', hoặc tóm tắt nội dung)",
  "description": "Nội dung đầy đủ câu hỏi (giữ nguyên ký hiệu toán học, số liệu)",
  "problem_type": "multiple_choice" | "true_false" | "essay",
  "choices": {"A": "...", "B": "...", "C": "...", "D": "..."} hoặc null nếu không phải MCQ,
  "correct_answer": "A"/"B"/"C"/"D"/"true"/"false" hoặc null nếu essay hoặc không rõ,
  "difficulty": "easy" | "medium" | "hard",
  "category": "Đại số" | "Hình học" | "Số học" | "Giải tích" | "Tổ hợp" | "Vật lý" | "Hóa học" | "Sinh học" | "Lịch sử" | "Địa lý" | "Tiếng Anh" | "Văn học" | "Tổng hợp",
  "solution": "Lời giải/đáp án nếu có trong tài liệu, null nếu không có"
}

QUY TẮC ĐỊNH DẠNG (BẮT BUỘC):
- Công thức toán học: Sử dụng $...$ cho inline và $$...$$ cho block.
- Bảng số liệu: Sử dụng định dạng Markdown Table chuẩn. 
- HÌNH VẼ (figure_json): Nếu đề thi có hình vẽ minh họa, hãy trích xuất cấu trúc hình học cơ bản:
  {
    "viewBox": "0 0 400 300",
    "elements": [
      {"type": "point", "x": 100, "y": 100, "label": "A"},
      {"type": "line", "start": [100, 100], "end": [200, 100], "dashed": false}
    ]
  }
- Bảng biến thiên/Bảng phức tạp: Sử dụng môi trường LaTeX \\begin{array} ... \\end{array}.
- LUÔN để một dòng trống trước và sau các khối bảng/toán học.
- Trả về DUY NHẤT một mảng JSON hợp lệ. KHÔNG có text nào khác ngoài JSON.
- Giữ nguyên các ký tự đặc biệt."""


VARIANT_SYSTEM_PROMPT = """Bạn là chuyên gia biên soạn đề thi Toán Việt Nam. Với mỗi câu hỏi, thực hiện ĐÚNG 4 bước sau:

BƯỚC 1 — ĐỔI SỐ LIỆU:
- Giữ nguyên dạng bài, chỉ thay số liệu/tham số. Chọn số mới để kết quả ra "đẹp" (nguyên hoặc phân số đơn giản).

BƯỚC 2 — TỰ GIẢI ĐỂ TÌM ĐÁP ÁN ĐÚNG:
- Tính toán đầy đủ với số liệu mới. Ghi lời giải vào "solution".
- correct_answer PHẢI là kết quả tính được, không gán tùy tiện.

BƯỚC 3 — TẠO PHƯƠNG ÁN NHIỄU (chỉ MCQ):
- 3 phương án sai = kết quả của 3 lỗi tư duy phổ biến (sai dấu, nhầm công thức, sai bước trung gian).
- Phương án nhiễu phải KHÁC với correct_answer.

BƯỚC 4 — KIỂM TRA BẮT BUỘC trước khi output:
□ MCQ: Thử từng đáp án A,B,C,D — xác nhận CHỈ ĐÚNG MỘT. Nếu có 2 đáp án đúng → chọn lại số liệu khác.
□ Đúng/Sai: Mỗi mệnh đề phải có giá trị Đúng/Sai rõ ràng, không mơ hồ.
□ Nhất quán: Các dữ kiện trong câu không mâu thuẫn (điểm trên đồ thị, tọa độ, bảng số liệu).
□ TXĐ đúng: Hàm số/phương trình phải có miền xác định phù hợp với dữ kiện đã cho.
□ HÌNH VẼ: Nếu đề gốc có figure_json, hãy cập nhật tọa độ các điểm trong figure_json để khớp với dữ kiện mới trong câu hỏi.

ĐỊNH DẠNG OUTPUT — chỉ trả về mảng JSON, không kèm text nào khác:
[
  {
    "title": "Câu X",
    "description": "Nội dung câu hỏi. Dùng $...$ cho công thức inline, $$...$$ cho công thức riêng dòng. Bảng biến thiên/số liệu dùng Markdown table (| col |).",
    "problem_type": "multiple_choice | true_false | essay",
    "choices": {"A": "...", "B": "...", "C": "...", "D": "..."} hoặc null nếu không phải MCQ,
    "correct_answer": "A/B/C/D hoặc null",
    "difficulty": "easy | medium | hard",
    "category": "giữ nguyên category gốc",
    "solution": "Lời giải từng bước đầy đủ, dùng LaTeX cho công thức. Phải chứng minh tại sao correct_answer đúng VÀ tại sao các đáp án còn lại sai.",
    "figure_json": { "viewBox": "0 0 400 300", "elements": [...] }
  }
]"""


# ─── Schemas for create-from-questions ──────────────────────────────────────────

class ExtractedQuestion(BaseModel):
    title: str
    description: str
    problem_type: str = "multiple_choice"
    choices: Optional[Dict[str, str]] = None
    correct_answer: Optional[str] = None
    difficulty: str = "medium"
    category: str = "Tổng hợp"
    solution: Optional[str] = None
    figure_json: Optional[Dict] = None


class ExamFromQuestions(BaseModel):
    title: str
    description: Optional[str] = None
    duration: int = 60
    questions: List[ExtractedQuestion]


# ─── Helpers ─────────────────────────────────────────────────────────────────────

def _enrich_exams(exams_data: list) -> list:
    """Fetch exam_problems + problems for each exam and merge."""
    if not exams_data:
        return []
    result = []
    for exam in exams_data:
        enriched = dict(exam)
        try:
            ep_resp = (
                supabase_client.table("exam_problems")
                .select("*")
                .eq("exam_id", str(exam["id"]))
                .order("order_index")
                .execute()
            )
            ep_list = ep_resp.data or []
            problem_ids = [ep["problem_id"] for ep in ep_list if ep.get("problem_id")]
            problems_map: dict = {}
            if problem_ids:
                prob_resp = (
                    supabase_client.table("problems")
                    .select("*")
                    .in_("id", problem_ids)
                    .execute()
                )
                for p in prob_resp.data or []:
                    problems_map[p["id"]] = p
            for ep in ep_list:
                ep["problem"] = problems_map.get(str(ep.get("problem_id") or ""))
            enriched["problems"] = ep_list
        except Exception:
            enriched["problems"] = []
        result.append(enriched)
    return result


def _parse_json_from_llm(text: str) -> list:
    """Robustly parse JSON array from LLM response."""
    text = text.strip()
    # Strip markdown code fences
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("["):
                text = part
                break
    # Find outermost JSON array
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]
    return json.loads(text)


# ─── Routes ──────────────────────────────────────────────────────────────────────


@router.get("/health")
def health_check():
    return {"status": "ok", "module": "exams"}


@router.get("/pypdf-check")
def pypdf_check():
    """Kiểm tra pypdf có được cài trên server không."""
    try:
        import pypdf as _pypdf
        return {
            "pypdf_installed": True,
            "version": getattr(_pypdf, "__version__", "unknown"),
            "message": "✅ pypdf đã được cài đặt. PDF digital sẽ được đọc bằng pypdf."
        }
    except ImportError:
        return {
            "pypdf_installed": False,
            "version": None,
            "message": "❌ pypdf CHƯA được cài. Server đang dùng Claude Vision cho PDF."
        }


# NOTE: /analyze and /create-from-questions must be defined BEFORE /{exam_id}
# to prevent FastAPI routing them as UUID path params.

@router.post("/analyze")
def analyze_exam_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_teacher),
):
    """
    Upload a PDF or image of an exam.
    Claude Vision extracts all questions and returns them as structured JSON.
    Uses sync def (same pattern as grade_submission) to avoid uvloop/httpx
    APIConnectionError that occurs when using async def with Anthropic SDK.
    """
    # ── Validate file type ───────────────────────────────────────────────
    content_type = (file.content_type or "").lower()
    allowed = {
        "application/pdf": "application/pdf",
        "image/jpeg": "image/jpeg",
        "image/jpg": "image/jpeg",
        "image/png": "image/png",
        "image/webp": "image/webp",
    }
    media_type = allowed.get(content_type)
    if not media_type:
        raise HTTPException(
            status_code=400,
            detail="Chỉ hỗ trợ PDF, JPEG, PNG, WEBP. Vui lòng chọn đúng định dạng.",
        )

    # ── Read via sync interface (file.file is SpooledTemporaryFile) ──────
    raw = file.file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File quá lớn. Tối đa 10 MB.")

    # ── Encode & call Claude ─────────────────────────────────────────────
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="DEEPSEEK_API_KEY chưa được cấu hình.")

    try:
        import httpx
        import io as _io
        import re as _re

        # ── Chỉ hỗ trợ PDF có text layer (deepseek-chat là text-only) ─────
        if media_type != "application/pdf":
            raise HTTPException(
                status_code=400,
                detail=(
                    "DeepSeek chỉ hỗ trợ PDF có text layer, không phân tích được ảnh trực tiếp. "
                    "Vui lòng tải lên file PDF (xuất từ Word/Google Docs)."
                ),
            )

        # ── Trích xuất text: thử pypdf trước, fallback PyMuPDF ───────────
        extracted_text = ""

        # Bước 1: pypdf
        try:
            import pypdf as _pypdf
            reader = _pypdf.PdfReader(_io.BytesIO(raw))
            pages_text = []
            for page in reader.pages:
                t = page.extract_text() or ""
                if t.strip():
                    pages_text.append(t)
            extracted_text = "\n\n".join(pages_text).strip()
            print(f"[ANALYZE] pypdf: {len(reader.pages)} trang, {len(extracted_text)} ký tự", flush=True)
        except Exception as e:
            print(f"[ANALYZE] pypdf lỗi: {e}", flush=True)

        # Bước 2: nếu pypdf cho ít text → thử PyMuPDF (tốt hơn với font đặc biệt, MathType, v.v.)
        words = _re.findall(r'[a-zA-ZÀ-ỹ\d]{2,}', extracted_text)
        if len(words) < 20:
            print(f"[ANALYZE] pypdf kém ({len(words)} từ) → thử PyMuPDF...", flush=True)
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(stream=raw, filetype="pdf")
                pages_text = []
                for page in doc:
                    t = page.get_text("text") or ""
                    if t.strip():
                        pages_text.append(t)
                fitz_text = "\n\n".join(pages_text).strip()
                fitz_words = _re.findall(r'[a-zA-ZÀ-ỹ\d]{2,}', fitz_text)
                print(f"[ANALYZE] PyMuPDF: {len(doc)} trang, {len(fitz_text)} ký tự, {len(fitz_words)} từ", flush=True)
                if len(fitz_words) > len(words):
                    extracted_text = fitz_text
                    words = fitz_words
                doc.close()
            except ImportError:
                print("[ANALYZE] PyMuPDF chưa cài", flush=True)
            except Exception as e:
                print(f"[ANALYZE] PyMuPDF lỗi: {e}", flush=True)

        # Bước 3: PDF image-based → Gemini Vision (đọc cả hình vẽ, công thức)
        if len(words) < 20:
            print(f"[ANALYZE] PDF image-based ({len(words)} từ) → Gemini Vision...", flush=True)
            gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
            if not gemini_key:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "PDF này là file ảnh (không có text layer). "
                        "Cần cấu hình GEMINI_API_KEY trên Railway để đọc loại PDF này."
                    ),
                )
            try:
                import fitz
                import base64 as _b64

                doc = fitz.open(stream=raw, filetype="pdf")
                parts = []
                for page in doc:
                    mat = fitz.Matrix(2.0, 2.0)
                    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
                    img_bytes = pix.tobytes("png")
                    b64 = _b64.b64encode(img_bytes).decode()
                    parts.append({"inline_data": {"mime_type": "image/png", "data": b64}})
                doc.close()
                parts.append({
                    "text": (
                        "Đây là đề thi. Trích xuất TẤT CẢ câu hỏi và trả về mảng JSON theo định dạng đã yêu cầu. "
                        "Với câu hỏi có hình vẽ/biểu đồ/đồ thị, hãy mô tả chi tiết hình vẽ đó trong phần description "
                        "để học sinh có thể hiểu câu hỏi mà không cần nhìn hình gốc."
                    )
                })

                g_resp = httpx.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}",
                    json={
                        "system_instruction": {"parts": [{"text": ANALYZE_SYSTEM_PROMPT}]},
                        "contents": [{"parts": parts}],
                        "generationConfig": {
                            "maxOutputTokens": 8000, 
                            "temperature": 0.1,
                            "response_mime_type": "application/json"
                        },
                    },
                    timeout=180.0,
                )
                if not g_resp.is_success:
                    body = g_resp.text[:500]
                    print(f"[ANALYZE] ❌ Gemini {g_resp.status_code}: {body}", flush=True)
                    raise HTTPException(status_code=500, detail=f"Gemini API lỗi {g_resp.status_code}: {body}")

                raw_text = g_resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
                print(f"[ANALYZE] ✅ GEMINI VISION — {len(raw_text)} ký tự", flush=True)
                questions = _parse_json_from_llm(raw_text)

                normalised = []
                for i, q in enumerate(questions):
                    normalised.append({
                        "title": q.get("title") or f"Câu {i + 1}",
                        "description": q.get("description", ""),
                        "problem_type": q.get("problem_type", "essay"),
                        "choices": q.get("choices"),
                        "correct_answer": q.get("correct_answer"),
                        "difficulty": q.get("difficulty", "medium"),
                        "category": q.get("category", "Tổng hợp"),
                        "solution": q.get("solution"),
                    })
                return {"questions": normalised, "count": len(normalised)}

            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Gemini Vision lỗi: {type(e).__name__}: {str(e)}",
                )

        # ── PDF có text → DeepSeek ────────────────────────────────────────
        print(f"[ANALYZE] ✅ TEXT MODE — {len(words)} từ, {len(extracted_text)} ký tự", flush=True)

        # Giới hạn độ dài để tránh vượt token limit (~30k ký tự ≈ 10k tokens)
        if len(extracted_text) > 30000:
            extracted_text = extracted_text[:30000]
            print(f"[ANALYZE] ⚠️ Text bị cắt còn 30000 ký tự", flush=True)

        user_content = (
            "Đây là nội dung đề thi được trích xuất từ PDF:\n\n"
            + extracted_text
            + "\n\nHãy trích xuất tất cả câu hỏi và trả về mảng JSON theo định dạng đã yêu cầu."
        )

        # ── Call DeepSeek API ─────────────────────────────────────────────
        resp = httpx.post(
            "https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "max_tokens": 8000,
                "temperature": 0.1,
                "messages": [
                    {"role": "system", "content": ANALYZE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
            },
            timeout=300.0,
        )
        if not resp.is_success:
            body = resp.text[:500]
            print(f"[ANALYZE] ❌ DeepSeek {resp.status_code}: {body}", flush=True)
            raise HTTPException(status_code=500, detail=f"DeepSeek API lỗi {resp.status_code}: {body}")
        raw_text = resp.json()["choices"][0]["message"]["content"].strip()
        questions = _parse_json_from_llm(raw_text)

        # Normalise fields
        normalised = []
        for i, q in enumerate(questions):
            normalised.append({
                "title": q.get("title") or f"Câu {i + 1}",
                "description": q.get("description", ""),
                "problem_type": q.get("problem_type", "essay"),
                "choices": q.get("choices"),
                "correct_answer": q.get("correct_answer"),
                "difficulty": q.get("difficulty", "medium"),
                "category": q.get("category", "Tổng hợp"),
                "solution": q.get("solution"),
                "figure_json": q.get("figure_json"),
            })

        return {"questions": normalised, "count": len(normalised)}

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI trả về dữ liệu không hợp lệ. Vui lòng thử lại. ({str(e)})",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi phân tích đề thi: {type(e).__name__}: {str(e)}",
        )


@router.post("/create-from-questions", status_code=status.HTTP_201_CREATED)
def create_exam_from_questions(
    data: ExamFromQuestions,
    current_user=Depends(get_current_teacher),
):
    """
    Batch-create problems from extracted questions, then create an exam linking them all.
    Returns the newly created exam with enriched problems.
    """
    try:
        if not data.questions:
            raise HTTPException(status_code=400, detail="Cần ít nhất 1 câu hỏi.")

        # 1. Create each question as a Problem
        created_problem_ids = []
        for q in data.questions:
            prob_id = str(uuid.uuid4())
            prob_payload = {
                "id": prob_id,
                "title": q.title,
                "description": q.description,
                "difficulty": q.difficulty,
                "category": q.category,
                "problem_type": q.problem_type,
                "choices": q.choices,
                "correct_answer": q.correct_answer,
                "solution": q.solution,
                "figure_json": q.figure_json,
                "example_input": "",
                "example_output": "",
                "test_cases": [],
                "time_limit": 1000,
                "memory_limit": 256,
                "created_by": str(current_user.id),
            }
            resp = supabase_client.table("problems").insert(prob_payload).execute()
            if resp.data:
                created_problem_ids.append(prob_id)

        if not created_problem_ids:
            raise HTTPException(status_code=500, detail="Không thể tạo câu hỏi.")

        # 2. Create Exam
        exam_id = str(uuid.uuid4())
        exam_payload = {
            "id": exam_id,
            "title": data.title,
            "description": data.description,
            "duration": data.duration,
            "created_by": str(current_user.id),
        }
        exam_resp = supabase_client.table("exams").insert(exam_payload).execute()
        if not exam_resp.data:
            raise HTTPException(status_code=500, detail="Không thể tạo đề thi.")

        # 3. Link exam_problems
        exam_problems = [
            {"exam_id": exam_id, "problem_id": pid, "order_index": i}
            for i, pid in enumerate(created_problem_ids)
        ]
        supabase_client.table("exam_problems").insert(exam_problems).execute()

        # 4. Return enriched exam
        enriched = _enrich_exams([exam_resp.data[0]])
        return enriched[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo đề thi: {str(e)}")


@router.get("/", response_model=ExamList)
def get_exams(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """Get all exams with pagination"""
    try:
        count_response = supabase_client.table("exams").select("*", count="exact").execute()
        total = count_response.count if count_response.count is not None else len(count_response.data or [])

        response = (
            supabase_client.table("exams")
            .select("*")
            .range(skip, skip + limit - 1)
            .order("created_at", desc=True)
            .execute()
        )

        enriched = _enrich_exams(response.data or [])
        return {"exams": enriched, "total": total}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải danh sách đề thi: {str(e)}",
        )


@router.get("/{exam_id}", response_model=Exam)
def get_exam(exam_id: UUID, current_user=Depends(get_current_user)):
    """Get a specific exam with its problems"""
    try:
        response = (
            supabase_client.table("exams")
            .select("*")
            .eq("id", str(exam_id))
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy đề thi này.",
            )

        enriched = _enrich_exams([response.data[0]])
        return enriched[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải đề thi: {str(e)}",
        )


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=Exam)
def create_exam(
    exam_in: ExamCreate,
    current_user=Depends(get_current_teacher),
):
    """Create a new exam (teacher only)"""
    try:
        exam_id = str(uuid.uuid4())
        exam_data = {
            "id": exam_id,
            "title": exam_in.title,
            "description": exam_in.description,
            "duration": exam_in.duration,
            "created_by": str(current_user.id),
        }

        exam_response = supabase_client.table("exams").insert(exam_data).execute()
        if not exam_response.data:
            raise HTTPException(status_code=400, detail="Lỗi khi tạo đề thi")

        if exam_in.problem_ids:
            exam_problems = [
                {"exam_id": exam_id, "problem_id": str(prob_id), "order_index": idx}
                for idx, prob_id in enumerate(exam_in.problem_ids)
            ]
            supabase_client.table("exam_problems").insert(exam_problems).execute()

        enriched = _enrich_exams([exam_response.data[0]])
        return enriched[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo đề thi: {str(e)}",
        )

@router.post("/{exam_id}/generate-variants")
def generate_exam_variant(
    exam_id: UUID,
    current_user=Depends(get_current_teacher),
):
    """
    Generate a new exam variant using AI based on an existing exam.
    """
    # 1. Fetch original exam with problems
    resp = supabase_client.table("exams").select("*").eq("id", str(exam_id)).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy đề thi gốc.")
    
    original_exam = _enrich_exams([resp.data[0]])[0]
    problems = original_exam.get("problems", [])
    if not problems:
        raise HTTPException(status_code=400, detail="Đề thi này chưa có câu hỏi nào để tạo biến thể.")

    # 2. Prepare questions for AI
    source_questions = []
    for ep in problems:
        p = ep.get("problem")
        if p:
            source_questions.append({
                "title": p.get("title"),
                "description": p.get("description"),
                "problem_type": p.get("problem_type"),
                "choices": p.get("choices"),
                "correct_answer": p.get("correct_answer"),
                "difficulty": p.get("difficulty"),
                "category": p.get("category"),
            })

    # 3. Call DeepSeek AI — chia batch 5 câu để tránh bị cắt JSON
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Chưa cấu hình DEEPSEEK_API_KEY.")

    def _call_variant_batch(batch: list, batch_idx: int) -> list:
        """Gọi DeepSeek cho 1 batch câu hỏi, trả về list variants."""
        import httpx as _httpx
        print(f"[VARIANT] Batch {batch_idx}: {len(batch)} câu...", flush=True)
        r = _httpx.post(
            "https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": VARIANT_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Tạo biến thể cho {len(batch)} câu hỏi sau:\n\n{json.dumps(batch, ensure_ascii=False)}"},
                ],
                "temperature": 0.7,
                "max_tokens": 8000,
            },
            timeout=300.0,
        )
        r.raise_for_status()
        choice = r.json()["choices"][0]
        if choice.get("finish_reason") == "length":
            # Bị cắt → thử lại với từng câu riêng lẻ
            print(f"[VARIANT] Batch {batch_idx} bị cắt → retry từng câu", flush=True)
            results = []
            for single in batch:
                rs = _httpx.post(
                    "https://api.deepseek.com/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": VARIANT_SYSTEM_PROMPT},
                            {"role": "user", "content": f"Tạo biến thể cho 1 câu hỏi sau:\n\n{json.dumps([single], ensure_ascii=False)}"},
                        ],
                        "temperature": 0.7,
                        "max_tokens": 4000,
                    },
                    timeout=120.0,
                )
                rs.raise_for_status()
                parsed = _parse_json_from_llm(rs.json()["choices"][0]["message"]["content"])
                results.extend(parsed)
            return results
        raw = choice["message"]["content"]
        return _parse_json_from_llm(raw)

    try:
        BATCH_SIZE = 5
        new_questions_data = []
        for i in range(0, len(source_questions), BATCH_SIZE):
            batch = source_questions[i:i + BATCH_SIZE]
            variants = _call_variant_batch(batch, i // BATCH_SIZE + 1)
            new_questions_data.extend(variants)
        print(f"[VARIANT] ✅ Tổng {len(new_questions_data)} câu biến thể", flush=True)


        # 4. Create the new variant exam
        new_exam_data = ExamFromQuestions(
            title=f"[Biến thể AI] {original_exam['title']}",
            description=f"Đề thi biến thể được tạo tự động từ đề: {original_exam['title']}",
            duration=original_exam.get("duration", 60),
            questions=[ExtractedQuestion(**q) for q in new_questions_data]
        )

        return create_exam_from_questions(new_exam_data, current_user)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo biến thể AI: {str(e)}")



@router.delete("/{exam_id}")
def delete_exam(
    exam_id: UUID,
    current_user=Depends(get_current_teacher),
):
    """Delete an exam (teacher only, must be creator)"""
    try:
        check = supabase_client.table("exams").select("created_by").eq("id", str(exam_id)).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy đề thi")
        if check.data[0]["created_by"] != str(current_user.id):
            raise HTTPException(status_code=403, detail="Bạn không có quyền xóa đề thi này")

        supabase_client.table("exams").delete().eq("id", str(exam_id)).execute()
        return {"message": "Đã xóa đề thi thành công"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa đề thi: {str(e)}")
