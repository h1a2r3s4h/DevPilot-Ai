import subprocess
import tempfile
import os
import sys
from app.tasks.celery_app import celery_app

def clean_code(code: str) -> str:
    code = code.strip()
    if code.startswith("```"):
        lines = code.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        code = "\n".join(lines)
    return code

@celery_app.task(name="app.tasks.execution_tasks.execute_code_task")
def execute_code_task(code: str) -> dict:
    cleaned_code = clean_code(code)

    use_docker = True
    try:
        test_res = subprocess.run(["docker", "ps"], capture_output=True, timeout=2)
        if test_res.returncode != 0:
            use_docker = False
    except Exception:
        use_docker = False

    if use_docker:
        try:
            result = subprocess.run(
                [
                    "docker", "run", "--rm", "-i",
                    "--network", "none",
                    "-m", "100m",
                    "--cpus", "0.5",
                    "python:3.11-slim", "python"
                ],
                input=cleaned_code,
                capture_output=True,
                text=True,
                timeout=10
            )
            stdout = result.stdout.strip()
            stderr = result.stderr.strip()

            if result.returncode == 0:
                output_str = f"✅ Output (Sandboxed):\n{stdout}" if stdout else "✅ Code ran successfully with no output in sandbox."
                return {"status": "SUCCESS", "output": output_str, "execution_type": "sandboxed_docker"}
            else:
                return {"status": "FAILURE", "output": f"❌ Error (Sandboxed):\n{stderr}", "execution_type": "sandboxed_docker"}
        except subprocess.TimeoutExpired:
            return {"status": "FAILURE", "output": "❌ Execution timed out in sandbox (10s limit)", "execution_type": "sandboxed_docker"}
        except Exception as e:
            return {"status": "FAILURE", "output": f"❌ Sandbox execution failed: {str(e)}", "execution_type": "sandboxed_docker"}

    # Fallback execution
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
            f.write(cleaned_code)
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
            output_str = f"✅ Output (Local Fallback):\n{stdout}" if stdout else "✅ Code ran successfully with no output."
            return {"status": "SUCCESS", "output": output_str, "execution_type": "local_fallback"}
        else:
            return {"status": "FAILURE", "output": f"❌ Error (Local Fallback):\n{stderr}", "execution_type": "local_fallback"}
    except subprocess.TimeoutExpired:
        return {"status": "FAILURE", "output": "❌ Execution timed out (10s limit)", "execution_type": "local_fallback"}
    except Exception as e:
        return {"status": "FAILURE", "output": f"❌ Execution failed: {str(e)}", "execution_type": "local_fallback"}
    finally:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
