from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from uuid import UUID
import json
import os
import asyncio
import uuid
from pydantic import BaseModel
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user, get_current_teacher
from app.schemas.problems import Problem, ProblemCreate, ProblemUpdate, ProblemList

router = APIRouter()

# ─── AI Problem Generation ────────────────────────────────────────────────────

GENERATE_SYSTEM_PROMPT = """Bạn là chuyên gia ra đề thi cho học sinh Việt Nam, hỗ trợ bài toán lập trình, toán học phổ thông và cả các câu đố vui/kiến thức tổng hợp.
Từ ý tưởng ngắn gọn của giáo viên, hãy tạo một bài toán hoặc câu đố hoàn chỉnh và rõ ràng.

Trả về JSON hợp lệ (KHÔNG có markdown wrapper, KHÔNG có ```json).

Nếu là bài TRẮC NGHIỆM TOÁN (multiple_choice), dùng cấu trúc:
{
  "problem_type": "multiple_choice",
  "title": "Câu hỏi ngắn gọn",
  "description": "Đề bài đầy đủ, viết rõ ràng với ký hiệu toán học dùng unicode (ví dụ: x², √x, ≤, ≥, π, ∞)",
  "difficulty": "easy" | "medium" | "hard",
  "category": "Giải tích | Hình học | Đại số | Tổ hợp | Xác suất | Lượng giác | ...",
  "choices": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "correct_answer": "A" | "B" | "C" | "D",
  "solution": "Lời giải chi tiết từng bước",
  "example_input": "",
  "example_output": "",
  "test_cases": [],
  "time_limit": 1000,
  "memory_limit": 256
}

Nếu là ĐỐ VUI / KIẾN THỨC TỔNG HỢP (trivia), dùng cấu trúc tương tự trắc nghiệm:
{
  "problem_type": "trivia",
  "title": "Câu đố thú vị",
  "description": "Nội dung câu đố hoặc câu hỏi kiến thức xã hội/khoa học/đố mẹo",
  "difficulty": "easy" | "medium" | "hard",
  "category": "Đố mẹo | Khoa học | Lịch sử | Văn hóa | IQ | ...",
  "choices": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "correct_answer": "A" | "B" | "C" | "D",
  "solution": "Giải thích đáp án hoặc ý nghĩa câu đố",
  "example_input": "",
  "example_output": "",
  "test_cases": [],
  "time_limit": 1000,
  "memory_limit": 256
}

Nếu là bài ĐÚNG/SAI TOÁN (true_false), dùng:
{
  "problem_type": "true_false",
  "title": "...",
  "description": "Mệnh đề toán học cần xác định đúng/sai",
  "difficulty": "...",
  "category": "...",
  "choices": null,
  "correct_answer": "true" | "false",
  "solution": "Lời giải/chứng minh",
  "example_input": "",
  "example_output": "",
  "test_cases": [],
  "time_limit": 1000,
  "memory_limit": 256
}

Nếu là bài TỰ LUẬN (essay), dùng:
{
  "problem_type": "essay",
  "title": "...",
  "description": "Đề bài tự luận đầy đủ, rõ ràng",
  "difficulty": "...",
  "category": "Giải tích | Hình học | Đại số | Vật lý | Hóa học | ...",
  "choices": null,
  "correct_answer": null,
  "solution": "Lời giải mẫu chi tiết từng bước (giáo viên dùng để chấm)",
  "example_input": "",
  "example_output": "",
  "test_cases": [],
  "time_limit": 1000,
  "memory_limit": 256
}

Nếu là bài LẬP TRÌNH (algorithm), dùng:
{
  "problem_type": "algorithm",
  "title": "...",
  "description": "Đề bài\\n\\nInput:\\n- ...\\n\\nOutput:\\n- ...\\n\\nRàng buộc:\\n- ...",
  "difficulty": "...",
  "category": "Arrays | Sorting | DP | Greedy | Math | ...",
  "choices": null,
  "correct_answer": null,
  "solution": null,
  "example_input": "...",
  "example_output": "...",
  "test_cases": [{"input":"...","output":"..."},{"input":"...","output":"..."},{"input":"...","output":"..."}],
  "time_limit": 1000,
  "memory_limit": 256
}

QUY TẮC CHUNG:
- Viết tiếng Việt đầy đủ dấu
- Dùng ký hiệu unicode cho toán học: ², ³, √, ≤, ≥, ≠, ≈, π, ∞, ∈, ∉, ∀, ∃
- description dùng \\n để xuống dòng
- Các phương án A/B/C/D phải có một đáp án đúng duy nhất
- Lời giải (solution) phải chi tiết, đúng đắn
- Chỉ trả về JSON thuần túy"""


# ── Sync LLM callers (same pattern as submissions.py which works on Railway) ──

def _generate_with_deepseek_sync(prompt: str) -> dict:
    """Sync call to DeepSeek (identical pattern to working grading function)."""
    import httpx
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY not configured")
    resp = httpx.post(
        "https://api.deepseek.com/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": GENERATE_SYSTEM_PROMPT},
                {"role": "user", "content": f"Tạo bài toán về: {prompt}"},
            ],
            "temperature": 0.7,
            "max_tokens": 2000,
        },
        timeout=90.0,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"].strip()
    # Strip markdown code fences if AI wraps JSON in ```
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    return json.loads(content.strip())


def _generate_with_anthropic_sync(prompt: str) -> dict:
    """Sync call to Anthropic (identical pattern to working grading function)."""
    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured")
    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        system=GENERATE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Tạo bài toán về: {prompt}"}],
    )
    content = message.content[0].text.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    return json.loads(content.strip())


def _call_llm_generator_sync(prompt: str) -> dict:
    """Try DeepSeek first, fallback to Anthropic. Pure sync like grading."""
    last_error = None

    if os.environ.get("DEEPSEEK_API_KEY"):
        try:
            return _generate_with_deepseek_sync(prompt)
        except Exception as e:
            last_error = e

    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            return _generate_with_anthropic_sync(prompt)
        except Exception as e:
            last_error = e

    if last_error:
        raise last_error
    raise ValueError("Chưa cấu hình API key (DEEPSEEK_API_KEY hoặc ANTHROPIC_API_KEY).")


class GenerateRequest(BaseModel):
    prompt: str


@router.post("/generate")
async def generate_problem(body: GenerateRequest, current_user = Depends(get_current_teacher)):
    """Generate a problem using AI from a brief description (teacher only)."""
    if not body.prompt.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập mô tả ý tưởng bài toán.")
    try:
        # Run sync LLM call in thread pool (same as grading pattern)
        result = await asyncio.to_thread(_call_llm_generator_sync, body.prompt.strip())
        # Validate required fields
        for field in ["title", "description", "difficulty", "category"]:
            if field not in result or not result[field]:
                raise ValueError(f"Thiếu trường bắt buộc: {field}")
        # Fill defaults for optional fields (AI đôi khi bỏ qua chúng với bài toán)
        result.setdefault("problem_type", "algorithm")
        result.setdefault("example_input", "")
        result.setdefault("example_output", "")
        result.setdefault("test_cases", [])
        result.setdefault("time_limit", 1000)
        result.setdefault("memory_limit", 256)
        result.setdefault("choices", None)
        result.setdefault("correct_answer", None)
        result.setdefault("solution", None)
        return result
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI trả về định dạng không hợp lệ: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo bài toán bằng AI: {str(e)}")

@router.get("/", response_model=ProblemList)
def get_problems(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    difficulty: str = Query(None),
    category: str = Query(None),
    current_user = Depends(get_current_user)
):
    """Get all problems with pagination and filtering"""
    try:
        # Build base filters
        filters = {}
        if difficulty:
            filters["difficulty"] = difficulty
        if category:
            filters["category"] = category

        # Get total count (separate query)
        count_query = supabase_client.table("problems").select("*", count="exact")
        for key, value in filters.items():
            count_query = count_query.eq(key, value)
        count_response = count_query.execute()
        total = count_response.count if count_response.count is not None else len(count_response.data or [])

        # Get paginated data (separate query)
        data_query = supabase_client.table("problems").select("*")
        for key, value in filters.items():
            data_query = data_query.eq(key, value)
        response = data_query.range(skip, skip + limit - 1).order("created_at", desc=True).execute()

        problems = []
        for item in response.data:
            # Parse test_cases from JSON
            if isinstance(item.get("test_cases"), str):
                item["test_cases"] = json.loads(item["test_cases"])
            problems.append(item)

        return {"problems": problems, "total": total}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải danh sách bài toán: {str(e)}"
        )

@router.get("/{problem_id}", response_model=Problem)
def get_problem(problem_id: UUID, current_user = Depends(get_current_user)):
    """Get a specific problem by ID"""
    try:
        response = supabase_client.table("problems") \
            .select("*") \
            .eq("id", str(problem_id)) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài toán này."
            )

        problem = response.data[0]
        # Parse test_cases from JSON
        if isinstance(problem.get("test_cases"), str):
            problem["test_cases"] = json.loads(problem["test_cases"])

        return problem
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải bài toán: {str(e)}"
        )

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=Problem)
def create_problem(
    problem_in: ProblemCreate,
    current_user = Depends(get_current_teacher)
):
    """Create a new problem (teacher only)"""
    try:
        ptype = problem_in.problem_type or "algorithm"
        problem_data = {
            "id": str(uuid.uuid4()),
            "title": problem_in.title,
            "description": problem_in.description,
            "difficulty": problem_in.difficulty,
            "category": problem_in.category,
            "problem_type": ptype,
            "example_input": problem_in.example_input or "",
            "example_output": problem_in.example_output or "",
            "test_cases": json.dumps([tc.dict() for tc in (problem_in.test_cases or [])]),
            "time_limit": problem_in.time_limit or 1000,
            "memory_limit": problem_in.memory_limit or 256,
            "created_by": str(current_user.id),
        }
        if problem_in.choices:
            problem_data["choices"] = problem_in.choices
        if problem_in.correct_answer:
            problem_data["correct_answer"] = problem_in.correct_answer
        if problem_in.solution:
            problem_data["solution"] = problem_in.solution

        response = supabase_client.table("problems").insert(problem_data).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lỗi khi tạo bài toán"
            )

        problem = response.data[0]
        # Parse test_cases from JSON
        if isinstance(problem.get("test_cases"), str):
            problem["test_cases"] = json.loads(problem["test_cases"])

        return problem
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo bài toán: {str(e)}"
        )

@router.put("/{problem_id}", response_model=Problem)
def update_problem(
    problem_id: UUID,
    problem_in: ProblemUpdate,
    current_user = Depends(get_current_teacher)
):
    """Update a problem (teacher only, must be creator)"""
    try:
        # Check if problem exists and user is the creator
        check_response = supabase_client.table("problems") \
            .select("created_by") \
            .eq("id", str(problem_id)) \
            .execute()

        if not check_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài toán này."
            )

        if check_response.data[0]["created_by"] != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa bài toán này."
            )

        # Prepare update data
        update_data = {}
        if problem_in.title is not None:
            update_data["title"] = problem_in.title
        if problem_in.description is not None:
            update_data["description"] = problem_in.description
        if problem_in.difficulty is not None:
            update_data["difficulty"] = problem_in.difficulty
        if problem_in.category is not None:
            update_data["category"] = problem_in.category
        if problem_in.example_input is not None:
            update_data["example_input"] = problem_in.example_input
        if problem_in.example_output is not None:
            update_data["example_output"] = problem_in.example_output
        if problem_in.test_cases is not None:
            update_data["test_cases"] = json.dumps([tc.dict() for tc in problem_in.test_cases])
        if problem_in.time_limit is not None:
            update_data["time_limit"] = problem_in.time_limit
        if problem_in.memory_limit is not None:
            update_data["memory_limit"] = problem_in.memory_limit

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không có dữ liệu cần cập nhật."
            )

        response = supabase_client.table("problems") \
            .update(update_data) \
            .eq("id", str(problem_id)) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lỗi khi cập nhật bài toán"
            )

        problem = response.data[0]
        # Parse test_cases from JSON
        if isinstance(problem.get("test_cases"), str):
            problem["test_cases"] = json.loads(problem["test_cases"])

        return problem
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi cập nhật bài toán: {str(e)}"
        )

@router.delete("/{problem_id}")
def delete_problem(
    problem_id: UUID,
    current_user = Depends(get_current_teacher)
):
    """Delete a problem (teacher only, must be creator)"""
    try:
        # Check if problem exists and user is the creator
        check_response = supabase_client.table("problems") \
            .select("created_by") \
            .eq("id", str(problem_id)) \
            .execute()

        if not check_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài toán này."
            )

        if check_response.data[0]["created_by"] != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa bài toán này."
            )

        supabase_client.table("problems") \
            .delete() \
            .eq("id", str(problem_id)) \
            .execute()

        return {"message": "Đã xóa bài toán thành công"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa bài toán: {str(e)}"
        )
