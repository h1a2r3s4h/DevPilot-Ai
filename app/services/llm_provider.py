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

SYSTEM_PROMPT = """You are DevPilot AI, an elite software engineer and codebase assistant.
You analyze real-world codebases with context-aware precision.

Core Operational Rules:
- Answer ONLY what the user asked. Keep answers focused, proportional, and directly relevant to the question.
- Do NOT provide unsolicited boilerplate, unrequested architectural essays, or filler sections for simple or specific questions.
- Never use robotic preambles (e.g. NEVER start with "Based on the provided repository context...").
- ONLY include a Mermaid flowchart when explicitly requested (e.g. "draw a diagram", "show flowchart", "architecture map") or when explaining multi-step system workflows where a visual diagram is genuinely needed.
- When generating Mermaid diagrams, follow strict syntax: use '-->' for arrows (never '->') and quote all node labels inside brackets: NodeId["Label"].
- Ground all code explanations with exact file paths (`app/...`, `ui/...`) from the repository.
- Ensure all generated code is production-ready, typed, and fully self-contained.
"""

@traceable(name="LLM Generation")
def get_llm_response(prompt: str, model: str | None = None) -> str:
    start = time.time()
    est_tokens = len(prompt.split()) + 150
    chosen_model = model or "openrouter/free"
    try:
        response = client.chat.completions.create(
            model=chosen_model,
            max_tokens=4096,
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
            name=f"LLM Completion ({chosen_model})",
            span_type="LLM",
            duration_ms=duration_ms,
            status="SUCCESS",
            metadata={"estimated_tokens": total_tokens, "model": chosen_model}
        )
        log_tracker.add_event(
            level="INFO",
            component="LLM",
            message=f"LLM completion ({chosen_model}) completed in {duration_ms:.1f}ms (~{total_tokens} tokens)",
            details={"duration_ms": round(duration_ms, 2), "estimated_tokens": total_tokens, "model": chosen_model}
        )
        return content
    except Exception as e:
        duration_ms = (time.time() - start) * 1000
        metrics_tracker.record_llm_call(tokens_estimated=est_tokens, is_error=True)
        trace_tracker.record_span(
            name=f"LLM Completion (Error - {chosen_model})",
            span_type="LLM",
            duration_ms=duration_ms,
            status="ERROR",
            metadata={"error": str(e), "model": chosen_model}
        )
        log_tracker.add_event(
            level="ERROR",
            component="LLM",
            message=f"LLM request failed ({chosen_model}): {e}",
            details={"error": str(e), "model": chosen_model}
        )
        print(f"\n[LLM Error] API request failed: {e}\n")
        return None

def stream_llm_response(prompt: str, model: str | None = None):
    start = time.time()
    est_tokens = len(prompt.split()) + 150
    chunks_count = 0
    generated_text = ""
    chosen_model = model or "openrouter/free"
    try:
        response = client.chat.completions.create(
            model=chosen_model,
            max_tokens=4096,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            stream=True,
        )
        for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            if delta and delta.content:
                chunks_count += 1
                generated_text += delta.content
                yield delta.content

        # If reasoning model consumed tokens without emitting content in stream, fallback to direct completion
        if chunks_count == 0:
            direct_reply = get_llm_response(prompt, model=chosen_model)
            if direct_reply:
                yield direct_reply
                
        duration_ms = (time.time() - start) * 1000
        est_resp_tokens = len(generated_text.split())
        total_tokens = est_tokens + est_resp_tokens
        
        metrics_tracker.record_llm_call(tokens_estimated=total_tokens, is_error=False)
        trace_tracker.record_span(
            name=f"LLM Streaming ({chosen_model})",
            span_type="LLM",
            duration_ms=duration_ms,
            status="SUCCESS",
            metadata={"chunks_yielded": chunks_count, "estimated_tokens": total_tokens, "model": chosen_model}
        )
        log_tracker.add_event(
            level="INFO",
            component="LLM",
            message=f"LLM Stream ({chosen_model}) completed ({chunks_count} chunks, {duration_ms:.1f}ms, ~{total_tokens} tokens)",
            details={"duration_ms": round(duration_ms, 2), "chunks": chunks_count, "tokens": total_tokens, "model": chosen_model}
        )
    except Exception as e:
        duration_ms = (time.time() - start) * 1000
        metrics_tracker.record_llm_call(tokens_estimated=est_tokens, is_error=True)
        trace_tracker.record_span(
            name=f"LLM Stream (Error - {chosen_model})",
            span_type="LLM",
            duration_ms=duration_ms,
            status="ERROR",
            metadata={"error": str(e), "model": chosen_model}
        )
        log_tracker.add_event(
            level="ERROR",
            component="LLM",
            message=f"LLM API Stream failed ({chosen_model}): {e}",
            details={"error": str(e), "model": chosen_model}
        )
        print(f"\n[LLM Stream Error] API stream failed: {e}\n")
        yield f"\n❌ API Error: {e}\n"




