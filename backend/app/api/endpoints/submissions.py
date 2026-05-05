import os
import json
import re
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from uuid import UUID
import uuid
from datetime import datetime, timezone
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user
from app.schemas.submissions import Submission, SubmissionCreate, SubmissionList
from app.services.llm_proxy import LLMProxy
import asyncio

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


def _enrich_submission(sub: dict) -> dict:
    """Add problem info, student info, and grade to a submission dict."""
    enriched = dict(sub)

    # Get assignment info (problem_id + student_id)
    try:
        assign_resp = (
            supabase_client.table("assignments")
            .select("problem_id, student_id, teacher_id")
            .eq("id", sub["assignment_id"])
            .execute()
        )
        if assign_resp.data:
            a = assign_resp.data[0]
            # Problem info
            prob_resp = (
                supabase_client.table("problems")
                .select("id, title, description")
                .eq("id", a["problem_id"])
                .execute()
            )
            if prob_resp.data:
                enriched["problem_title"] = prob_resp.data[0]["title"]
                enriched["problem_description"] = prob_resp.data[0]["description"]
            # Student info
            student_id = sub.get("student_id") or a.get("student_id")
            if student_id:
                stu_resp = (
                    supabase_client.table("users")
                    .select("name, email")
                    .eq("id", str(student_id))
                    .execute()
                )
                if stu_resp.data:
                    enriched["student_name"] = stu_resp.data[0]["name"]
                    enriched["student_email"] = stu_resp.data[0]["email"]
    except Exception:
        pass

    # Get grade if exists
    try:
        grade_resp = (
            supabase_client.table("grades")
            .select("*")
            .eq("submission_id", sub["id"])
            .limit(1)
            .execute()
        )
        if grade_resp.data:
            enriched["grade"] = grade_resp.data[0]
    except Exception:
        pass

    return enriched


GRADING_SYSTEM_PROMPT = """Bạn là một giáo viên lập trình chấm bài tập của học sinh.
Hãy chấm bài dựa trên đề bài và bài làm của học sinh.
Trả về JSON với format chính xác như sau (không có text nào khác):
{
  "score": <số từ 0.0 đến 10.0>,
  "overall": "<nhận xét tổng thể>",
  "criteria": {
    "correctness": {"score": <0-10>, "comment": "<nhận xét>"},
    "clarity": {"score": <0-10>, "comment": "<nhận xét>"},
    "efficiency": {"score": <0-10>, "comment": "<nhận xét>"}
  }
}"""

ESSAY_GRADING_SYSTEM_PROMPT = """Bạn là giáo viên chấm bài tự luận cho học sinh Việt Nam (toán, lý, hóa, văn hoặc các môn khác).
Chấm bài dựa trên đề bài và bài làm của học sinh. KHÔNG đánh giá về code hay lập trình.
Trả về JSON với format chính xác như sau (không có text nào khác):
{
  "score": <số từ 0.0 đến 10.0>,
  "overall": "<nhận xét tổng thể về bài làm>",
  "criteria": {
    "correctness": {"score": <0-10>, "comment": "<kết quả/đáp án có đúng không, sai ở đâu>"},
    "clarity": {"score": <0-10>, "comment": "<trình bày có rõ ràng, logic, đầy đủ bước không>"},
    "completeness": {"score": <0-10>, "comment": "<giải quyết đầy đủ yêu cầu đề bài chưa>"}
  }
}"""


def _build_grading_user_msg(problem_title: str, problem_description: str, answer_text: str) -> str:
    return f"""ĐỀ BÀI: {problem_title}

MÔ TẢ: {problem_description}

BÀI LÀM CỦA HỌC SINH:
{answer_text or "(Học sinh không nộp bài viết)"}

Hãy chấm bài và trả về JSON theo format đã chỉ định."""


def _parse_grading_response(response_text: str) -> dict:
    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
    if json_match:
        feedback = json.loads(json_match.group())
    else:
        feedback = json.loads(response_text)
    score = float(feedback.get("score", 0))
    feedback["score"] = max(0.0, min(10.0, score))
    return feedback


def _call_llm_grader(problem_title: str, problem_description: str, answer_text: str,
                     system_prompt: str = None) -> dict:
    """Grade with LLMProxy. Returns: {"score": float, "feedback_json": dict, "llm_cost": float}"""
    sp = system_prompt or GRADING_SYSTEM_PROMPT
    user_msg = _build_grading_user_msg(problem_title, problem_description, answer_text)

    messages = [
        {"role": "system", "content": sp},
        {"role": "user", "content": user_msg},
    ]

    try:
        # Run async LLMProxy in this sync thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        response = loop.run_until_complete(LLMProxy.chat_completion(
            messages=messages,
            max_tokens=1024,
            temperature=0.2,
            response_format={"type": "json_object"}
        ))
        loop.close()

        feedback = _parse_grading_response(response["content"])
        return {
            "score": feedback["score"],
            "feedback_json": feedback,
            "llm_cost": response["cost"],
            "model": response["model"]
        }
    except Exception as e:
        return {
            "score": 5.0,
            "feedback_json": {
                "score": 5.0,
                "overall": f"Lỗi gọi AI chấm bài: {e}",
                "criteria": {
                    "correctness": {"score": 5, "comment": "Chưa đánh giá"},
                    "clarity": {"score": 5, "comment": "Chưa đánh giá"},
                    "efficiency": {"score": 5, "comment": "Chưa đánh giá"},
                },
            },
            "llm_cost": 0.0,
            "model": "none",
        }


def _auto_grade_objective(problem_type: str, correct_answer: str, student_answer: str) -> dict:
    """Instant auto-grading for multiple_choice and true_false — no AI needed."""
    if problem_type in ("multiple_choice", "trivia"):
        sa = student_answer.strip().upper()
        ca = (correct_answer or "").strip().upper()
    else:  # true_false
        sa = student_answer.strip().lower()
        ca = (correct_answer or "").strip().lower()

    is_correct = sa == ca
    score = 10.0 if is_correct else 0.0
    display_answer = sa if problem_type in ("multiple_choice", "trivia") else ("Đúng" if sa == "true" else "Sai")
    display_correct = ca if problem_type in ("multiple_choice", "trivia") else ("Đúng" if ca == "true" else "Sai")

    return {
        "score": score,
        "feedback_json": {
            "score": score,
            "overall": (
                f"✓ Chính xác! Bạn chọn: {display_answer}."
                if is_correct else
                f"✗ Chưa đúng. Bạn chọn: {display_answer} — Đáp án đúng: {display_correct}."
            ),
            "criteria": {
                "correctness": {"score": score, "comment": "Đúng" if is_correct else "Sai"},
                "clarity": {"score": 10, "comment": "—"},
                "efficiency": {"score": 10, "comment": "—"},
            },
            "model": "auto",
        },
        "llm_cost": 0.0,
        "model": "auto",
    }


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=Submission)
def create_submission(
    submission_in: SubmissionCreate,
    current_user=Depends(get_current_user),
):
    """Student submits their answer for an assignment."""
    try:
        role = _get_user_role(str(current_user.id))
        if role != "student":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ học sinh mới có thể nộp bài.",
            )

        # Verify assignment belongs to this student and is still pending
        assign_resp = (
            supabase_client.table("assignments")
            .select("*")
            .eq("id", str(submission_in.assignment_id))
            .eq("student_id", str(current_user.id))
            .execute()
        )
        if not assign_resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập hoặc bài tập không thuộc về bạn.",
            )

        assignment = assign_resp.data[0]
        if assignment["status"] not in ("pending",):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bài tập này đã được nộp.",
            )

        # Check if already submitted
        existing = (
            supabase_client.table("submissions")
            .select("id")
            .eq("assignment_id", str(submission_in.assignment_id))
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã nộp bài tập này rồi.",
            )

        # Create submission
        payload = {
            "id": str(uuid.uuid4()),
            "assignment_id": str(submission_in.assignment_id),
            "student_id": str(current_user.id),
            "text_content": submission_in.text_content or "",
            "image_urls": submission_in.image_urls or [],
        }

        sub_resp = supabase_client.table("submissions").insert(payload).execute()
        if not sub_resp.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lỗi khi tạo bài nộp.",
            )

        submission_id = sub_resp.data[0]["id"]
        new_status = "submitted"

        # Auto-grade MCQ / true_false immediately on submission
        try:
            prob_resp = (
                supabase_client.table("problems")
                .select("problem_type, correct_answer")
                .eq("id", str(assignment["problem_id"]))
                .execute()
            )
            if prob_resp.data:
                ptype = prob_resp.data[0].get("problem_type", "algorithm") or "algorithm"
                correct_answer = prob_resp.data[0].get("correct_answer")
                if ptype in ("multiple_choice", "true_false") and correct_answer:
                    grade_result = _auto_grade_objective(
                        ptype, correct_answer, submission_in.text_content or ""
                    )
                    grade_payload = {
                        "id": str(uuid.uuid4()),
                        "submission_id": submission_id,
                        "score": grade_result["score"],
                        "feedback_json": grade_result["feedback_json"],
                        "graded_at": datetime.now(timezone.utc).isoformat(),
                        "llm_cost": 0.0,
                    }
                    supabase_client.table("grades").insert(grade_payload).execute()
                    new_status = "graded"
        except Exception:
            pass  # Don't fail submission if auto-grading errors

        # Update assignment status
        supabase_client.table("assignments").update({"status": new_status}).eq(
            "id", str(submission_in.assignment_id)
        ).execute()

        enriched = _enrich_submission(sub_resp.data[0])
        return enriched

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi nộp bài: {str(e)}",
        )


@router.get("/by-assignment/{assignment_id}", response_model=Submission)
def get_submission_by_assignment(
    assignment_id: UUID,
    current_user=Depends(get_current_user),
):
    """Get submission for a specific assignment."""
    try:
        # Access control: verify user has access to this assignment
        assign_resp = (
            supabase_client.table("assignments")
            .select("teacher_id, student_id")
            .eq("id", str(assignment_id))
            .execute()
        )
        if not assign_resp.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài tập.")

        a = assign_resp.data[0]
        if str(current_user.id) not in (str(a["teacher_id"]), str(a["student_id"])):
            raise HTTPException(status_code=403, detail="Không có quyền xem bài nộp này.")

        sub_resp = (
            supabase_client.table("submissions")
            .select("*")
            .eq("assignment_id", str(assignment_id))
            .limit(1)
            .execute()
        )
        if not sub_resp.data:
            raise HTTPException(status_code=404, detail="Chưa có bài nộp.")

        return _enrich_submission(sub_resp.data[0])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.get("/{submission_id}", response_model=Submission)
def get_submission(
    submission_id: UUID,
    current_user=Depends(get_current_user),
):
    """Get a submission by ID."""
    try:
        sub_resp = (
            supabase_client.table("submissions")
            .select("*")
            .eq("id", str(submission_id))
            .execute()
        )
        if not sub_resp.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài nộp.")

        sub = sub_resp.data[0]

        # Access control
        student_id = sub.get("student_id")
        assign_resp = (
            supabase_client.table("assignments")
            .select("teacher_id, student_id")
            .eq("id", sub["assignment_id"])
            .execute()
        )
        if assign_resp.data:
            a = assign_resp.data[0]
            if str(current_user.id) not in (str(a["teacher_id"]), str(a.get("student_id", ""))):
                raise HTTPException(status_code=403, detail="Không có quyền xem bài nộp này.")

        return _enrich_submission(sub)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi: {str(e)}")


@router.post("/{submission_id}/grade", response_model=Submission)
def grade_submission(
    submission_id: UUID,
    current_user=Depends(get_current_user),
):
    """
    Teacher triggers LLM grading for a submission.
    Returns the submission with grade info attached.
    """
    try:
        role = _get_user_role(str(current_user.id))
        if role != "teacher":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ giáo viên mới có thể chấm bài.",
            )

        # Get submission
        sub_resp = (
            supabase_client.table("submissions")
            .select("*")
            .eq("id", str(submission_id))
            .execute()
        )
        if not sub_resp.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài nộp.")

        sub = sub_resp.data[0]

        # Verify teacher owns this assignment
        assign_resp = (
            supabase_client.table("assignments")
            .select("*")
            .eq("id", sub["assignment_id"])
            .execute()
        )
        if not assign_resp.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài tập.")

        assignment = assign_resp.data[0]
        if str(assignment["teacher_id"]) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không phải giáo viên của bài tập này.",
            )

        # Get problem info for grading context
        problem_title = ""
        problem_description = ""
        problem_type = "algorithm"
        correct_answer = None
        try:
            prob_resp = (
                supabase_client.table("problems")
                .select("title, description, problem_type, correct_answer")
                .eq("id", str(assignment["problem_id"]))
                .execute()
            )
            if prob_resp.data:
                problem_title = prob_resp.data[0]["title"]
                problem_description = prob_resp.data[0]["description"]
                problem_type = prob_resp.data[0].get("problem_type", "algorithm") or "algorithm"
                correct_answer = prob_resp.data[0].get("correct_answer")
        except Exception:
            pass

        # Check if already graded, delete old grade
        old_grade = (
            supabase_client.table("grades")
            .select("id")
            .eq("submission_id", str(submission_id))
            .execute()
        )
        if old_grade.data:
            supabase_client.table("grades").delete().eq(
                "submission_id", str(submission_id)
            ).execute()

        # Grade based on problem type
        if problem_type in ("multiple_choice", "true_false"):
            # Instant auto-grade — no AI needed
            grading_result = _auto_grade_objective(
                problem_type, correct_answer or "", sub.get("text_content", "")
            )
        elif problem_type == "essay":
            # AI grading with essay-focused prompt (not code-focused)
            grading_result = _call_llm_grader(
                problem_title=problem_title,
                problem_description=problem_description,
                answer_text=sub.get("text_content", ""),
                system_prompt=ESSAY_GRADING_SYSTEM_PROMPT,
            )
        else:
            # algorithm: existing code grading prompt
            grading_result = _call_llm_grader(
                problem_title=problem_title,
                problem_description=problem_description,
                answer_text=sub.get("text_content", ""),
                system_prompt=GRADING_SYSTEM_PROMPT,
            )

        # Save grade
        grade_payload = {
            "id": str(uuid.uuid4()),
            "submission_id": str(submission_id),
            "score": grading_result["score"],
            "feedback_json": grading_result["feedback_json"],
            "graded_at": datetime.now(timezone.utc).isoformat(),
            "llm_cost": grading_result["llm_cost"],
        }
        supabase_client.table("grades").insert(grade_payload).execute()

        # Update assignment status to 'graded'
        supabase_client.table("assignments").update({"status": "graded"}).eq(
            "id", sub["assignment_id"]
        ).execute()

        # Return enriched submission
        return _enrich_submission(sub)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi chấm bài: {str(e)}")
