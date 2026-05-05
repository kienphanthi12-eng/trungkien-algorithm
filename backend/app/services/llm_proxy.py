import os
import logging
import httpx
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class LLMProxy:
    """
    Gateway trung tâm xử lý gọi API các LLM (DeepSeek, Gemini).
    Hỗ trợ fallback tự động và tính toán chi phí (cost) cơ bản.
    """

    PRICING = {
        # Giá mỗi 1 triệu token
        "deepseek-chat": {"input": 0.14, "output": 0.28},
        "gemini-1.5-flash": {"input": 0.075, "output": 0.30}, # Tham khảo, có thể cập nhật
    }

    @staticmethod
    async def chat_completion(
        messages: List[Dict[str, str]], 
        model_preference: List[str] = ["deepseek-chat", "gemini-1.5-flash"],
        temperature: float = 0.7,
        max_tokens: int = 800,
        response_format: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Gửi yêu cầu chat completion. Tự động fallback qua các model trong `model_preference`.
        :param messages: List dạng [{"role": "system"/"user", "content": "..."}]
        :return: Dict chứa:
            - "content": str (nội dung trả về)
            - "model": str (model đã sử dụng thành công)
            - "cost": float (ước tính chi phí)
            - "usage": dict (thông tin token)
        """
        errors = []
        for model in model_preference:
            try:
                if "deepseek" in model.lower():
                    return await LLMProxy._call_deepseek(messages, model, temperature, max_tokens, response_format)
                elif "gemini" in model.lower():
                    return await LLMProxy._call_gemini_text(messages, model, temperature, max_tokens)
                else:
                    logger.warning(f"Model {model} chưa được hỗ trợ.")
            except Exception as e:
                logger.error(f"Lỗi gọi model {model}: {e}")
                errors.append(f"{model}: {e}")
        
        raise RuntimeError(f"Tất cả LLM đều thất bại. Chi tiết: {' | '.join(errors)}")

    @staticmethod
    async def vision_completion(
        image_b64: str, 
        prompt: str,
        model: str = "gemini-1.5-flash",
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        """
        Gọi Vision model (Gemini).
        """
        if "gemini" in model.lower():
            return await LLMProxy._call_gemini_vision(image_b64, prompt, model, temperature)
        raise ValueError(f"Vision model {model} chưa được hỗ trợ.")

    # ─── DeepSeek Implementation ──────────────────────────────────────────────────

    @staticmethod
    async def _call_deepseek(messages: List[Dict[str, str]], model: str, temperature: float, max_tokens: int, response_format: Optional[Dict]) -> Dict[str, Any]:
        api_key = os.environ.get("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("Chưa cấu hình DEEPSEEK_API_KEY")

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            payload["response_format"] = response_format

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload
            )
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        cost = LLMProxy._calculate_cost(model, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0))

        return {
            "content": content,
            "model": model,
            "cost": cost,
            "usage": usage
        }

    # ─── Gemini Implementation ────────────────────────────────────────────────────

    @staticmethod
    def _convert_messages_to_gemini(messages: List[Dict[str, str]]):
        """Chuyển đổi format từ OpenAI (role/content) sang Gemini (contents/parts)."""
        system_instruction = None
        contents = []
        
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                system_instruction = {"parts": [{"text": content}]}
            else:
                gemini_role = "user" if role == "user" else "model"
                contents.append({
                    "role": gemini_role,
                    "parts": [{"text": content}]
                })
        return contents, system_instruction

    @staticmethod
    async def _call_gemini_text(messages: List[Dict[str, str]], model: str, temperature: float, max_tokens: int) -> Dict[str, Any]:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Chưa cấu hình GEMINI_API_KEY")

        contents, system_instruction = LLMProxy._convert_messages_to_gemini(messages)
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens
            }
        }
        if system_instruction:
            payload["systemInstruction"] = system_instruction

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        try:
            content = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise ValueError(f"Phản hồi từ Gemini không hợp lệ: {data}")

        usage_meta = data.get("usageMetadata", {})
        prompt_tokens = usage_meta.get("promptTokenCount", 0)
        completion_tokens = usage_meta.get("candidatesTokenCount", 0)
        cost = LLMProxy._calculate_cost(model, prompt_tokens, completion_tokens)

        return {
            "content": content,
            "model": model,
            "cost": cost,
            "usage": usage_meta
        }

    @staticmethod
    async def _call_gemini_vision(image_b64: str, prompt: str, model: str, temperature: float) -> Dict[str, Any]:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Chưa cấu hình GEMINI_API_KEY")

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/png",
                                "data": image_b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": temperature
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        try:
            content = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise ValueError(f"Phản hồi Vision từ Gemini không hợp lệ: {data}")

        usage_meta = data.get("usageMetadata", {})
        cost = LLMProxy._calculate_cost(model, usage_meta.get("promptTokenCount", 0), usage_meta.get("candidatesTokenCount", 0))

        return {
            "content": content,
            "model": model,
            "cost": cost,
            "usage": usage_meta
        }

    # ─── Utility ──────────────────────────────────────────────────────────────────

    @staticmethod
    def _calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """Tính toán chi phí dựa trên token."""
        rates = LLMProxy.PRICING.get(model)
        if not rates:
            return 0.0
        return (prompt_tokens / 1_000_000) * rates["input"] + (completion_tokens / 1_000_000) * rates["output"]

