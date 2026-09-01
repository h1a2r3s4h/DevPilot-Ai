import os
import time
from langsmith import traceable
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI
from app.config.settings import settings
from app.core.observability import metrics_tracker, log_tracker, trace_tracker

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
    start = time.time()
    est_tokens = len(prompt.split()) + 150
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
        duration_ms = (time.time() - start) * 1000
        content = response.choices[0].message.content
        est_resp_tokens = len(content.split()) if content else 0
        total_tokens = est_tokens + est_resp_tokens
        
        metrics_tracker.record_llm_call(tokens_estimated=total_tokens, is_error=False)
        trace_tracker.record_span(
            name="LLM Completion (openrouter/free)",
            span_type="LLM",
            duration_ms=duration_ms,
            status="SUCCESS",
            metadata={"estimated_tokens": total_tokens}
        )
        log_tracker.add_event(
            level="INFO",
            component="LLM",
            message=f"LLM completion completed in {duration_ms:.1f}ms (~{total_tokens} tokens)",
            details={"duration_ms": round(duration_ms, 2), "estimated_tokens": total_tokens}
        )
        return content
    except Exception as e:
        duration_ms = (time.time() - start) * 1000
        metrics_tracker.record_llm_call(tokens_estimated=est_tokens, is_error=True)
        trace_tracker.record_span(
            name="LLM Completion (Error)",
            span_type="LLM",
            duration_ms=duration_ms,
            status="ERROR",
            metadata={"error": str(e)}
        )
        log_tracker.add_event(
            level="ERROR",
            component="LLM",
            message=f"LLM request failed: {e}",
            details={"error": str(e)}
        )
        print(f"\n[LLM Error] API request failed: {e}\n")
        return None

def stream_llm_response(prompt: str):
    start = time.time()
    est_tokens = len(prompt.split()) + 150
    chunks_count = 0
    generated_text = ""
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
                chunks_count += 1
                generated_text += delta.content
                yield delta.content
                
        duration_ms = (time.time() - start) * 1000
        est_resp_tokens = len(generated_text.split())
        total_tokens = est_tokens + est_resp_tokens
        
        metrics_tracker.record_llm_call(tokens_estimated=total_tokens, is_error=False)
        trace_tracker.record_span(
            name="LLM Streaming Generation",
            span_type="LLM",
            duration_ms=duration_ms,
            status="SUCCESS",
            metadata={"chunks_yielded": chunks_count, "estimated_tokens": total_tokens}
        )
        log_tracker.add_event(
            level="INFO",
            component="LLM",
            message=f"LLM Stream completed ({chunks_count} chunks, {duration_ms:.1f}ms, ~{total_tokens} tokens)",
            details={"duration_ms": round(duration_ms, 2), "chunks": chunks_count, "tokens": total_tokens}
        )
    except Exception as e:
        duration_ms = (time.time() - start) * 1000
        metrics_tracker.record_llm_call(tokens_estimated=est_tokens, is_error=True)
        trace_tracker.record_span(
            name="LLM Stream (Error)",
            span_type="LLM",
            duration_ms=duration_ms,
            status="ERROR",
            metadata={"error": str(e)}
        )
        log_tracker.add_event(
            level="ERROR",
            component="LLM",
            message=f"LLM API Stream failed: {e}",
            details={"error": str(e)}
        )
        print(f"\n[LLM Stream Error] API stream failed: {e}\n")
        yield f"\n❌ API Error: {e}\n"




