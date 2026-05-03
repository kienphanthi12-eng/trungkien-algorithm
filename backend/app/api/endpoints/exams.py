from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from uuid import UUID
import uuid
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user, get_current_teacher
from app.schemas.exams import Exam, ExamCreate, ExamUpdate, ExamList

router = APIRouter()

@router.get("/", response_model=ExamList)
def get_exams(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user = Depends(get_current_user)
):
    """Get all exams with pagination"""
    try:
        # Get total count
        count_response = supabase_client.table("exams").select("*", count="exact").execute()
        total = count_response.count if count_response.count is not None else len(count_response.data or [])

        # Get exams with their problems
        response = supabase_client.table("exams") \
            .select("*, problems:exam_problems(*, problem:problems(*))") \
            .range(skip, skip + limit - 1) \
            .order("created_at", desc=True) \
            .execute()

        return {"exams": response.data, "total": total}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải danh sách đề thi: {str(e)}"
        )

@router.get("/{exam_id}", response_model=Exam)
def get_exam(exam_id: UUID, current_user = Depends(get_current_user)):
    """Get a specific exam with its problems"""
    try:
        response = supabase_client.table("exams") \
            .select("*, problems:exam_problems(*, problem:problems(*))") \
            .eq("id", str(exam_id)) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy đề thi này."
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải đề thi: {str(e)}"
        )

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=Exam)
def create_exam(
    exam_in: ExamCreate,
    current_user = Depends(get_current_teacher)
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

        # 1. Insert Exam
        exam_response = supabase_client.table("exams").insert(exam_data).execute()
        if not exam_response.data:
            raise HTTPException(status_code=400, detail="Lỗi khi tạo đề thi")

        # 2. Insert Exam Problems
        if exam_in.problem_ids:
            exam_problems = []
            for idx, prob_id in enumerate(exam_in.problem_ids):
                exam_problems.append({
                    "exam_id": exam_id,
                    "problem_id": str(prob_id),
                    "order_index": idx
                })
            supabase_client.table("exam_problems").insert(exam_problems).execute()

        # Return full exam
        return get_exam(exam_id, current_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo đề thi: {str(e)}"
        )

@router.delete("/{exam_id}")
def delete_exam(
    exam_id: UUID,
    current_user = Depends(get_current_teacher)
):
    """Delete an exam (teacher only, must be creator)"""
    try:
        # Check ownership
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
