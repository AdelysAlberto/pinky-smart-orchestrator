"""FastAPI Server, WebSocket Hub, and Telemetry Broadcaster."""

import asyncio
from pathlib import Path
from typing import Any
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from orchestrator.config import config
from orchestrator.models import DecisionPayload, Task
from orchestrator.queue_engine import QueueEngine

app = FastAPI(title="Pinky Smart Orchestrator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict[str, Any]):
        for conn in list(self.active_connections):
            try:
                await conn.send_json(message)
            except Exception:
                self.disconnect(conn)


manager = ConnectionManager()


async def on_engine_event(event_type: str, data: dict[str, Any]):
    await manager.broadcast({"event": event_type, **data})


queue_engine = QueueEngine(on_event=on_engine_event)


# Background worker loop
async def worker_loop():
    while True:
        try:
            task = await queue_engine.run_next_task()
            if not task:
                await asyncio.sleep(0.5)
        except Exception as e:
            await asyncio.sleep(1.0)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(worker_loop())


class EnqueueRequest(BaseModel):
    prompt: str
    harness: str | None = None


@app.post("/api/tasks", response_model=Task)
async def create_task(req: EnqueueRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    task = queue_engine.enqueue(req.prompt, req.harness)
    await manager.broadcast({"event": "task_enqueued", "task": task.model_dump()})
    return task


@app.get("/api/tasks", response_model=list[Task])
async def list_tasks():
    return queue_engine.list_tasks()


@app.get("/api/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    task = queue_engine.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/api/tasks/{task_id}/decision")
async def submit_decision(task_id: str, payload: DecisionPayload):
    approved = payload.action.lower() in ("approve", "yes", "s", "si")
    resolved = queue_engine.decision_hub.resolve(task_id, approved)
    if not resolved:
        raise HTTPException(status_code=400, detail="No pending decision for this task")
    return {"status": "ok", "approved": approved}


@app.post("/api/queue/pause")
async def pause_queue():
    queue_engine.pause_queue()
    await manager.broadcast({"event": "queue_paused"})
    return {"status": "paused"}


@app.post("/api/queue/resume")
async def resume_queue():
    queue_engine.resume_queue()
    await manager.broadcast({"event": "queue_resumed"})
    return {"status": "resumed"}


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial state
        tasks = queue_engine.list_tasks()
        await websocket.send_json({
            "event": "init",
            "tasks": [t.model_dump() for t in tasks],
        })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# Mount static files for dashboard
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    @app.get("/")
    async def index():
        return FileResponse(static_dir / "index.html")
