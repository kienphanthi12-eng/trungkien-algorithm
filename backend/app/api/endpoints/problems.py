from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from uuid import UUID
import json
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user, get_current_teacher
from app.schemas.problems import Problem, ProblemCreate, ProblemUpdate, ProblemList

router = APIRouter()

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
