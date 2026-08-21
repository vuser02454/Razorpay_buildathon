import os
import json
import httpx
from typing import Dict, Any, Optional, List
from app.core.config import settings

class OpenRouterService:
    """
    OpenRouter Multi-Model Reasoning & Fallback AI Service for RecoverAI.
    Acts as a secondary intelligence layer for advanced analysis, model comparison,
    and automatic failover when primary Gemini endpoints are unavailable.
    """

    @classmethod
    async def chat_completion(
        cls,
        messages: List[Dict[str, str]],
        model: str = "meta-llama/llama-3.3-70b-instruct",
        temperature: float = 0.2,
        max_tokens: int = 800
    ) -> Optional[str]:
        api_key = settings.OPENROUTER_API_KEY or os.getenv("OPENROUTER_API_KEY", "")
        if not api_key:
            return None

        try:
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "http://localhost:5175",
                "X-Title": "RecoverAI",
                "Content-Type": "application/json"
            }
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    if content and content.strip():
                        return content.strip()
                else:
                    print(f"[OpenRouterService] API returned status {resp.status_code}: {resp.text}")
                    return None
        except Exception as e:
            print(f"[OpenRouterService] Request failed: {e}")
            return None

    @classmethod
    async def advanced_reasoning(cls, prompt: str, system_context: Optional[str] = None) -> Optional[str]:
        """
        Runs deep comparative reasoning or strategic revenue recovery analysis.
        """
        messages = []
        if system_context:
            messages.append({"role": "system", "content": system_context})
        messages.append({"role": "user", "content": prompt})

        return await cls.chat_completion(
            messages=messages,
            model="meta-llama/llama-3.3-70b-instruct",
            temperature=0.2,
            max_tokens=1000
        )
