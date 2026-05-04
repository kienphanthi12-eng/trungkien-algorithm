import os
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user

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



def _call_llm_chat_sync(system_prompt: str, messages: list) -> str:
    """Call DeepSeek (primary) or Anthropic (fallback). Sync, called via asyncio.to_thread."""
    import httpx

    # 1. Try DeepSeek
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if api_key:
        try:
            resp = httpx.post(
                "https://api.deepseek.com/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "system", "content": system_prompt}] + messages,
                    "max_tokens": 600,
                    "temperature": 0.7,
                },
                timeout=30.0,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    # 2. Fallback: Anthropic Claude Haiku
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if api_key:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=600,
            system=system_prompt,
            messages=messages,
        )
        return msg.content[0].text.strip()

    raise ValueError("Chưa cấu hình DEEPSEEK_API_KEY hoặc ANTHROPIC_API_KEY.")


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
        reply = await asyncio.to_thread(_call_llm_chat_sync, system_prompt, messages)

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
