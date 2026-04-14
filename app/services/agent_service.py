import requests
import os
from dotenv import load_dotenv
from app.memory.memory_service import MemoryService

load_dotenv()
API_KEY = os.getenv("OPENROUTER_API_KEY")

memory_service = MemoryService()


def ask_llm(user_id: str, session_id: str, user_query: str):
    url = "https://openrouter.ai/api/v1/chat/completions"

    # 🔥 1. GET MEMORY CONTEXT
    memory_context = memory_service.get_context(
        user_id=user_id,
        session_id=session_id,
        query=user_query
    )

    short_mem = memory_context["short_term"]
    long_mem = memory_context["long_term"]

    # 🔥 2. FORMAT MEMORY
    short_text = "\n".join([m.content for m in short_mem])

    long_text = "\n".join([
        m["text"] for m in long_mem
    ])

    # 🔥 3. BUILD ENHANCED PROMPT
    enhanced_prompt = f"""
You are an AI developer assistant.

Previous conversation:
{short_text}

Relevant past knowledge:
{long_text}

User Query:
{user_query}
"""

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "DevPilot AI",
        "Content-Type": "application/json"
    }

    data = {
        "model": "google/gemini-2.0-flash-001",
        "messages": [
            {"role": "user", "content": enhanced_prompt}
        ]
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        res = response.json()

        if "choices" not in res:
            return {"error": res}

        output = res["choices"][0]["message"]["content"]

        # 🔥 4. STORE MEMORY
        memory_service.store_interaction(user_id, session_id, "user", user_query)
        memory_service.store_interaction(user_id, session_id, "assistant", output)

        return output

    except Exception as e:
        return {"error": str(e)}