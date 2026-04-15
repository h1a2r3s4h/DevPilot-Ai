import os
print("KEY:", os.getenv("OPENROUTER_API_KEY"))  # should NOT be None
from openai import OpenAI
from app.config.settings import settings

client = OpenAI(
    api_key=settings.OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1"
)

def get_llm_response(prompt: str) -> str:
    response = client.chat.completions.create(
        model="google/gemini-2.0-flash-001", 
        messages=[
            {"role": "system", "content": "You are a helpful AI developer assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
    )
    return response.choices[0].message.content

def stream_llm_response(prompt: str):
    """Generator that yields tokens one by one."""
    response = client.chat.completions.create(
        model="google/gemini-2.0-flash-001",
        messages=[
            {"role": "system", "content": "You are a helpful AI developer assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        stream=True,
    )
    for chunk in response:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content