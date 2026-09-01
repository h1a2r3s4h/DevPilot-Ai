from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from celery.result import AsyncResult
from app.tasks.execution_tasks import execute_code_task
from app.tasks.celery_app import celery_app

router = APIRouter(prefix="/api/execute", tags=["Execution"])

class ExecutionRequest(BaseModel):
    code: str

@router.post("/async")
def execute_code_async(request: ExecutionRequest):
    """Enqueue code execution asynchronously into Celery task queue."""
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code payload cannot be empty.")
    
    task = execute_code_task.delay(request.code)
    return {
        "task_id": task.id,
        "status": "PENDING",
        "message": "Task successfully enqueued for sandboxed execution."
    }

@router.get("/status/{task_id}")
def get_execution_status(task_id: str):
    """Poll execution task status and retrieve results once completed."""
    result = AsyncResult(task_id, app=celery_app)
    
    response = {
        "task_id": task_id,
        "status": result.status,
    }

    if result.ready():
        if result.successful():
            response["result"] = result.result
        else:
            response["error"] = str(result.result)

    return response

@router.post("/sync")
def execute_code_sync(request: ExecutionRequest):
    """Synchronously execute code (waits for sandbox output)."""
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code payload cannot be empty.")
    
    res = execute_code_task(request.code)
    return res
