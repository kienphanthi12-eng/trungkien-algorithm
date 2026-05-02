import os
import json
import re
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user
from app.schemas.submissions import Submission, SubmissionCreate, SubmissionList

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


def _grade_with_deepseek(problem_title: str, problem_description: str, answer_text: str) -> dict:
    """Call DeepSeek API (OpenAI-compatible). Cheapest option."""
    import httpx

    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY not configured")

    user_msg = _build_grading_user_msg(problem_title, problem_description, answer_text)

    resp = httpx.post(
        "https://api.deepseek.com/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": GRADING_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            "max_tokens": 1024,
            "temperature": 0.2,
        },
        timeout=60.0,
    )
    resp.raise_for_status()
    data = resp.json()

    response_text = data["choices"][0]["message"]["content"].strip()
    feedback = _parse_grading_response(response_text)

    # DeepSeek pricing: ~$0.14/MTok input, $0.28/MTok output (deepseek-chat)
    usage = data.get("usage", {})
    input_tokens = usage.get("prompt_tokens", 0)
    output_tokens = usage.get("completion_tokens", 0)
    llm_cost = (input_tokens * 0.00000014) + (output_tokens * 0.00000028)

    return {"score": feedback["score"], "feedback_json": feedback, "llm_cost": llm_cost, "model": "deepseek-chat"}


def _grade_with_anthropic(problem_title: str, problem_description: str, answer_text: str) -> dict:
    """Call Anthropic Claude Haiku. Fallback option."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    client = anthropic.Anthropic(api_key=api_key)
    user_msg = _build_grading_user_msg(problem_title, problem_description, answer_text)

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": user_msg}],
        system=GRADING_SYSTEM_PROMPT,
    )

    response_text = message.content[0].text.strip()
    feedback = _parse_grading_response(response_text)

    # Haiku pricing: $0.80/MTok input, $4.00/MTok output (claude-haiku-4-5)
    input_tokens = message.usage.input_tokens
    output_tokens = message.usage.output_tokens
    llm_cost = (input_tokens * 0.0000008) + (output_tokens * 0.000004)

    return {"score": feedback["score"], "feedback_json": feedback, "llm_cost": llm_cost, "model": "claude-haiku-4-5"}


def _call_llm_grader(problem_title: str, problem_description: str, answer_text: str) -> dict:
    """
    Grade with DeepSeek first (cheaper), fallback to Anthropic.
    Returns: {"score": float, "feedback_json": dict, "llm_cost": float}
    """
    last_error = None

    # 1. Try DeepSeek first (cheapest)
    deepseek_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if deepseek_key:
        try:
            return _grade_with_deepseek(problem_title, problem_description, answer_text)
        except Exception as e:
            last_error = e

    # 2. Fallback to Anthropic
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if anthropic_key:
        try:
            return _grade_with_anthropic(problem_title, problem_description, answer_text)
        except Exception as e:
            last_error = e

    # 3. No API keys configured — return placeholder
    if last_error:
        raise last_error

    return {
        "score": 5.0,
        "feedback_json": {
            "score": 5.0,
            "overall": "Chưa cấu hình API key. Vui lòng thêm DEEPSEEK_API_KEY hoặc ANTHROPIC_API_KEY vào Railway.",
            "criteria": {
                "correctness": {"score": 5, "comment": "Chưa đánh giá"},
                "clarity": {"score": 5, "comment": "Chưa đánh giá"},
                "efficiency": {"score": 5, "comment": "Chưa đánh giá"},
            },
        },
        "llm_cost": 0.0,
        "model": "none",
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

        # Update assignment status to 'submitted'
        supabase_client.table("assignments").update({"status": "submitted"}).eq(
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
        try:
            prob_resp = (
                supabase_client.table("problems")
                .select("title, description")
                .eq("id", str(assignment["problem_id"]))
                .execute()
            )
            if prob_resp.data:
                problem_title = prob_resp.data[0]["title"]
                problem_description = prob_resp.data[0]["description"]
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

        # Call LLM grader
        grading_result = _call_llm_grader(
            problem_title=problem_title,
            problem_description=problem_description,
            answer_text=sub.get("text_content", ""),
        )

        # Save grade
        grade_payload = {
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
