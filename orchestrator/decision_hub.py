"""Decision Hub: Multiplexed human-in-the-loop approval across CLI and Web Dashboard."""

import asyncio
import sys


class DecisionHub:
    """Coordinates approval gates concurrently across terminal stdin and HTTP/WebSocket API."""

    def __init__(self):
        self._pending_decisions: dict[str, asyncio.Future[bool]] = {}

    def is_waiting(self, task_id: str) -> bool:
        return task_id in self._pending_decisions and not self._pending_decisions[task_id].done()

    def resolve(self, task_id: str, approved: bool) -> bool:
        """Called by Web API or external event to approve/reject a pending gate."""
        fut = self._pending_decisions.get(task_id)
        if fut and not fut.done():
            fut.set_result(approved)
            return True
        return False

    async def _read_cli_input(self, prompt_text: str) -> bool:
        """Async reader for terminal stdin without blocking the event loop."""
        loop = asyncio.get_event_loop()
        sys.stdout.write(prompt_text)
        sys.stdout.flush()

        def _input_reader():
            try:
                line = sys.stdin.readline()
                return line.strip().lower() in ("s", "y", "yes", "si", "")
            except Exception:
                return False

        return await loop.run_in_executor(None, _input_reader)

    async def wait_for_decision(
        self,
        task_id: str,
        plan_path: str,
        enable_cli_prompt: bool = True,
    ) -> bool:
        """Wait for human decision from either the terminal or the Web Dashboard."""
        loop = asyncio.get_event_loop()
        decision_future: asyncio.Future[bool] = loop.create_future()
        self._pending_decisions[task_id] = decision_future

        cli_task = None
        if enable_cli_prompt and sys.stdin.isatty():
            prompt_str = f"\n[?] Plan generado en {plan_path}. ¿Aprobar y ejecutar con @homero? [S/n]: "
            cli_task = asyncio.create_task(self._read_cli_input(prompt_str))

            def _on_cli_done(t):
                if not decision_future.done():
                    decision_future.set_result(t.result())

            cli_task.add_done_callback(_on_cli_done)

        try:
            result = await decision_future
            return result
        finally:
            if cli_task and not cli_task.done():
                cli_task.cancel()
            self._pending_decisions.pop(task_id, None)
