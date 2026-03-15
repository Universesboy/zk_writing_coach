# Project Retrospective: ZK Writing Coach (中考英语作文教练)

**Date:** 2026-03-13
**Author:** Colin Zhou & OpenClaw

## 1. Project Retrospective Summary
The **ZK Writing Coach** project successfully evolved from a local Python/FastAPI backend and Next.js frontend demo into a fully functional, cloud-deployed SaaS application. The system provides real-time AI grading, error tagging, targeted training suggestions, historical tracking, multi-student coach dashboards, and parent-friendly exportable reports. Despite significant friction during the final cloud deployment phase—primarily due to Next.js versioning, security vulnerabilities (CVE-2025-55182), and CORS proxy configurations—the project was successfully deployed to production using Vercel (Frontend) and Render (Backend).

## 2. What Worked Well
*   **Clear Component Architecture:** Refactoring the monolithic `page.tsx` into specialized components (`EssayForm`, `ResultPanel`, `HistoryPanel`, `CoachDashboard`) made adding features (like parent view and coach notes) extremely efficient.
*   **Fallback AI Mechanism:** Implementing a rule-based grading fallback when the LLM API fails or times out ensured the application remained robust and functional even during rate limits or network issues.
*   **Structured Prompting:** Enforcing a strict JSON schema for the LLM output (scores, strengths, improvements, sentence suggestions, tags) allowed the frontend to predictably render complex, high-quality UI elements.
*   **Local-First Database Strategy:** Using a simple SQLite file during development allowed rapid iteration on the data model (adding `error_tags`, `coach_note`, etc.) without managing remote DB migrations during the MVP phase.

## 3. What Failed or Caused Friction
*   **Local-to-Cloud API Routing (Proxy vs. Absolute):** Attempting to use Next.js API rewrites (`/api/proxy`) for local tunneling (Ngrok/localtunnel) broke Server-Side Rendering (SSR) when deployed to Vercel, because SSR requires absolute URLs.
*   **Dependency Conflicts (Peer Dependencies):** Updating Next.js to bypass Vercel's security block caused severe NPM `ERESOLVE` peer dependency conflicts with React 19 RC versions.
*   **Vercel Security Blocking (React2Shell CVE):** Vercel aggressively blocked deployments of Next.js versions between 15.0.0 and 16.0.6 due to a critical vulnerability, causing repeated build failures that were initially misdiagnosed as standard warnings.
*   **Turbopack Root Resolution Panic:** The experimental Next.js Turbopack compiler crashed (`panic`) when trying to resolve the workspace root during the build process, requiring a forced downgrade to the standard Webpack compiler or a complete wipe of the `.next` cache.

## 4. Root Cause Analysis for Major Issues

| Issue | Root Cause | Solution Implemented |
| :--- | :--- | :--- |
| **Vercel Build Blocked** | `next@15.2.2` contained the React2Shell vulnerability (CVE-2025-55182). Vercel hard-blocks these versions at the infrastructure level. | Wiped `node_modules` and `package-lock.json`, forced upgrade to `next@latest` and `react@latest` stable versions. |
| **NPM Dependency Hell** | Next.js 15+ has strict peer dependency requirements for React 19 RC, clashing with standard React installations. | Bypassed initial errors with `--legacy-peer-deps`, but ultimately resolved by moving entirely to stable `latest` channels. |
| **SSR Fetch Failing (`Failed to parse URL`)** | Next.js Server Components require absolute URLs (e.g., `https://...`) for `fetch()`. The codebase was using relative paths (`/api/proxy`) designed for local client-side tunnels. | Wrote a script to hardcode the production Render backend URL (`https://zk-writing-coach.onrender.com`) across all frontend files before pushing. |
| **CORS Blocking on Production** | The FastAPI backend was strictly whitelisting `localhost:3000`, rejecting requests from the newly generated Vercel domain. | Relaxed CORS in `main.py` to `allow_origins=["*"]` for the MVP phase. |

## 5. Actionable Improvements for Next Time
1.  **Environment Variable Discipline:** Never hardcode API bases (`http://127.0.0.1` or `/api/proxy`). Always use `.env.local` for development and configure production URLs strictly through the hosting provider's dashboard (Vercel/Render Environment Variables).
2.  **Start with Stable Releases:** Avoid using `canary` or `rc` (Release Candidate) versions of major frameworks like Next.js/React unless absolutely necessary, to avoid peer dependency nightmares and zero-day blocks.
3.  **Deploy Early:** Set up the Vercel/Render CI/CD pipeline on Day 1 with an empty "Hello World" page. Fix CORS and routing issues before the codebase becomes complex.
4.  **Isolate API Calls:** Create a single `api.ts` utility file that handles all `fetch` logic, base URL resolution, and error handling, rather than scattering `fetch()` calls across multiple React components.

---

## 6. Reusable Development Playbook (The "ZK Framework")

To make future full-stack LLM projects smoother, follow this standardized 5-step playbook:

### Phase 1: Initialization & CI/CD Setup (Day 1)
*   [ ] Scaffold FastAPI backend and Next.js frontend.
*   [ ] Set up `.gitignore` (exclude `.env`, `node_modules`, `venv`, `*.db`).
*   [ ] Connect to GitHub and establish Vercel (Frontend) and Render (Backend) pipelines *immediately*.
*   [ ] Configure CORS in FastAPI to accept the Vercel production URL.

### Phase 2: Data Contracts & AI Integration
*   [ ] Define the exact JSON schema the LLM must return (The "Contract").
*   [ ] Write the Backend endpoint using `response_format: {"type": "json_object"}`.
*   [ ] Implement a hardcoded "Fallback Mock Response" in the backend to ensure the frontend can be developed even if the LLM API is down/rate-limited.

### Phase 3: Frontend Architecture
*   [ ] Create a central `config/api.ts` to manage API URLs based on `process.env.NODE_ENV`.
*   [ ] Separate logic from UI: Keep `page.tsx` for state management, move visuals to `components/`.
*   [ ] Design for 3 distinct states: Loading (Skeleton), Error (Toast), and Empty State.

### Phase 4: Persistence
*   [ ] Start with local SQLite using `sqlite3` or SQLAlchemy.
*   [ ] *Crucial Step:* Before moving to production, migrate SQLite to a cloud PostgreSQL database (e.g., Supabase, Neon), as Serverless platforms (Render/Vercel) have ephemeral filesystems and will delete local `.db` files upon restart.

### Phase 5: Security & Final Audit
*   [ ] Scrub all API keys from codebase using a search script.
*   [ ] Ensure `package-lock.json` is healthy and versions are on stable channels to avoid CVE deployment blocks.
*   [ ] Test the production Vercel URL on mobile (responsive design check).
