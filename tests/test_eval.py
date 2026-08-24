import time
import json
from app.services.llm_provider import get_llm_response
from app.services.rag_service import query_rag

# Standard benchmark queries for DevPilot codebase
TEST_CASES = [
    {
        "query": "How is the workspace file watcher implemented?",
        "expected_mention": "watcher_service"
    },
    {
        "query": "What database or vector index does the RAG service use?",
        "expected_mention": "FAISS"
    },
    {
        "query": "Explain the role of the debugger agent in the multi-agent system.",
        "expected_mention": "bug"
    },
    {
        "query": "How does the Redis caching layer work?",
        "expected_mention": "cache"
    }
]

def evaluate_rag():
    print("==================================================")
    print("🚀 STARTING AUTOMATED RAG EVALUATION BENCHMARK")
    print("==================================================\n")

    results = []

    for idx, case in enumerate(TEST_CASES):
        print(f"[{idx+1}/{len(TEST_CASES)}] Evaluating query: '{case['query']}'")
        
        # 1. Measure retrieval latency
        start_time = time.time()
        context = query_rag(case['query'])
        if context is None:
            context = ""
        retrieval_latency = (time.time() - start_time) * 1000
        
        # 2. Get LLM response using context
        prompt = f"""You are DevPilot AI. Use the context to answer.
Context:
{context}

Question: {case['query']}
"""
        answer_start = time.time()
        answer = get_llm_response(prompt)
        if answer is None:
            answer = ""
        generation_latency = (time.time() - answer_start) * 1000

        # 3. LLM-as-a-judge evaluation
        eval_prompt = f"""
You are an expert AI quality inspector. Compare the Answer against the Context to evaluate RAG Faithfulness.
Faithfulness definition: The answer contains ONLY facts directly mentioned in the Context, without hallucinated details or assumptions.

Context:
{context}

Answer:
{answer}

Output ONLY a JSON block with two fields:
{{
  "score": <digit 1 to 5>,
  "reason": "<brief 1-sentence critique>"
}}

JSON output:
"""
        eval_raw = get_llm_response(eval_prompt)
        
        # Parse score and reason
        score = "N/A"
        reason = "Could not retrieve evaluation from LLM (empty response)"
        
        if eval_raw:
            try:
                clean = eval_raw.strip().replace("```json", "").replace("```", "").strip()
                data = json.loads(clean)
                score = data.get("score", "N/A")
                reason = data.get("reason", "N/A")
            except Exception:
                # fallback string parsing
                for val in ["5", "4", "3", "2", "1"]:
                    if val in eval_raw:
                        score = val
                        reason = eval_raw.strip()[:100] + "..."
                        break

        results.append({
            "query": case['query'],
            "score": score,
            "reason": reason,
            "retrieval_time": retrieval_latency,
            "generation_time": generation_latency
        })

    # Output report
    print("\n==================================================")
    print("📊 EVALUATION SUMMARY REPORT")
    print("==================================================\n")
    
    total_score = 0
    valid_scores = 0
    for r in results:
        print(f"Query: {r['query']}")
        print(f"└─ Score: {r['score']}/5 | Latency: Retrieval {r['retrieval_time']:.1f}ms | Gen {r['generation_time']:.1f}ms")
        print(f"└─ Judge Verdict: {r['reason']}")
        print("-" * 50)
        try:
            total_score += int(r['score'])
            valid_scores += 1
        except Exception:
            pass

    if valid_scores > 0:
        avg_score = total_score / valid_scores
        print(f"\n📈 Average Faithfulness Score: {avg_score:.2f}/5.00")
        if avg_score >= 4.0:
            print("Status: ✅ PASS - High faithfulness, zero or minimal hallucinations detected.")
        else:
            print("Status: ⚠️ WARNING - Quality score below benchmark. Check RAG chunk overlap/retrieval filters.")
    print("==================================================")

if __name__ == "__main__":
    evaluate_rag()
