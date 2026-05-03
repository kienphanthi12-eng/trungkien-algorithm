import os
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from app.services.supabase_client import supabase_client
from app.api.dependencies import get_current_user

router = APIRouter()

# ─── System Prompt ─────────────────────────────────────────────────────────────

TUTOR_BASE_PROMPT = """Bạn là trợ lý học tập thông minh hỗ trợ học sinh Việt Nam làm bài tập.

NGUYÊN TẮC TUYỆT ĐỐI KHÔNG VI PHẠM:
- KHÔNG đưa ra đáp án trực tiếp, lời giải hoàn chỉnh, hoặc kết quả cuối cùng
- KHÔNG tiết lộ đáp án trắc nghiệm (A/B/C/D), đáp án đúng/sai, hay kết quả tính toán cuối
- Nếu học sinh hỏi thẳng "đáp án là gì?", "bằng bao nhiêu?", "chọn đáp án nào?" — từ chối nhẹ nhàng rồi gợi ý hướng suy nghĩ

CÁCH HỖ TRỢ ĐÚNG:
- Giải thích khái niệm, định lý, công thức liên quan đến bài
- Gợi ý hướng tiếp cận: "Em thử xem công thức nào áp dụng được ở đây?"
- Đặt câu hỏi dẫn dắt để học sinh tự khám phá ra cách làm
- Chỉ ra chỗ sai trong lập luận của học sinh (nếu có) mà không đưa ra lời giải đúng
- Khen ngợi, khuyến khích khi học sinh đang đi đúng hướng
- Đưa ra ví dụ tương tự (KHÁC với bài đang làm) để minh họa phương pháp

Luôn trả lời bằng tiếng Việt. Xưng "thầy/cô" với học sinh, gọi học sinh là "em".
Câu trả lời ngắn gọn, rõ ràng (tối đa 200 từ), thân thiện và kiên nhẫn."""


# ─── Schemas ───────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    assignment_id: str
    message: str
    history: List[ChatMessage] = []


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _get_problem_context(assignment_id: str) -> str:
    """Fetch the problem info attached to an assignment."""
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
            .select("title, description, problem_type")
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
        return (
            f"\n\n--- BÀI TOÁN HỌC SINH ĐANG LÀM ---\n"
            f"Tiêu đề: {p['title']}\n"
            f"Loại bài: {type_label}\n"
            f"Đề bài:\n{p['description']}\n"
            f"--- HẾT ĐỀ BÀI ---\n\n"
            f"Hãy hỗ trợ học sinh làm bài này theo nguyên tắc gợi ý ở trên."
        )
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


# ─── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/message")
async def chat_message(
    body: ChatRequest,
    current_user=Depends(get_current_user),
):
    """
    Student chats with AI tutor about their assignment.
    AI gives hints/guidance but never the direct answer.
    History is sent by client (stateless server).
    """
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Vui lòng nhập câu hỏi.")

    # Build system prompt enriched with problem context
    context = _get_problem_context(body.assignment_id)
    system_prompt = TUTOR_BASE_PROMPT + context

    # Cap history at last 10 exchanges to keep costs low
    recent_history = body.history[-10:] if len(body.history) > 10 else body.history
    messages = [{"role": m.role, "content": m.content} for m in recent_history]
    messages.append({"role": "user", "content": body.message.strip()})

    try:
        reply = await asyncio.to_thread(_call_llm_chat_sync, system_prompt, messages)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi gọi AI: {str(e)}",
        )
