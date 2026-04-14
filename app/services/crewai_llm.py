from crewai.llms.base_llm import BaseLLM
from app.services.llm_provider import get_llm_response
from typing import Any

class CustomLLM(BaseLLM):
    model: str = "openrouter/custom"

    def call(
        self,
        messages,
        tools=None,
        callbacks=None,
        available_functions=None,
        from_task=None,
        from_agent=None,
        response_model=None,
    ) -> str:
        if isinstance(messages, list):
            prompt = messages[-1].get("content", "") if messages else ""
        else:
            prompt = messages
        return get_llm_response(prompt)

    async def acall(
        self,
        messages,
        tools=None,
        callbacks=None,
        available_functions=None,
        from_task=None,
        from_agent=None,
        response_model=None,
    ) -> str:
        return self.call(messages)