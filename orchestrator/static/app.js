const ansi_up = new AnsiUp();
let ws = null;
let currentTaskId = null;
let tasks = [];
let isPaused = false;

function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${window.location.host}/ws/telemetry`);

  ws.onopen = () => {
    document.getElementById("connection-status").textContent = "Conectado";
    document.getElementById("connection-status").className = "text-xs text-emerald-400 font-mono";
  };

  ws.onclose = () => {
    document.getElementById("connection-status").textContent = "Desconectado (Reintentando...)";
    document.getElementById("connection-status").className = "text-xs text-rose-400 font-mono";
    setTimeout(initWebSocket, 2000);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleSocketEvent(msg);
    } catch (e) {
      console.error("Error parsing websocket message:", e);
    }
  };
}

function handleSocketEvent(msg) {
  const terminal = document.getElementById("terminal-view");

  switch (msg.event) {
    case "init":
      tasks = msg.tasks || [];
      renderTaskList();
      break;

    case "task_enqueued":
      tasks.push(msg.task);
      renderTaskList();
      break;

    case "task_started":
      currentTaskId = msg.task.id;
      updateTask(msg.task);
      renderTaskList();
      terminal.innerHTML = "";
      document.getElementById("active-agent-badge").textContent = `Tarea activa: ${msg.task.id}`;
      break;

    case "step_started":
      document.getElementById("active-agent-badge").textContent = `Agente: @${msg.step.agent_name} (${msg.step.harness})`;
      break;

    case "log_chunk":
      if (msg.task_id === currentTaskId) {
        const htmlChunk = ansi_up.ansi_to_html(msg.chunk);
        terminal.innerHTML += htmlChunk;
        terminal.scrollTop = terminal.scrollHeight;
      }
      break;

    case "awaiting_approval":
      if (msg.task_id === currentTaskId) {
        document.getElementById("gate-banner").classList.remove("hidden");
        if (msg.plan) {
          document.getElementById("markdown-view").innerHTML = marked.parse(msg.plan);
        }
      }
      break;

    case "task_completed":
    case "task_failed":
    case "task_cancelled":
      document.getElementById("gate-banner").classList.add("hidden");
      refreshTasks();
      break;

    case "queue_paused":
      isPaused = true;
      updatePauseButton();
      break;

    case "queue_resumed":
      isPaused = false;
      updatePauseButton();
      break;
  }
}

function updateTask(updated) {
  const idx = tasks.findIndex((t) => t.id === updated.id);
  if (idx >= 0) {
    tasks[idx] = updated;
  } else {
    tasks.push(updated);
  }
}

async function refreshTasks() {
  try {
    const res = await fetch("/api/tasks");
    if (res.ok) {
      tasks = await res.json();
      renderTaskList();
    }
  } catch (e) {}
}

function renderTaskList() {
  const listEl = document.getElementById("task-list");
  listEl.innerHTML = "";

  if (tasks.length === 0) {
    listEl.innerHTML = `<div class="text-xs text-slate-500 italic text-center py-4">No hay tareas en cola</div>`;
    return;
  }

  tasks.forEach((t) => {
    const card = document.createElement("div");
    const isSelected = t.id === currentTaskId;
    card.className = `p-3 rounded border text-xs cursor-pointer transition ${
      isSelected
        ? "bg-slate-800/80 border-indigo-500 shadow-sm"
        : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
    }`;

    let statusBadge = "";
    switch (t.status) {
      case "RUNNING":
        statusBadge = `<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">RUNNING</span>`;
        break;
      case "AWAITING_APPROVAL":
        statusBadge = `<span class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">APROBACIÓN</span>`;
        break;
      case "COMPLETED":
        statusBadge = `<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">COMPLETED</span>`;
        break;
      case "FAILED":
        statusBadge = `<span class="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">FAILED</span>`;
        break;
      default:
        statusBadge = `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">QUEUED</span>`;
    }

    card.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <span class="font-bold text-slate-200">${t.id}</span>
        ${statusBadge}
      </div>
      <p class="text-slate-400 line-clamp-2 mb-2">${t.prompt}</p>
      <div class="flex items-center space-x-2 text-[10px] text-slate-500">
        <span>Scope: ${t.scope}</span>
        <span>•</span>
        <span>Harness: ${t.harness}</span>
      </div>
    `;

    card.onclick = () => selectTask(t);
    listEl.appendChild(card);
  });
}

function selectTask(t) {
  currentTaskId = t.id;
  renderTaskList();
  if (t.plan_content) {
    document.getElementById("markdown-view").innerHTML = marked.parse(t.plan_content);
  }
}

async function submitTask() {
  const input = document.getElementById("task-input");
  const harness = document.getElementById("harness-select").value;
  const prompt = input.value.trim();
  if (!prompt) return;

  try {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, harness }),
    });
    if (res.ok) {
      input.value = "";
    }
  } catch (e) {
    console.error("Error submitting task:", e);
  }
}

async function submitDecision(approved) {
  if (!currentTaskId) return;
  try {
    await fetch(`/api/tasks/${currentTaskId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: approved ? "approve" : "reject" }),
    });
    document.getElementById("gate-banner").classList.add("hidden");
  } catch (e) {
    console.error("Error submitting decision:", e);
  }
}

async function togglePause() {
  const endpoint = isPaused ? "/api/queue/resume" : "/api/queue/pause";
  try {
    await fetch(endpoint, { method: "POST" });
  } catch (e) {}
}

function updatePauseButton() {
  const btn = document.getElementById("btn-pause");
  if (isPaused) {
    btn.textContent = "Reanudar Cola";
    btn.className = "px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-600/40 transition";
  } else {
    btn.textContent = "Pausar Cola";
    btn.className = "px-3 py-1.5 text-xs font-semibold rounded bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-600/40 transition";
  }
}

function switchTab(tab) {
  const termView = document.getElementById("terminal-view");
  const mdView = document.getElementById("markdown-view");
  const termBtn = document.getElementById("tab-terminal-btn");
  const planBtn = document.getElementById("tab-plan-btn");

  if (tab === "terminal") {
    termView.classList.remove("hidden");
    mdView.classList.add("hidden");
    termBtn.className = "font-semibold text-indigo-400 border-b-2 border-indigo-500 pb-2.5";
    planBtn.className = "text-slate-400 hover:text-slate-200 pb-2.5";
  } else {
    termView.classList.add("hidden");
    mdView.classList.remove("hidden");
    planBtn.className = "font-semibold text-indigo-400 border-b-2 border-indigo-500 pb-2.5";
    termBtn.className = "text-slate-400 hover:text-slate-200 pb-2.5";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initWebSocket();
  refreshTasks();
});
