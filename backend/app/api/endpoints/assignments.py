from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from uuid import UUID
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user, get_current_teacher
from app.schemas.assignments import Assignment, AssignmentCreate, AssignmentList
import uuid

router = APIRouter()


def _get_user_role(user_id: str) -> str:
    """Fetch role from public.users table."""
    try:
        resp = supabase_client.table("users").select("role").eq("id", user_id).execute()
        if resp.data:
            return resp.data[0]["role"]
    except Exception:
        pass
    return "student"


def _enrich_assignments(assignments_data: list) -> list:
    """Batch-fetch problem titles and student info, merge into assignment dicts."""
    if not assignments_data:
        return []

    problem_ids = list({a["problem_id"] for a in assignments_data})
    student_ids = list({a["student_id"] for a in assignments_data})

    problems_map: dict = {}
    if problem_ids:
        try:
            prob_resp = supabase_client.table("problems").select("id,title").in_("id", problem_ids).execute()
            for p in prob_resp.data or []:
                problems_map[p["id"]] = p["title"]
        except Exception:
            pass

    students_map: dict = {}
    if student_ids:
        try:
            stu_resp = supabase_client.table("users").select("id,name,email").in_("id", student_ids).execute()
            for s in stu_resp.data or []:
                students_map[s["id"]] = {"name": s["name"], "email": s["email"]}
        except Exception:
            pass

    result = []
    for a in assignments_data:
        enriched = dict(a)
        enriched["problem_title"] = problems_map.get(str(a.get("problem_id", "")), "")
        student_info = students_map.get(str(a.get("student_id", "")), {})
        enriched["student_name"] = student_info.get("name", "")
        enriched["student_email"] = student_info.get("email", "")
        result.append(enriched)
    return result


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=Assignment)
def create_assignment(
    assignment_in: AssignmentCreate,
    current_user=Depends(get_current_teacher),
):
    """Assign a problem to a student (teacher only)."""
    try:
        # Verify student belongs to this teacher
        rel_check = (
            supabase_client.table("students_teachers")
            .select("student_id")
            .eq("teacher_id", str(current_user.id))
            .eq("student_id", str(assignment_in.student_id))
            .execute()
        )
        if not rel_check.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Học sinh này không thuộc lớp của bạn.",
            )

        # Verify problem exists
        prob_check = (
            supabase_client.table("problems")
            .select("id")
            .eq("id", str(assignment_in.problem_id))
            .execute()
        )
        if not prob_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài toán.",
            )

        payload: dict = {
            "id": str(uuid.uuid4()),
            "teacher_id": str(current_user.id),
            "student_id": str(assignment_in.student_id),
            "problem_id": str(assignment_in.problem_id),
            "status": "pending",
        }
        if assignment_in.due_date:
            payload["due_date"] = assignment_in.due_date.isoformat()

        resp = supabase_client.table("assignments").insert(payload).execute()
        if not resp.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lỗi khi tạo bài tập.",
            )

        enriched = _enrich_assignments([resp.data[0]])
        return enriched[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo bài tập: {str(e)}",
        )


@router.get("/", response_model=AssignmentList)
def get_assignments(
    student_id: Optional[UUID] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """
    List assignments.
    - Teachers see all assignments they created (optionally filtered by student/status).
    - Students see only their own assignments (optionally filtered by status).
    """
    try:
        role = _get_user_role(str(current_user.id))

        # Separate query objects to avoid chaining issues
        count_q = supabase_client.table("assignments").select("*", count="exact")
        data_q = supabase_client.table("assignments").select("*")

        if role == "teacher":
            count_q = count_q.eq("teacher_id", str(current_user.id))
            data_q = data_q.eq("teacher_id", str(current_user.id))
            if student_id:
                count_q = count_q.eq("student_id", str(student_id))
                data_q = data_q.eq("student_id", str(student_id))
        else:
            count_q = count_q.eq("student_id", str(current_user.id))
            data_q = data_q.eq("student_id", str(current_user.id))

        if status_filter:
            count_q = count_q.eq("status", status_filter)
            data_q = data_q.eq("status", status_filter)

        count_resp = count_q.execute()
        total = count_resp.count if count_resp.count is not None else len(count_resp.data or [])

        data_resp = data_q.range(skip, skip + limit - 1).order("assigned_at", desc=True).execute()

        enriched = _enrich_assignments(data_resp.data or [])
        return {"assignments": enriched, "total": total}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải danh sách bài tập: {str(e)}",
        )


@router.get("/{assignment_id}", response_model=Assignment)
def get_assignment(
    assignment_id: UUID,
    current_user=Depends(get_current_user),
):
    """Get a specific assignment (teacher who created it or assigned student only)."""
    try:
        resp = (
            supabase_client.table("assignments")
            .select("*")
            .eq("id", str(assignment_id))
            .execute()
        )
        if not resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        assignment = resp.data[0]

        # Access control: only teacher who created or assigned student
        if str(assignment["teacher_id"]) != str(current_user.id) and str(assignment["student_id"]) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem bài tập này.",
            )

        enriched = _enrich_assignments([assignment])
        return enriched[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải bài tập: {str(e)}",
        )


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: UUID,
    current_user=Depends(get_current_teacher),
):
    """Delete an assignment (teacher only, must be creator)."""
    try:
        check = (
            supabase_client.table("assignments")
            .select("teacher_id")
            .eq("id", str(assignment_id))
            .execute()
        )
        if not check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )
        if check.data[0]["teacher_id"] != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa bài tập này.",
            )

        supabase_client.table("assignments").delete().eq("id", str(assignment_id)).execute()
        return {"message": "Đã xóa bài tập thành công"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa bài tập: {str(e)}",
        )
