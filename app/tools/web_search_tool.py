import os
import requests
from typing import Any
from app.tools.base_tool import BaseTool

class WebSearchTool(BaseTool):
    name = "web_search"
    description = "Search the live web for external Python, framework, or library documentation when local codebase context is insufficient."

    def run(self, query: str) -> str:
        query = query.strip()
        if not query:
            return "❌ Query string cannot be empty."

        # 1. Try Tavily API if TAVILY_API_KEY is configured
        tavily_key = os.getenv("TAVILY_API_KEY")
        if tavily_key:
            try:
                res = requests.post(
                    "https://api.tavily.com/search",
                    json={"api_key": tavily_key, "query": query, "max_results": 4},
                    timeout=8
                )
                if res.status_code == 200:
                    data = res.json()
                    results = data.get("results", [])
                    if results:
                        formatted = []
                        for r in results:
                            formatted.append(f"### [{r.get('title')}]({r.get('url')})\n{r.get('content')}")
                        return "\n\n---\n\n".join(formatted)
            except Exception:
                pass  # Fallback to zero-config DDGS

        # 2. Zero-Config Free DuckDuckGo Search (via ddgs)
        try:
            from ddgs import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=4))
                if results:
                    formatted = []
                    for r in results:
                        title = r.get("title", "No Title")
                        href = r.get("href", "#")
                        body = r.get("body", "")
                        formatted.append(f"### [{title}]({href})\n{body}")
                    return "\n\n---\n\n".join(formatted)
        except Exception:
            # Fallback import if ddgs package legacy name duckduckgo_search is present
            try:
                from duckduckgo_search import DDGS
                with DDGS() as ddgs:
                    results = list(ddgs.text(query, max_results=4))
                    if results:
                        formatted = []
                        for r in results:
                            title = r.get("title", "No Title")
                            href = r.get("href", "#")
                            body = r.get("body", "")
                            formatted.append(f"### [{title}]({href})\n{body}")
                        return "\n\n---\n\n".join(formatted)
            except Exception as e:
                return f"❌ Web search failed: {str(e)}"

        return "No web search results found for the query."
