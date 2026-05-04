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

QUY TẮC:
- Trả về DUY NHẤT một mảng JSON hợp lệ, KHÔNG có text nào khác
- Mỗi câu hỏi là một object trong mảng
- Nếu MCQ có 4 lựa chọn → problem_type = "multiple_choice"
- Nếu Đúng/Sai → problem_type = "true_false"
- Còn lại → problem_type = "essay"
- Giữ nguyên ký tự đặc biệt, công thức toán học trong description
- Nếu không nhận diện được câu hỏi nào → trả về []"""


VARIANT_SYSTEM_PROMPT = """Bạn là một chuyên gia khảo thí và biên soạn đề thi dày dặn kinh nghiệm. Nhiệm vụ của bạn là tạo ra một bộ đề thi 'Biến thể' (Variant) từ bộ đề gốc, đảm bảo tính tương đương về độ khó nhưng hoàn toàn mới về dữ liệu.

YÊU CẦU CHI TRUYÊN SÂU:
1. PHÂN TÍCH LOGIC: Trước khi tạo câu hỏi mới, hãy phân tích xem câu hỏi gốc đang kiểm tra kiến thức/kỹ năng gì (Ví dụ: tính chất tam giác, đạo hàm, đọc hiểu ngụ ý...). Câu hỏi mới PHẢI kiểm tra đúng kỹ năng đó.
2. BIẾN ĐỔI DỮ KIỆN (DATA SHIFT):
   - Toán/Khoa học: Thay đổi các con số. Quan trọng: Hãy giải nhẩm trước để đảm bảo con số mới dẫn đến kết quả 'đẹp' hoặc hợp lý (tránh kết quả quá lẻ trừ khi đề yêu cầu).
   - Ngôn ngữ/Xã hội: Thay đổi bối cảnh, tên nhân vật, địa danh hoặc ngữ liệu văn học tương đương về phong cách và độ khó.
3. XÂY DỰNG PHƯƠNG ÁN NHIỄU (SMART DISTRACTORS):
   - Không lấy số ngẫu nhiên cho các phương án sai.
   - Các phương án sai PHẢI là kết quả của các lỗi tư duy phổ biến (Ví dụ: tính sai dấu, quên chia 2, nhầm công thức). Điều này giúp phân loại học sinh tốt hơn.
4. GIỮ NGUYÊN CẤU TRÚC: Giữ nguyên loại câu hỏi (MCQ, True/False, Essay) và thứ tự.

ĐỊNH DẠNG JSON MỖI CÂU HỎI:
{
  "title": "Câu X (hoặc tiêu đề ngắn gọn)",
  "description": "Nội dung câu hỏi mới (sử dụng LaTeX $...$ cho công thức)",
  "problem_type": "giữ nguyên loại gốc",
  "choices": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "correct_answer": "đáp án đúng mới",
  "difficulty": "giữ nguyên độ khó",
  "category": "giữ nguyên chủ đề",
  "solution": "Lời giải chi tiết từng bước (giúp học sinh hiểu tại sao đáp án đó đúng)"
}

QUY TẮC: Trả về DUY NHẤT một mảng JSON hợp lệ, KHÔNG có text nào khác."""


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

        # Bước 3: nếu vẫn ít text → PDF là image-based → OCR bằng Tesseract
        if len(words) < 20:
            print(f"[ANALYZE] PyMuPDF cũng kém ({len(words)} từ) → thử OCR (Tesseract)...", flush=True)
            try:
                import fitz
                import pytesseract
                from PIL import Image as _PIL_Image

                doc = fitz.open(stream=raw, filetype="pdf")
                ocr_pages = []
                for page in doc:
                    # Render ở 2x resolution cho OCR chính xác hơn
                    mat = fitz.Matrix(2.0, 2.0)
                    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
                    img_bytes = pix.tobytes("png")
                    img = _PIL_Image.open(_io.BytesIO(img_bytes))
                    ocr_text = pytesseract.image_to_string(img, lang="vie+eng", config="--psm 3")
                    if ocr_text.strip():
                        ocr_pages.append(ocr_text)
                doc.close()

                ocr_full = "\n\n".join(ocr_pages).strip()
                ocr_words = _re.findall(r'[a-zA-ZÀ-ỹ\d]{2,}', ocr_full)
                print(f"[ANALYZE] OCR: {len(ocr_words)} từ, {len(ocr_full)} ký tự", flush=True)
                if len(ocr_words) > len(words):
                    extracted_text = ocr_full
                    words = ocr_words
            except ImportError as ie:
                print(f"[ANALYZE] Tesseract/pytesseract chưa cài: {ie}", flush=True)
            except Exception as e:
                print(f"[ANALYZE] OCR lỗi: {e}", flush=True)

        if len(extracted_text) < 100 or len(words) < 20:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Không đọc được text từ PDF này (đọc được {len(words)} từ). "
                    f"Vui lòng đảm bảo PDF có text layer (xuất từ Word/Google Docs), "
                    f"hoặc nếu là file scan thì cần đảm bảo Tesseract OCR đã được cài trên server."
                ),
            )

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

    # 3. Call DeepSeek AI
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Chưa cấu hình DEEPSEEK_API_KEY.")

    try:
        import httpx
        print("[VARIANT] Using DeepSeek...", flush=True)
        resp = httpx.post(
            "https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": VARIANT_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Hãy tạo biến thể cho bộ đề sau đây:\n\n{json.dumps(source_questions, ensure_ascii=False)}"},
                ],
                "temperature": 0.7,
                "max_tokens": 8000,
            },
            timeout=300.0,
        )
        resp.raise_for_status()
        raw_text = resp.json()["choices"][0]["message"]["content"]
        new_questions_data = _parse_json_from_llm(raw_text)


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
