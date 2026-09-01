from app.tools.base_tool import BaseTool
from app.tasks.execution_tasks import execute_code_task

class CodeExecutionTool(BaseTool):
    name = "code_executor"
    description = "Execute Python code and return real output. Use to verify, test, or run generated code."

    def run(self, code: str) -> str:
        try:
            # Dispatch to Celery task execution pipeline
            task = execute_code_task.delay(code)
            res = task.get(timeout=12)
            return res.get("output", "Execution completed.")
        except Exception:
            # Fallback to inline execution if Celery broker/worker is offline
            res = execute_code_task(code)
            return res.get("output", "Execution completed.")