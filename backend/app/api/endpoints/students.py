from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_teacher
from app.schemas.students import Student, StudentCreate
from uuid import UUID

router = APIRouter()

@router.get("/", response_model=List[Student])
def get_students(current_user = Depends(get_current_teacher)):
    # Get students linked to this teacher
    teacher_id = current_user.id
    
    # Query students_teachers and join with users
    response = supabase_client.table("students_teachers") \
        .select("student_id, users!students_teachers_student_id_fkey(*)") \
        .eq("teacher_id", teacher_id) \
        .execute()
    
    students = []
    for item in response.data:
        student_data = item.get("users")
        if student_data:
            students.append(student_data)
            
    return students

@router.post("/", status_code=status.HTTP_201_CREATED)
def add_student(student_in: StudentCreate, current_user = Depends(get_current_teacher)):
    teacher_id = current_user.id
    
    # Find student by email
    user_response = supabase_client.table("users") \
        .select("*") \
        .eq("email", student_in.email) \
        .eq("role", "student") \
        .execute()
    
    if not user_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy học sinh với email này."
        )
    
    student_id = user_response.data[0]["id"]
    
    # Check if already linked
    check_response = supabase_client.table("students_teachers") \
        .select("*") \
        .eq("teacher_id", teacher_id) \
        .eq("student_id", student_id) \
        .execute()
    
    if check_response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Học sinh này đã có trong danh sách của bạn."
        )
    
    # Link them
    try:
        supabase_client.table("students_teachers").insert({
            "teacher_id": teacher_id,
            "student_id": student_id
        }).execute()
        return {"message": "Đã thêm học sinh thành công"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi thêm học sinh: {str(e)}"
        )

@router.delete("/{student_id}")
def remove_student(student_id: UUID, current_user = Depends(get_current_teacher)):
    teacher_id = current_user.id
    
    try:
        supabase_client.table("students_teachers") \
            .delete() \
            .eq("teacher_id", teacher_id) \
            .eq("student_id", str(student_id)) \
            .execute()
        return {"message": "Đã xóa học sinh khỏi danh sách"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa học sinh: {str(e)}"
        )
