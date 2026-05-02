from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from uuid import UUID
import json
import os
import httpx
from pydantic import BaseModel
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user, get_current_teacher
from app.schemas.problems import Problem, ProblemCreate, ProblemUpdate, ProblemList

router = APIRouter()

# ─── AI Problem Generation ────────────────────────────────────────────────────

GENERATE_SYSTEM_PROMPT = """Bạn là chuyên gia ra đề thi lập trình cho học sinh Việt Nam.
Từ ý tưởng ngắn gọn của giáo viên, hãy tạo một bài toán lập trình hoàn chỉnh.

Trả về JSON hợp lệ (KHÔNG có markdown, KHÔNG có ```json) với cấu trúc:
{
  "title": "Tên bài toán ngắn gọn",
  "description": "Mô tả đầy đủ bài toán: đề bài, input/output format, ràng buộc",
  "difficulty": "easy" | "medium" | "hard",
  "category": "Chủ đề kỹ thuật (Arrays, Sorting, DP, Greedy, ...)",
  "example_input": "Input ví dụ minh họa",
  "example_output": "Output tương ứng",
  "test_cases": [
    {"input": "...", "output": "..."},
    {"input": "...", "output": "..."},
    {"input": "...", "output": "..."}
  ],
  "time_limit": 1000,
  "memory_limit": 256
}

Yêu cầu:
- description phải rõ ràng, đủ ràng buộc để học sinh giải được
- Tạo ít nhất 3 test cases (bao gồm edge cases)
- test_cases phải CHÍNH XÁC (input → output đúng với thuật toán)
- difficulty phù hợp với mô tả
- Chỉ trả về JSON thuần túy"""


async def _generate_with_deepseek(prompt: str) -> dict:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        raise ValueError("No DeepSeek key")
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
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
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()
        return json.loads(content)


async def _generate_with_anthropic(prompt: str) -> dict:
    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise ValueError("No Anthropic key")
    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=2000,
        system=GENERATE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Tạo bài toán về: {prompt}"}],
    )
    content = message.content[0].text.strip()
    return json.loads(content)


async def _call_llm_generator(prompt: str) -> dict:
    if os.environ.get("DEEPSEEK_API_KEY"):
        try:
            return await _generate_with_deepseek(prompt)
        except Exception:
            pass
    if os.environ.get("ANTHROPIC_API_KEY"):
        return await _generate_with_anthropic(prompt)
    raise HTTPException(status_code=503, detail="Không có API key LLM nào được cấu hình.")


class GenerateRequest(BaseModel):
    prompt: str


@router.post("/generate")
async def generate_problem(body: GenerateRequest, current_user = Depends(get_current_teacher)):
    """Generate a problem using AI from a brief description (teacher only)."""
    if not body.prompt.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập mô tả ý tưởng bài toán.")
    try:
        result = await _call_llm_generator(body.prompt.strip())
        # Validate required fields
        required = ["title", "description", "difficulty", "category",
                    "example_input", "example_output", "test_cases"]
        for field in required:
            if field not in result:
                raise ValueError(f"Missing field: {field}")
        return result
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"AI trả về dữ liệu không hợp lệ: {str(e)}")
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
        problem_data = {
            "title": problem_in.title,
            "description": problem_in.description,
            "difficulty": problem_in.difficulty,
            "category": problem_in.category,
            "example_input": problem_in.example_input,
            "example_output": problem_in.example_output,
            "test_cases": json.dumps([tc.dict() for tc in problem_in.test_cases]),
            "time_limit": problem_in.time_limit,
            "memory_limit": problem_in.memory_limit,
            "created_by": str(current_user.id)
        }

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
