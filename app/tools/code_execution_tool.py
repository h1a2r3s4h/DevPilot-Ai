import subprocess
import tempfile
import os
import sys
from app.tools.base_tool import BaseTool

class CodeExecutionTool(BaseTool):
    name = "code_executor"
    description = "Execute Python code and return real output. Use to verify, test, or run generated code."

    def run(self, code: str) -> str:
        # Strip markdown fences if agent wrapped code in ```python
        code = self._clean_code(code)

        try:
            # Write to temp file
            with tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".py",
                delete=False,
                encoding="utf-8"
            ) as f:
                f.write(code)
                tmp_path = f.name

            # Run in subprocess with timeout + isolation
            result = subprocess.run(
                [sys.executable, tmp_path],
                capture_output=True,
                text=True,
                timeout=10,  # 10 second hard limit
                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
            )

            stdout = result.stdout.strip()
            stderr = result.stderr.strip()

            if result.returncode == 0:
                return f"✅ Output:\n{stdout}" if stdout else "✅ Code ran successfully with no output."
            else:
                return f"❌ Error:\n{stderr}"

        except subprocess.TimeoutExpired:
            return "❌ Execution timed out (10s limit)"
        except Exception as e:
            return f"❌ Execution failed: {str(e)}"
        finally:
            # Always clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def _clean_code(self, code: str) -> str:
        code = code.strip()
        if code.startswith("```"):
            lines = code.split("\n")
            # remove first and last fence lines
            lines = [l for l in lines if not l.strip().startswith("```")]
            code = "\n".join(lines)
        return code