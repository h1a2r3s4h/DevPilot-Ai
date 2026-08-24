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

        # Check if Docker is available
        use_docker = True
        try:
            # Quick check if docker is running
            test_res = subprocess.run(["docker", "ps"], capture_output=True, timeout=2)
            if test_res.returncode != 0:
                use_docker = False
        except Exception:
            use_docker = False

        if use_docker:
            try:
                # Run inside Docker with CPU/Memory limits and no network access
                result = subprocess.run(
                    [
                        "docker", "run", "--rm", "-i",
                        "--network", "none",
                        "-m", "100m",
                        "--cpus", "0.5",
                        "python:3.11-slim", "python"
                    ],
                    input=code,
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                stdout = result.stdout.strip()
                stderr = result.stderr.strip()

                if result.returncode == 0:
                    return f"✅ Output (Sandboxed):\n{stdout}" if stdout else "✅ Code ran successfully with no output in sandbox."
                else:
                    return f"❌ Error (Sandboxed):\n{stderr}"
            except subprocess.TimeoutExpired:
                return "❌ Execution timed out in sandbox (10s limit)"
            except Exception as e:
                return f"❌ Sandbox execution failed: {str(e)}"

        # Fallback to local subprocess execution if Docker is not running
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".py",
                delete=False,
                encoding="utf-8"
            ) as f:
                f.write(code)
                tmp_path = f.name

            result = subprocess.run(
                [sys.executable, tmp_path],
                capture_output=True,
                text=True,
                timeout=10,
                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
            )

            stdout = result.stdout.strip()
            stderr = result.stderr.strip()

            if result.returncode == 0:
                return f"✅ Output (Local Fallback):\n{stdout}" if stdout else "✅ Code ran successfully with no output."
            else:
                return f"❌ Error (Local Fallback):\n{stderr}"

        except subprocess.TimeoutExpired:
            return "❌ Execution timed out (10s limit)"
        except Exception as e:
            return f"❌ Execution failed: {str(e)}"
        finally:
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)

    def _clean_code(self, code: str) -> str:
        code = code.strip()
        if code.startswith("```"):
            lines = code.split("\n")
            # remove first and last fence lines
            lines = [l for l in lines if not l.strip().startswith("```")]
            code = "\n".join(lines)
        return code