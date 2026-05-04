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
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY chưa được cấu hình.")

    try:
        import urllib.request as _urllib_req

        encoded = base64.standard_b64encode(raw).decode("utf-8")

        # Build content block depending on type
        if media_type == "application/pdf":
            file_block = {
                "type": "document",
                "source": {
                    "type": "base64",
                    "media_type": "application/pdf",
                    "data": encoded,
                },
            }
        else:
            file_block = {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": encoded,
                },
            }

        # Use stdlib urllib (no httpx/asyncio) to avoid Railway connection issues.
        payload_bytes = json.dumps({
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 8000,
            "system": ANALYZE_SYSTEM_PROMPT,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        file_block,
                        {
                            "type": "text",
                            "text": "Hãy trích xuất tất cả câu hỏi trong tài liệu này và trả về mảng JSON theo định dạng đã yêu cầu.",
                        },
                    ],
                }
            ],
        }).encode("utf-8")

        _req = _urllib_req.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload_bytes,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
                "anthropic-beta": "pdfs-2024-09-25",
            },
            method="POST",
        )
        with _urllib_req.urlopen(_req, timeout=300) as _resp:
            _result = json.loads(_resp.read().decode("utf-8"))

        raw_text = _result["content"][0]["text"]
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
        import urllib.error as _urllib_err
        if isinstance(e, _urllib_err.HTTPError):
            body = e.read().decode("utf-8", errors="replace")
            raise HTTPException(
                status_code=500,
                detail=f"Anthropic API lỗi {e.code}: {body[:500]}",
            )
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
