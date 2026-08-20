# Node.js Clustering & Process Management Guide

This document describes the horizontal process scaling, session architecture, and graceful shutdown mechanics for the Webthropic Express backend.

---

## 1. Architecture Overview

Node.js is inherently single-threaded. To utilize multi-core server environments, Webthropic supports process clustering via Node's built-in `cluster` module:

```
                          ┌───────────────────────────┐
                          │   Cluster Primary (PID)   │
                          │   - Crash restart manager │
                          │   - Lifecycle signal handler
                          └─────────────┬─────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
┌─────────────────────────┐┌─────────────────────────┐┌─────────────────────────┐
│     Worker #1 (PID)     ││     Worker #2 (PID)     ││     Worker #N (PID)     │
│ - Express HTTP Listener ││ - Express HTTP Listener ││ - Express HTTP Listener │
│ - MongoDB Connection    ││ - MongoDB Connection    ││ - MongoDB Connection    │
│ - Shared MongoStore     ││ - Shared MongoStore     ││ - Shared MongoStore     │
└─────────────────────────┘└─────────────────────────┘└─────────────────────────┘
```

- **Primary Process**: Does not listen on HTTP ports or handle user requests. Its sole responsibility is to spawn, monitor, restart, and gracefully terminate worker processes.
- **Worker Processes**: Each worker process independently connects to MongoDB and shares the same incoming TCP port (`PORT`, default 3000) using OS-level kernel load balancing.
- **Crash Protection**: If a worker process exits unexpectedly, the Primary process automatically restarts a replacement worker using **exponential backoff** (with a rate limiter of max 10 crashes/min to prevent crash thrashing).

---

## 2. Configuration & Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `CLUSTER_MODE` | `false` | Set to `true` to enable multi-process clustering on multi-core servers. Keep `false` for local dev or container platforms. |
| `WEB_CONCURRENCY` | `os.cpus().length` | Number of worker processes to fork when `CLUSTER_MODE=true`. |
| `CLUSTER_WORKERS` | `os.cpus().length` | Alias for `WEB_CONCURRENCY`. |
| `SHUTDOWN_TIMEOUT_MS` | `15000` (15s) | Graceful shutdown timeout allowing active requests (e.g. AI `/chat` streaming) to finish before forced exit. |

### Example Configurations:

**1. Local Development (Single Process):**
```env
CLUSTER_MODE=false
```

**2. Multi-Core Dedicated VM / VPS (4 CPU Cores):**
```env
CLUSTER_MODE=true
WEB_CONCURRENCY=4
```

**3. Test Cluster Locally (2 Workers):**
```env
CLUSTER_MODE=true
WEB_CONCURRENCY=2
```

---

## 3. Session Store & Authentication Across Workers

### Shared `connect-mongo` Store:
Webthropic uses `connect-mongo` configured in `src/config/session.ts`:
- **No Sticky Sessions Required**: Session identifiers (`webthropic.sid` cookies) are verified against the central `sessions` collection in MongoDB on every request.
- **Worker Independence**: A user can log in via Worker #1 and have subsequent requests handled by Worker #2 or Worker #3 without session loss or authentication breakage.
- **Auto-Removal & Touch**: Expired sessions are cleaned up automatically by MongoDB TTL indexes, with 24-hour lazy touch updates to minimize database write traffic.

---

## 4. Graceful Shutdown & AI Request Draining

Long-running requests — such as Anthropic Claude AI generation on `/template` and `/chat` — can take several seconds to complete. 

When a `SIGTERM` or `SIGINT` (Ctrl+C) signal is received:
1. **Connection Rejection**: The server enters shutdown mode and immediately returns `503 Service Unavailable` with `Connection: close` headers for any new incoming requests.
2. **HTTP Server Drain**: `server.close()` stops accepting new connections while allowing existing, active requests to complete.
3. **Database Disconnect**: Once in-flight requests finish, the MongoDB connection is closed cleanly via `disconnectDatabase()`.
4. **Safety Timeout**: If in-flight requests exceed `SHUTDOWN_TIMEOUT_MS` (default 15 seconds), the process forces an exit (`process.exit(1)`) to avoid hanging deployments.

---

## 5. Deployment Guide & Trade-Offs

### ⚠️ The Container / PaaS "CPU Core Trap":
In containerized environments (such as **Render, Heroku, Railway, Fly.io, AWS ECS, or Kubernetes**):
- `os.cpus().length` returns the **host node's physical CPU count** (e.g., 16 to 64 cores), not the container's cgroup CPU quota (e.g., 0.5 to 1 vCPU).
- If `CLUSTER_MODE=true` inside a 512MB RAM / 1-vCPU container, Node would spawn 16+ worker processes, immediately causing:
  1. **Memory Exhaustion (OOM Exit 137)**: 16 workers × 40MB V8 heap = ~640MB memory.
  2. **Severe CPU Throttling**: 16 workers competing for a fraction of 1 core.

### Recommended Deployment Matrix:

| Target Environment | Recommended Setting | Scaling Mechanism |
| :--- | :--- | :--- |
| **Render / Heroku / Railway / Cloud Run** | `CLUSTER_MODE=false` | Scale instances/dynos horizontally via the platform dashboard. |
| **Kubernetes (K8s)** | `CLUSTER_MODE=false` | Scale Pod replicas horizontally via Horizontal Pod Autoscaler (HPA). |
| **Dedicated EC2 / VPS / Bare-Metal** | `CLUSTER_MODE=true` | Set `WEB_CONCURRENCY` to match the instance's virtual CPU count. |
| **PM2 Process Manager** | `CLUSTER_MODE=false` | Let PM2 handle worker management (`pm2 start dist/index.js -i max`). |

---

## 6. Verification & Health Monitoring

The `/api/health` endpoint returns process and worker metadata:
```json
{
  "status": "ok",
  "timestamp": "2026-08-20T17:24:00.000Z",
  "pid": 14220,
  "cluster": true,
  "workerId": 2
}
```
You can inspect the `pid` and `workerId` fields to verify round-robin traffic distribution across worker processes.
