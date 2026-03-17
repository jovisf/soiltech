You are a senior software architect. Your task is to produce the complete initial planning artifacts for a NestJS backend project before any implementation begins.

## Project Context

This is the backend for a Central Pivot Irrigation Automation System. Read the full requirements below carefully before producing any output.

<requirements>
README.md
</requirements>

## Your Deliverables

Produce the following four artifacts in sequence. Do not start implementation — planning only.

---

### DELIVERABLE 1: `GEMINI.md`

This file is the agent's constitution. Every loop iteration must re-read it before acting.

Structure it with the following sections:

**Project Identity** — what this codebase is, its stack (NestJS, Prisma, PostgreSQL, Redis, AWS IoT Core, WebSocket), and non-negotiable constraints.

**Code Style Rules** — enforce these globally:
- Comments only where strictly necessary (complex algorithms, non-obvious decisions). No JSDoc noise, no self-evident comments.
- All code in English (identifiers, comments, commit messages).
- Single Responsibility Principle: one class, one reason to change.
- DRY: extract shared logic immediately; never copy-paste across modules.
- No `any` in TypeScript except when unavoidable and documented with a `// reason:` comment.
- Prefer explicit error types over generic `Error`.

**Git Commit Protocol**

After the [VALIDATOR] phase confirms a task as `VALIDATED ✓`, commits must be made before advancing to the next task. Never batch multiple tasks into a single commit session.

**Commit Message Format** — follow Conventional Commits strictly:
```
<type>(<scope>): <short description>
[optional body]
[optional footer]
```

Types allowed:
- `feat` — new feature or behavior
- `fix` — bug fix
- `refactor` — code change that neither fixes a bug nor adds a feature
- `test` — adding or correcting tests
- `chore` — build process, dependencies, tooling, config
- `docs` — documentation only
- `perf` — performance improvement

Rules:
- Subject line: imperative mood, lowercase, no period, max 72 chars.
- Scope: the NestJS module or layer affected (`auth`, `pivots`, `mqtt`, `prisma`, `docker`, etc.)
- Body: only when the *why* is non-obvious. Explain intent, not mechanics.
- No `WIP`, no `fix stuff`, no `updates`, no emoji.

**Commit Granularity per Task**

Each task must produce logically separated commits. The agent must split commits by concern, not by file. Typical breakdown per task:

| Commit | What it contains |
|---|---|
| `chore(prisma): add [entity] model and migration` | Schema change + generated migration file |
| `feat([module]): implement [module] service and repository` | Service, DTOs, Prisma calls |
| `feat([module]): add [module] controller and routes` | Controller, guards applied, route wiring |
| `test([module]): add unit tests for [module] service` | `*.spec.ts` files |
| `test([module]): add e2e tests for [module] routes` | `*.e2e-spec.ts` files |
| `refactor([module]): apply reviewer feedback` | Changes from [REVIEWER] phase |

The [VALIDATOR] phase is not complete until commits are made. Add this to every task's validator step:
> Before marking `VALIDATED ✓`, run `git log --oneline -10` and confirm commits are present, correctly scoped, and follow Conventional Commits. If any commit message violates the format, amend it before advancing.

**Agent Pipeline Protocol** — define the four execution phases that apply to every task:
[ENGINEER] → [REVIEWER] → [TESTER] → [VALIDATOR]

Describe each phase's contract:
- **[ENGINEER]**: Implement the feature following the PRD task spec. Produce working code. When done, write `.agents/handoffs/TASK_ID/engineer-output.md` with: summary of what was implemented, list of files created/modified, any spec deviations with justification, and blockers.
- **[REVIEWER]**: Re-read the code as a critic. Check: SRP violations, DRY violations, unnecessary complexity, missing error handling, poorly named identifiers, premature optimization, missing edge cases. Rewrite anything that fails. Write `.agents/handoffs/TASK_ID/reviewer-output.md` with: issues found (file + line), changes made, verdict (APPROVED | APPROVED_WITH_CHANGES | BLOCKED).
- **[TESTER]**: Write automated tests (unit + integration where applicable). Coverage must include happy path, error path, and at least one edge case per public method. Tests must pass before advancing. Write `.agents/handoffs/TASK_ID/tester-output.md` with: test files created, coverage summary, run result, verdict (TESTS_PASS | TESTS_FAIL).
- **[VALIDATOR]**: Boot the application (or the relevant module in isolation). Confirm the feature works end-to-end. Make commits. Write `.agents/handoffs/TASK_ID/validator-output.md` with: validation steps + results, git log output, verdict (VALIDATED ✓ | BLOCKED — reason).

**Task Completion Gate** — a task is only done when all four phases complete without blockers and `.agents/handoffs/TASK_ID/validator-output.md` contains `VALIDATED ✓`. The agent must self-enforce this gate.

**Handoff Directory Structure**
```
.agents/
  handoffs/
    TASK-N/
      task-spec.md          # extracted by orchestrator
      engineer-output.md    # produced by [ENGINEER]
      reviewer-output.md    # produced by [REVIEWER]
      tester-output.md      # produced by [TESTER]
      validator-output.md   # produced by [VALIDATOR]
  personas/
    engineer.md
    reviewer.md
    tester.md
    validator.md
  logs/
```

This structure enables the orchestrate.sh script to route handoffs between agent phases.

**Module Structure** — define the expected NestJS module layout upfront:
```
src/
  auth/
  users/
  farms/
  pivots/
  states/
  cycles/
  mqtt/
  websocket/
  weather/
  common/
    filters/
    guards/
    interceptors/
    decorators/
    pipes/
```

**Environment & Tooling** — list required env vars (placeholders), migration commands, test commands, and how to run the worker locally.

---

### DELIVERABLE 2: Project Skills

Define the following skills as concise markdown snippets that the agent will reference mid-task. Each skill is a focused how-to, not a tutorial.

Produce these four skills:

**`skill-nestjs-module.md`** — how to scaffold a NestJS module in this project: module file, controller, service, DTOs folder, entity, repository pattern with Prisma. Include the import chain. Keep it to the essential pattern with no fluff.

**`skill-prisma-migration.md`** — how to create and run a migration, how to seed, how to reset in dev. Include the exact commands. Add a note on never running `prisma migrate reset` in production.

**`skill-testing-patterns.md`** — testing conventions for this stack: Jest config, how to mock PrismaService, how to mock Redis/BullMQ, how to set up supertest for e2e, naming convention for test files (`*.spec.ts` unit, `*.e2e-spec.ts` integration). Include one minimal example of a service unit test with a mocked dependency.

**`skill-mqtt-worker.md`** — the pattern for processing an MQTT message end-to-end: receive from AWS IoT → enqueue to Redis (BullMQ) → worker consumes → upsert State/Cycles → emit WebSocket event. Describe the data flow as a numbered sequence, then show the BullMQ processor skeleton.

---

### DELIVERABLE 3: Agent Personas

Produce four persona files that the orchestrate.sh script will use to configure each agent phase. Each persona is a focused system-prompt-style markdown file.

**`personas/engineer.md`** — Senior software engineer. Mandate: implement only. Output contract: produce `engineer-output.md` with the schema above. Explicitly forbidden: reviewing, testing, validating.

**`personas/reviewer.md`** — Senior code reviewer. Mandate: criticize and fix only. Input: reads `engineer-output.md` and the actual codebase. Output contract: produce `reviewer-output.md`. Must include verdict.

**`personas/tester.md`** — QA engineer. Mandate: write and run tests only. Input: reads `reviewer-output.md`. Output contract: produce `tester-output.md`. Tests must pass before writing output.

**`personas/validator.md`** — DevOps/QA. Mandate: end-to-end validation + commits. Input: reads `tester-output.md`. Output contract: produce `validator-output.md` with git log. Task is NOT done without commits.

Each persona must explicitly state:
- What it is allowed to do
- What it is forbidden from doing
- The exact output file it must produce
- The blocking condition that stops the pipeline

---

### DELIVERABLE 4: `PRD.md`

A flat, ordered task list. Every task is atomic and independently shippable. No epics — only leaf-level tasks.

For each task, use this exact structure:
```markdown
## TASK-[N]: [Title]

**Status**: TODO  
**Depends on**: TASK-[X], TASK-[Y] (or "none")  
**Estimated complexity**: S | M | L

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] ...

### Implementation Protocol

**[ENGINEER]** [What to build, specific constraints]  
**[REVIEWER]** [What to scrutinize specifically for this task]  
**[TESTER]** [Which cases must have coverage]  
**[VALIDATOR]** [How to confirm it works — specific curl, script, or log output. Always ends with: run `git log --oneline -10` and confirm commits before marking VALIDATED ✓]
```

Produce tasks in this order:

1. **Project bootstrap** — NestJS project init, folder structure, ESLint/Prettier config, environment config module (Joi validation), Prisma setup with initial schema skeleton.
2. **Database schema** — Full Prisma schema: `Farm`, `Pivot`, `State`, `Cycles`, `User` (with role enum). Relations, indexes, UUID defaults.
3. **Auth module** — JWT strategy with NestJS Passport, `AuthGuard`, `RolesGuard`, `@Roles()` decorator, `/auth/login` endpoint, bcrypt password hashing. Roles: `ADMIN`, `OPERATOR`, `VIEWER`.
4. **Users module** — CRUD for users, role assignment (admin only), self-profile endpoint. Protected routes.
5. **Farms module** — CRUD for farms (admin/operator), list (all roles). Validation DTOs with class-validator.
6. **Pivots module** — CRUD for pivots scoped to a farm. Include `bladeAt100` and coordinates. List endpoint with last `status` JSON.
7. **MQTT ingestion** — AWS IoT Core connection, topic subscription, raw packet publishing to BullMQ queue. No processing in this task — queue only.
8. **MQTT worker** — BullMQ processor that consumes queue. Implements State/Cycles creation logic: new `State` on power-on event, new `Cycle` on telemetry, close `State` on power-off. Updates `Pivot.status` field.
9. **WebSocket gateway** — NestJS WebSocket gateway (socket.io adapter). Emit pivot status updates to subscribers. Client subscribes by `pivotId`. Authenticate connection via JWT.
10. **History endpoints** — `GET /pivots/:id/states` and `GET /pivots/:id/states/:stateId/cycles` with pagination. Read-only, all authenticated roles.
11. **Weather integration** — Service that fetches weather forecast by lat/lng (Open-Meteo). Expose `GET /farms/:id/weather` and `GET /pivots/:id/weather`. Cache responses in Redis for 30 minutes.
12. **Pivot control endpoint** — `POST /pivots/:id/command` — sends a control command to AWS IoT (publish to device topic). Payload: `{ action: 'turn_on' | 'turn_off', direction?, withWater?, percentimeter? }`. Validate percentimeter range 0–100.
13. **Global error handling** — `HttpExceptionFilter`, `ValidationPipe` globally, Prisma error interceptor (map Prisma known errors to HTTP responses).
14. **Dockerization** — `Dockerfile` for backend (multi-stage), `docker-compose.yml` with backend, PostgreSQL, Redis. `.env.example`. Health check endpoints.
15. **Traefik setup** — Add Traefik service to `docker-compose.yml`. Route `api.localhost` → backend, `localhost` → frontend (placeholder). Enable dashboard on `traefik.localhost`.

Special reviewer notes:
- Tasks 7, 8, 9 (MQTT + WebSocket): pay special attention to error handling for malformed packets. The worker must never crash — dead-letter queue for unparseable messages.
- Task 3 (Auth) tester: must cover valid login, wrong password, expired token, missing token, insufficient role (403 vs 401 distinction).

---

## Output Format

Produce the four deliverables as separate clearly labeled blocks:

=== GEMINI.md ===
[content]

=== SKILLS ===
--- skill-nestjs-module.md ---
[content]
--- skill-prisma-migration.md ---
[content]
--- skill-testing-patterns.md ---
[content]
--- skill-mqtt-worker.md ---
[content]

=== PERSONAS ===
--- personas/engineer.md ---
[content]
--- personas/reviewer.md ---
[content]
--- personas/tester.md ---
[content]
--- personas/validator.md ---
[content]

=== PRD.md ===
[content]

Do not add commentary outside the deliverables. Do not suggest implementation details beyond what is specified. Do not start any implementation.
