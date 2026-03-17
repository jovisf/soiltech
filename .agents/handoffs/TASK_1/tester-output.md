Test Files Created:
- src/config/config.service.spec.ts
- src/users/users.service.spec.ts
- src/auth/auth.service.spec.ts
- test/app.e2e-spec.ts (fixed syntax)
- test/auth.e2e-spec.ts
- test/users.e2e-spec.ts (modified for POST /users)

Coverage Summary:
Unit tests for `ConfigService`, `UsersService`, and `AuthService` provide good coverage for happy paths, error paths, and edge cases.
E2E tests for `UsersController` and `AuthController` cover various HTTP endpoints including happy paths, unauthorized access (401), invalid input (400), not found (404), and duplicate email (409) where applicable.
However, the E2E tests could not be fully executed due to a critical infrastructure issue.

Test Run Result:
> temp-app@0.0.1 test:e2e
> jest --config ./test/jest-e2e.json

Determining test suites to run...[dotenv@17.2.3] injecting env (0) from .env.test -- tip: ⚙️  suppress all logs with { quiet: true }
e2e globalSetup: process.env.DATABASE_URL set to postgresql://soiltech:soiltech@localhost:5432/soiltech_e2e_test?schema=public
Bringing up Docker Compose services...
no configuration file provided: not found
Failed to set up test database: Error: Command failed: docker compose up -d
    at genericNodeError (node:internal/errors:983:15)
    at wrappedFn (node:internal/errors:537:14)
    at checkExecSyncError (node:child_process:883:11)
    at execSync (node:child_process:955:15)
    at globalSetup (/home/joaovictor/Documents/soiltech/test/setup-e2e.ts:54:38)
    at /home/joaovictor/Documents/soiltech/node_modules/@jest/core/build/index.js:3161:17
    at ScriptTransformer.requireAndTranspileModule (/home/joaovictor/Documents/soiltech/node_modules/@jest/transform/build/index.js:616:24)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async runGlobalHook (/home/joaovictor/Documents/soiltech/node_modules/@jest/core/build/index.js:3157:9)
    at async runJest (/home/joaovictor/Documents/soiltech/node_modules/@jest/core/build/index.js:3424:5) {
  status: 1,
  signal: null,
  output: [ null, null, null ],
  pid: 77922,
  stdout: null,
  stderr: null
}
no configuration file provided: not found
Error: Jest: Got error running globalSetup - /home/joaovictor/Documents/soiltech/test/setup-e2e.ts, reason: Command failed: docker compose down
    at genericNodeError (node:internal/errors:983:15)
    at wrappedFn (node:internal/errors:537:14)
    at checkExecSyncError (node:child_process:883:11)
    at execSync (node:child_process:955:15)
    at globalSetup (/home/joaovictor/Documents/soiltech/test/setup-e2e.ts:66:38)
    at /home/joaovictor/Documents/soiltech/node_modules/@jest/core/build/index.js:3161:17
    at ScriptTransformer.requireAndTranspileModule (/home/joaovictor/Documents/soiltech/node_modules/@jest/transform/build/index.js:616:24)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async runGlobalHook (/home/joaovictor/Documents/soiltech/node_modules/@jest/core/build/index.js:3157:9)
    at async runJest (/home/joaovictor/Documents/soiltech/node_modules/@jest/core/build/index.js:3424:5)
Exit Code: 1
Process Group PGID: 77847

Verdict: BLOCKED

Reason for Blocking: The `docker-compose.yml` file, which is critical for setting up the project's Dockerized environment (including the PostgreSQL database required for E2E tests), is missing from the project root. This prevents the E2E tests from running successfully, as the database server cannot be reached.