import os
import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user
from app.services.llm_proxy import LLMProxy
from app.services.lesson_service import LessonService
from app.services.lesson_prompts import get_prompt

router = APIRouter()

# ─── Config ────────────────────────────────────────────────────────────────────

DAILY_LIMIT = 20   # số lượt chat AI tối đa mỗi ngày / học sinh

# ─── System Prompt ─────────────────────────────────────────────────────────────

TUTOR_BASE_PROMPT = """Bạn là 'Thầy giáo AI' tại hệ thống học tập ZENTUS. Nhiệm vụ của bạn là đồng hành, hướng dẫn và truyền cảm hứng cho học sinh Việt Nam trong quá trình giải bài tập.

PHONG CÁCH GIAO TIẾP:
- Xưng hô: 'Thầy' và 'em'. Ngôn ngữ lịch sự, ấm áp, kiên nhẫn và đậm chất sư phạm.
- Luôn bắt đầu bằng một lời chào hoặc lời khích lệ nếu là tin nhắn đầu tiên.
- Nếu học sinh nản lòng, hãy dùng những câu nói truyền động lực.

PHƯƠNG PHÁP GIẢNG DẠY (SOCRATIC METHOD):
1. TUYỆT ĐỐI KHÔNG đưa ra đáp án, lời giải hoặc kết quả cuối cùng.
2. Đặt câu hỏi dẫn dắt: Thay vì giải thích ngay, hãy hỏi để học sinh tự nhận ra vấn đề. (Ví dụ: 'Em thử nhớ lại định lý... xem nó áp dụng thế nào ở đây?')
3. Chia nhỏ vấn đề: Nếu bài toán quá phức tạp, hãy hướng dẫn em giải quyết từng bước nhỏ.
4. Khen ngợi cụ thể: Khi em hiểu ra vấn đề, hãy khen ngợi (Ví dụ: 'Lập luận này của em rất thông minh!', 'Chính xác rồi, bước tiếp theo sẽ là...').
5. Đưa ra ví dụ tương tự: Nếu em bị kẹt, hãy lấy một ví dụ thực tế hoặc một bài toán số liệu khác để minh họa phương pháp.

XỬ LÝ CÂU HỎI TRỰC DIỆN:
- Nếu học sinh hỏi 'Đáp án là gì?' hoặc 'Giải hộ em': Thầy sẽ từ chối nhẹ nhàng: 'Mục tiêu của thầy là giúp em hiểu bài để tự mình chinh phục điểm 10. Chúng ta cùng thử xem bước đầu tiên em định làm thế nào nhé?'

ĐIỀU KIỆN CÂU TRẢ LỜI:
- Ngắn gọn, súc tích (dưới 200 từ).
- Định dạng rõ ràng, dễ đọc.
- Luôn ưu tiên việc hiểu bản chất hơn là công thức vẹt."""



# ─── Schemas ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    assignment_id: str
    message: str
    history: List[ChatMessage] = []


# ─── Quota helpers ─────────────────────────────────────────────────────────────

def _get_usage_today(student_id: str) -> int:
    """Trả về số lượt đã dùng hôm nay của học sinh."""
    try:
        from datetime import date
        today = date.today().isoformat()
        resp = (
            supabase_client.table("llm_usage")
            .select("count")
            .eq("student_id", student_id)
            .eq("date", today)
            .execute()
        )
        if resp.data:
            return resp.data[0]["count"]
        return 0
    except Exception:
        return 0  # Nếu bảng chưa tồn tại, cho phép dùng


def _increment_usage(student_id: str) -> int:
    """Tăng count lên 1, trả về count mới. Dùng upsert để an toàn khi concurrent."""
    try:
        from datetime import date
        today = date.today().isoformat()
        # Thử upsert: nếu đã có record thì tăng count, nếu chưa thì tạo mới
        existing = (
            supabase_client.table("llm_usage")
            .select("id, count")
            .eq("student_id", student_id)
            .eq("date", today)
            .execute()
        )
        if existing.data:
            new_count = existing.data[0]["count"] + 1
            supabase_client.table("llm_usage").update({"count": new_count}).eq(
                "id", existing.data[0]["id"]
            ).execute()
            return new_count
        else:
            supabase_client.table("llm_usage").insert({
                "student_id": student_id,
                "date": today,
                "count": 1,
            }).execute()
            return 1
    except Exception:
        return 1  # Nếu bảng chưa tồn tại, không block user


# ─── Problem context helper ────────────────────────────────────────────────────

def _get_problem_context(assignment_id: str) -> str:
    """Fetch the problem info attached to an assignment (including solution for AI reference)."""
    try:
        assign_resp = (
            supabase_client.table("assignments")
            .select("problem_id")
            .eq("id", assignment_id)
            .execute()
        )
        if not assign_resp.data:
            return ""
        problem_id = assign_resp.data[0]["problem_id"]
        prob_resp = (
            supabase_client.table("problems")
            .select("title, description, problem_type, choices, correct_answer, solution")
            .eq("id", problem_id)
            .execute()
        )
        if not prob_resp.data:
            return ""
        p = prob_resp.data[0]
        type_label = {
            "algorithm": "Lập trình",
            "multiple_choice": "Trắc nghiệm",
            "true_false": "Đúng/Sai",
            "essay": "Tự luận",
        }.get(p.get("problem_type", "algorithm"), "Lập trình")
        
        context = (
            f"\n\n--- BÀI TOÁN HỌC SINH ĐANG LÀM ---\n"
            f"Tiêu đề: {p['title']}\n"
            f"Loại bài: {type_label}\n"
            f"Đề bài:\n{p['description']}\n"
        )
        
        if p.get("choices"):
            context += f"Các lựa chọn: {p['choices']}\n"
            
        # Thông tin bí mật cho AI
        context += (
            f"\n[THÔNG TIN BÍ MẬT - KHÔNG TIẾT LỘ]:\n"
            f"Đáp án đúng: {p.get('correct_answer')}\n"
            f"Lời giải tham khảo: {p.get('solution')}\n"
            f"--- HẾT NGỮ CẢNH ---\n\n"
            f"Dựa vào đáp án và lời giải bí mật trên, hãy đặt câu hỏi hoặc gợi ý để học sinh tự tìm ra cách làm."
        )
        return context
    except Exception:
        return ""



# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/quota")
def get_quota(current_user=Depends(get_current_user)):
    """
    Trả về số lượt chat AI còn lại hôm nay cho học sinh.
    Giáo viên không bị giới hạn.
    """
    if current_user.user_metadata.get("role") == "teacher":
        return {"used": 0, "limit": None, "remaining": None, "is_teacher": True}

    used = _get_usage_today(str(current_user.id))
    remaining = max(0, DAILY_LIMIT - used)
    return {
        "used": used,
        "limit": DAILY_LIMIT,
        "remaining": remaining,
        "is_teacher": False,
    }


@router.post("/message")
async def chat_message(
    body: ChatRequest,
    current_user=Depends(get_current_user),
):
    """
    Student chats with AI tutor about their assignment.
    AI gives hints/guidance but never the direct answer.
    History is sent by client (stateless server).
    Enforces daily quota for students.
    """
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập câu hỏi.")

    student_id = str(current_user.id)
    is_teacher = current_user.user_metadata.get("role") == "teacher"

    # ── Quota check (students only) ────────────────────────────────────────
    if not is_teacher:
        used = _get_usage_today(student_id)
        if used >= DAILY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"Bạn đã dùng hết {DAILY_LIMIT} lượt hỏi AI hôm nay. Quay lại vào ngày mai nhé! 📅",
            )

    # Build system prompt enriched with problem context
    context = _get_problem_context(body.assignment_id)
    system_prompt = TUTOR_BASE_PROMPT + context

    # Cap history at last 10 exchanges to keep costs low
    recent_history = body.history[-10:] if len(body.history) > 10 else body.history
    messages = [{"role": m.role, "content": m.content} for m in recent_history]
    messages.append({"role": "user", "content": body.message.strip()})

    try:
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        response = await LLMProxy.chat_completion(
            messages=full_messages,
            max_tokens=600,
            temperature=0.7
        )
        reply = response["content"]

        # ── Increment usage after successful reply ─────────────────────────
        if not is_teacher:
            new_count = _increment_usage(student_id)
            remaining = max(0, DAILY_LIMIT - new_count)
            return {"reply": reply, "quota": {"used": new_count, "remaining": remaining, "limit": DAILY_LIMIT}}

        return {"reply": reply, "quota": None}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi gọi AI: {str(e)}",
        )


# ─── Lesson Chat Schemas & Router ───────────────────────────────────────────

class LessonChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    lesson_id: str
    mode: str = "giang"
    user_id: str
    stream: bool = False

@router.post("/lesson")
async def chat_lesson(req: LessonChatRequest, current_user=Depends(get_current_user)):
    """
    Interact with the Mathora AI Teacher for a specific lesson and study mode.
    Maintains a session chat in Supabase and queries DeepSeek LLM.
    Strictly adheres to: Endpoint -> Service -> Supabase client pattern.
    """
    if str(current_user.id) != req.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to act on behalf of this user")

    # 1. Fetch lesson info from DB using service
    lesson = LessonService.get_lesson_by_id(req.lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    grade = lesson.get("grade", 9)
    lesson_title = lesson.get("title", "")
    objectives = lesson.get("objectives", [])
    topic_title = lesson.get("topic_title", "")

    # 2. Build system prompt
    system_prompt = get_prompt(
        mode=req.mode,
        grade=grade,
        lesson_title=lesson_title,
        objectives=objectives,
        topic=topic_title
    )

    # 3. Format and clean messages history
    formatted_messages = []
    for msg in req.messages:
        role = msg.get("role")
        content = msg.get("content")
        # If content is a dict (AI json response format), serialize it back to string
        if isinstance(content, dict):
            content_str = json.dumps(content, ensure_ascii=False)
        else:
            content_str = str(content)
        formatted_messages.append({"role": role, "content": content_str})

    # Limit history to keep costs in check
    recent_messages = formatted_messages[-10:] if len(formatted_messages) > 10 else formatted_messages

    # Get or create the session
    session = LessonService.get_or_create_lesson_session(req.user_id, req.lesson_id, req.mode)
    session_id = session.get("id")

    # 4. If stream is requested, stream the OpenAI completions
    if req.stream:
        async def event_generator():
            full_response = ""
            async for chunk in LLMProxy.stream_deepseek_lesson(recent_messages, system_prompt):
                full_response += chunk
                yield chunk
            
            # Save the full chat conversation to session
            try:
                chat_history = req.messages.copy()
                try:
                    ai_reply = json.loads(full_response)
                except Exception:
                    ai_reply = {"display": full_response, "speak": "Bài giảng của thầy đã sẵn sàng."}
                chat_history.append({"role": "assistant", "content": ai_reply})
                LessonService.save_lesson_session_chat(session_id, chat_history)
            except Exception as e:
                logger.error(f"Error saving stream chat history: {e}")

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    
    # 5. Non-streaming call
    try:
        reply = await LLMProxy.call_deepseek_lesson(recent_messages, system_prompt)
        
        # Save session history
        chat_history = req.messages.copy()
        chat_history.append({"role": "assistant", "content": reply})
        LessonService.save_lesson_session_chat(session_id, chat_history)
        
        return {"reply": reply}
    except Exception as e:
        logger.error(f"Error during DeepSeek lesson call: {e}")
        # Return a fallback JSON response if the LLM output is not valid JSON or if call fails
        fallback_reply = {
            "speak": "Thầy xin lỗi, hệ thống đang gặp gián đoạn một chút. Thầy sẽ giải thích lại ngay.",
            "display": f"Đã xảy ra lỗi kết nối với AI Giáo Viên: {str(e)}. Vui lòng thử lại sau giây lát!",
            "steps": [],
            "question": "Em có muốn thử tải lại bài học không?"
        }
        return {"reply": fallback_reply}


@router.get("/lesson/session")
def get_lesson_session(lesson_id: str, mode: str, user_id: str, current_user=Depends(get_current_user)):
    """
    Get the existing chat history and session for a student's lesson and mode.
    """
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
    try:
        session = LessonService.get_or_create_lesson_session(user_id, lesson_id, mode)
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


