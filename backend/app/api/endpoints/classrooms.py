from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID
import uuid
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user, get_current_teacher
from app.schemas.classrooms import Classroom, ClassroomCreate, ClassroomUpdate, ClassroomList

router = APIRouter()

@router.get("/", response_model=ClassroomList)
def get_classrooms(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """Lấy danh sách lớp học. Nếu là giáo viên thì lấy lớp mình dạy, học sinh thì lấy lớp mình tham gia."""
    try:
        # User metadata contains the role
        user_role = current_user.user_metadata.get("role", "student")
        print(f"[Debug] User: {current_user.email}, Detected Role: {user_role}")
        
        if user_role == 'teacher':

            # Get teacher's classrooms - Simplified query
            print(f"[Debug] Fetching classrooms for teacher_id: {current_user.id}")
            resp = supabase_client.table("classrooms")\
                .select("*")\
                .eq("teacher_id", str(current_user.id))\
                .range(skip, skip + limit - 1)\
                .order("created_at", desc=True)\
                .execute()
            
            print(f"[Debug] Supabase response data: {resp.data}")
            
            # Count total
            count_resp = supabase_client.table("classrooms").select("*", count="exact").eq("teacher_id", str(current_user.id)).execute()
            total = count_resp.count or 0
        else:
            # Student logic remains similar but simplified
            sub_resp = supabase_client.table("classroom_students").select("classroom_id").eq("student_id", str(current_user.id)).execute()
            class_ids = [r["classroom_id"] for r in sub_resp.data or []]
            
            if not class_ids:
                return {"classrooms": [], "total": 0}
                
            resp = supabase_client.table("classrooms")\
                .select("*")\
                .in_("id", class_ids)\
                .range(skip, skip + limit - 1)\
                .execute()
            total = len(class_ids)

        # Process counts (simplified for now)
        classrooms = []
        for c in resp.data or []:
            # We'll set a default for now, can improve later
            c["student_count"] = 0 
            classrooms.append(c)
            
        return {"classrooms": classrooms, "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tải danh sách lớp: {str(e)}")

@router.post("/", response_model=Classroom, status_code=status.HTTP_201_CREATED)
def create_classroom(
    data: ClassroomCreate,
    current_user=Depends(get_current_teacher),
):
    """Tạo lớp học mới (chỉ giáo viên)."""
    try:
        payload = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "description": data.description,
            "teacher_id": str(current_user.id)
        }
        resp = supabase_client.table("classrooms").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=400, detail="Không thể tạo lớp học.")
        return resp.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo lớp: {str(e)}")

@router.get("/{classroom_id}", response_model=Classroom)
def get_classroom(
    classroom_id: UUID,
    current_user=Depends(get_current_user),
):
    """Lấy chi tiết lớp học bao gồm danh sách học sinh."""
    try:
        # 1. Get basic info
        resp = supabase_client.table("classrooms").select("*").eq("id", str(classroom_id)).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học.")
        
        classroom = resp.data[0]
        
        # 2. Get students
        stu_resp = supabase_client.table("classroom_students")\
            .select("student_id, joined_at, users(id, name, email)")\
            .eq("classroom_id", str(classroom_id))\
            .execute()
        
        students = []
        for s in stu_resp.data or []:
            user_data = s.get("users", {})
            students.append({
                "id": user_data.get("id"),
                "name": user_data.get("name"),
                "email": user_data.get("email"),
                "joined_at": s.get("joined_at")
            })
        
        classroom["students"] = students
        classroom["student_count"] = len(students)
        return classroom
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tải chi tiết lớp: {str(e)}")

@router.post("/{classroom_id}/students")
def add_student_to_class(
    classroom_id: UUID,
    student_id: UUID,
    current_user=Depends(get_current_teacher),
):
    """Thêm học sinh vào lớp (chỉ giáo viên chủ nhiệm)."""
    try:
        # Check ownership
        check = supabase_client.table("classrooms").select("teacher_id").eq("id", str(classroom_id)).execute()
        if not check.data or check.data[0]["teacher_id"] != str(current_user.id):
            raise HTTPException(status_code=403, detail="Bạn không có quyền quản lý lớp này.")
            
        payload = {"classroom_id": str(classroom_id), "student_id": str(student_id)}
        resp = supabase_client.table("classroom_students").upsert(payload).execute()
        return {"message": "Đã thêm học sinh vào lớp."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi thêm học sinh: {str(e)}")

@router.delete("/{classroom_id}/students/{student_id}")
def remove_student_from_class(
    classroom_id: UUID,
    student_id: UUID,
    current_user=Depends(get_current_teacher),
):
    """Xóa học sinh khỏi lớp."""
    try:
        check = supabase_client.table("classrooms").select("teacher_id").eq("id", str(classroom_id)).execute()
        if not check.data or check.data[0]["teacher_id"] != str(current_user.id):
            raise HTTPException(status_code=403, detail="Bạn không có quyền quản lý lớp này.")
            
        supabase_client.table("classroom_students")\
            .delete()\
            .match({"classroom_id": str(classroom_id), "student_id": str(student_id)})\
            .execute()
        return {"message": "Đã xóa học sinh khỏi lớp."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa học sinh: {str(e)}")

@router.post("/{classroom_id}/assign-exam")
def assign_exam_to_class(
    classroom_id: UUID,
    exam_id: UUID,
    due_date: Optional[str] = None,
    current_user=Depends(get_current_teacher),
):
    """Giao đề thi cho TOÀN BỘ học sinh trong lớp."""
    try:
        # 1. Verify ownership
        class_resp = supabase_client.table("classrooms").select("teacher_id").eq("id", str(classroom_id)).execute()
        if not class_resp.data or class_resp.data[0]["teacher_id"] != str(current_user.id):
            raise HTTPException(status_code=403, detail="Bạn không có quyền quản lý lớp này.")
            
        # 2. Get all students in class
        stu_resp = supabase_client.table("classroom_students").select("student_id").eq("classroom_id", str(classroom_id)).execute()
        student_ids = [s["student_id"] for s in stu_resp.data or []]
        
        if not student_ids:
            raise HTTPException(status_code=400, detail="Lớp học chưa có học sinh nào.")
            
        # 3. Create assignments batch
        assignments = []
        for sid in student_ids:
            assignments.append({
                "id": str(uuid.uuid4()),
                "student_id": sid,
                "exam_id": str(exam_id),
                "classroom_id": str(classroom_id),
                "due_date": due_date,
                "status": "pending"
            })
            
        supabase_client.table("assignments").insert(assignments).execute()
        return {"message": f"Đã giao bài cho {len(student_ids)} học sinh trong lớp.", "count": len(student_ids)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi giao bài cho lớp: {str(e)}")
