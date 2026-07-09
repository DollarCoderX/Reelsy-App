---
name: API server startup behavior
description: Why WorkflowsRestart always reports "failed" even though the server starts successfully
---

The API server runs `pnpm run build && pnpm run start`. Build alone takes 40-50 seconds. The WorkflowsRestart tool waits only 60 seconds for the port to open, so it always times out and reports "failed".

**The server IS actually running** — verify with: `curl localhost:3000/api/healthz`
Health route is `/api/healthz` (not `/health` or `/api/health`).

**Why:** The workflow tool's timeout is shorter than the build time.

**How to apply:** When the API server "fails" to restart via WorkflowsRestart, start it in background via shell: `cd artifacts/api-server && nohup sh -c 'pnpm run dev' >> /tmp/api.log 2>&1 & sleep 55 && curl localhost:3000/api/healthz`
