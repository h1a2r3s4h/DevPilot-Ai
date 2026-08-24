import os
from langsmith import traceable
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI
from app.config.settings import settings

client = OpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1"
)





SYSTEM_PROMPT = """You are DevPilot AI, an expert developer assistant.
You are given relevant code context retrieved from a codebase.
Rules:
- Answer clearly and concisely using the context provided
- Use proper markdown formatting (headers, code blocks, bullet points)
- NEVER repeat file paths, metadata, or source annotations in your answer
- NEVER say "Based on the provided repository context" — just answer directly
- If the context doesn't contain the answer, say so honestly
"""
@traceable(name="LLM Generation")
def get_llm_response(prompt: str) -> str:
    try:
        response = client.chat.completions.create(
            model="openrouter/free",
            max_tokens=1024,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"\n[LLM Error] API request failed: {e}\n")
        return None

def stream_llm_response(prompt: str):
    try:
        response = client.chat.completions.create(
            model="openrouter/free",
            max_tokens=1024,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            stream=True,
        )
        for chunk in response:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content
    except Exception as e:
        print(f"\n[LLM Stream Error] API stream failed: {e}\n")
        yield f"\n❌ API Error: {e}\n"



