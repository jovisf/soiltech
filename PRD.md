# PRD — SoilTech Backend

> Product Requirements Document — flat, ordered task list.
> Every task is atomic and independently shippable.

---

## TASK-1: Project Bootstrap

**Status**: IN_PROGRESS ([TESTER] phase)
**Depends on**: none
**Estimated complexity**: M

### Acceptance Criteria

- [ ] NestJS project initialized with TypeScript strict mode
- [ ] Folder structure matches `GEMINI.md` Module Structure section
- [ ] ESLint + Prettier configured with consistent rules
- [ ] Path aliases configured in `tsconfig.json` (`@/common`, `@/auth`, etc.)
- [ ] `ConfigModule` with Joi validation for all env vars in `.env.example`
- [ ] `PrismaModule` and `PrismaService` created with `onModuleInit`/`onModuleDestroy` lifecycle
- [ ] Prisma schema skeleton created (`datasource`, `generator`, no models yet)
- [ ] `.env.example` created with all required variables
- [ ] Application boots without errors via `npm run start:dev`

### Implementation Protocol

**[ENGINEER]** Initialize NestJS project with `@nestjs/cli`. Configure `tsconfig.json` with `strict: true` and path aliases. Create `ConfigModule` using `@nestjs/config` with Joi schema validation. Create `PrismaModule`/`PrismaService`. Create the `src/common/` directory structure (filters, guards, interceptors, decorators, pipes). Create `.env.example`.

**[REVIEWER]** Verify `tsconfig.json` has `strict: true`. Verify Joi schema covers every env var. Verify `PrismaService` properly implements `onModuleInit` and `onModuleDestroy`. Verify path aliases resolve correctly. Check ESLint/Prettier config for consistency.

**[TESTER]** Unit test `ConfigService` — valid env loads correctly, missing required var throws. Unit test `PrismaService` — `onModuleInit` calls `$connect`. Integration test — app bootstraps successfully.

**[VALIDATOR]** Run `npm run start:dev` and confirm clean startup. Run `npm run build` and confirm no TS errors. Run `npm run lint` and confirm no violations. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-2: Database Schema

**Status**: IN_PROGRESS ([REVIEWER] phase)
**Depends on**: TASK-1
**Estimated complexity**: M

### Acceptance Criteria

- [ ] `User` model with `id`, `email`, `name`, `password`, `role` (enum: `ADMIN`, `OPERATOR`, `VIEWER`), timestamps
- [ ] `Farm` model with `id`, `name`, `latitude`, `longitude`, timestamps
- [ ] `Pivot` model with `id`, `farmId`, `name`, `latitude`, `longitude`, `status` (JSON), `bladeAt100` (Float), timestamps
- [ ] `State` model with `id`, `pivotId`, `timestamp`, `isOn`, `direction`, `isIrrigating`
- [ ] `Cycle` model with `id`, `stateId`, `timestamp`, `angle`, `percentimeter`
- [ ] Relations: Farm 1:N Pivot, Pivot 1:N State, State 1:N Cycle
- [ ] UUID defaults on all `id` fields
- [ ] Indexes on foreign keys (`farmId`, `pivotId`, `stateId`)
- [ ] Migration generated and applied successfully
- [ ] `@@map` used for snake_case table names

### Implementation Protocol

**[ENGINEER]** Define all models in `prisma/schema.prisma`. Add `Role` enum. Set up relations with proper cascading. Add `@@map` for table names and `@map` for column names. Generate and apply migration via `npx prisma migrate dev --name initial-schema`.

**[REVIEWER]** Verify all relations are correct (1:N cascade). Verify UUID defaults. Verify indexes on FK columns. Verify `@@map` and `@map` are consistent. Check for missing fields against the README spec.

**[TESTER]** Test that `npx prisma validate` passes. Test that generated client types match expected shape. Write a simple integration seed test that creates one Farm → Pivot → State → Cycle chain.

**[VALIDATOR]** Run `npx prisma migrate status` and confirm applied. Run `npx prisma studio` and verify tables exist. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-3: Auth Module

**Status**: TODO
**Depends on**: TASK-2
**Estimated complexity**: L

### Acceptance Criteria

- [ ] `POST /auth/login` endpoint accepts `{ email, password }` and returns `{ access_token }`
- [ ] JWT strategy implemented via `@nestjs/passport` + `passport-jwt`
- [ ] Passwords hashed with bcrypt (min 10 salt rounds)
- [ ] `JwtAuthGuard` reusable guard in `src/common/guards/`
- [ ] `RolesGuard` checks user role against `@Roles()` decorator
- [ ] `@Roles()` custom decorator in `src/common/decorators/`
- [ ] Roles enum: `ADMIN`, `OPERATOR`, `VIEWER`
- [ ] 401 returned for missing/invalid/expired token
- [ ] 403 returned for insufficient role
- [ ] Auth module exports `JwtAuthGuard` for use in other modules

### Implementation Protocol

**[ENGINEER]** Create `src/auth/` module with `AuthService`, `AuthController`, `JwtStrategy`, `LocalStrategy`. Implement bcrypt password hashing. Create `JwtAuthGuard`, `RolesGuard`, `@Roles()` decorator in `src/common/`. Create `LoginDto` with validation. Wire `PassportModule` and `JwtModule` with config from `ConfigService`.

**[REVIEWER]** Verify password is never returned in any response. Verify JWT secret comes from `ConfigService`, not hardcoded. Verify `RolesGuard` properly reads `@Roles()` metadata. Check for timing-safe password comparison. Verify bcrypt salt rounds ≥ 10.

**[TESTER]** Test cases: valid login returns 200 + token, wrong password returns 401, nonexistent user returns 401, expired token returns 401, missing token returns 401, valid token wrong role returns 403, valid token correct role returns 200. Unit test `AuthService.validateUser` and `AuthService.login`.

**[VALIDATOR]** Seed an admin user. `curl POST /auth/login` with valid credentials — confirm 200 + JWT. Decode JWT and verify payload. Test protected route without token — confirm 401. Test protected route with wrong role — confirm 403. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-4: Users Module

**Status**: TODO
**Depends on**: TASK-3
**Estimated complexity**: M

### Acceptance Criteria

- [ ] `POST /users` — create user (admin only)
- [ ] `GET /users` — list all users (admin only)
- [ ] `GET /users/:id` — get user by ID (admin only)
- [ ] `PATCH /users/:id` — update user (admin only)
- [ ] `DELETE /users/:id` — delete user (admin only)
- [ ] `GET /users/me` — get own profile (any authenticated user)
- [ ] Password never returned in any response
- [ ] Role assignment only by admin
- [ ] All routes protected with JWT + Roles guards
- [ ] UUID validation on `:id` params via `ParseUUIDPipe`
- [ ] DTOs with `class-validator` for all inputs

### Implementation Protocol

**[ENGINEER]** Create `src/users/` module with `UsersService`, `UsersController`. Implement CRUD operations via `PrismaService`. Create `CreateUserDto`, `UpdateUserDto`. Add `GET /users/me` using `@Request()` decorator to extract user from JWT. Exclude `password` field from all responses using Prisma `select` or a response serializer.

**[REVIEWER]** Verify password exclusion in every response path. Verify admin-only access on CRUD routes. Verify `GET /users/me` extracts user ID from JWT payload, not from query params. Check for proper `NotFoundException` on missing user.

**[TESTER]** Test CRUD operations (create, read, update, delete) with admin token. Test 403 on CRUD with operator/viewer token. Test `GET /users/me` returns the authenticated user's profile. Test password is absent from all responses. Test 404 on nonexistent user ID.

**[VALIDATOR]** Create a user via API. List users. Get user by ID. Update user role. Delete user. Verify `GET /users/me` returns correct profile. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-5: Farms Module

**Status**: TODO
**Depends on**: TASK-4
**Estimated complexity**: M

### Acceptance Criteria

- [ ] `POST /farms` — create farm (admin, operator)
- [ ] `GET /farms` — list all farms (all authenticated roles)
- [ ] `GET /farms/:id` — get farm by ID (all authenticated roles)
- [ ] `PATCH /farms/:id` — update farm (admin, operator)
- [ ] `DELETE /farms/:id` — delete farm (admin only)
- [ ] `CreateFarmDto` validates `name` (string, required), `latitude` (float), `longitude` (float)
- [ ] All routes protected with JWT
- [ ] Proper error responses: 400 for invalid input, 404 for not found

### Implementation Protocol

**[ENGINEER]** Create `src/farms/` module following `skill-nestjs-module.md`. Implement all CRUD operations. Create DTOs with `class-validator`. Apply guards at controller level. Use `ParseUUIDPipe` for ID params.

**[REVIEWER]** Verify role restrictions match spec (admin+operator for CUD, all for read). Verify coordinate validation (latitude -90 to 90, longitude -180 to 180). Check `NotFoundException` handling. Verify DTOs are complete.

**[TESTER]** Test all CRUD operations with appropriate roles. Test 403 for role violations. Test validation: missing name, out-of-range coordinates. Test 404 for nonexistent farm.

**[VALIDATOR]** Create a farm via API. List farms. Update farm name. Delete farm (admin). Verify viewer can list but not create. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-6: Pivots Module

**Status**: TODO
**Depends on**: TASK-5
**Estimated complexity**: M

### Acceptance Criteria

- [ ] `POST /farms/:farmId/pivots` — create pivot scoped to a farm (admin, operator)
- [ ] `GET /farms/:farmId/pivots` — list pivots for a farm (all authenticated roles)
- [ ] `GET /pivots/:id` — get pivot by ID with last `status` JSON (all authenticated roles)
- [ ] `PATCH /pivots/:id` — update pivot (admin, operator)
- [ ] `DELETE /pivots/:id` — delete pivot (admin only)
- [ ] `CreatePivotDto` validates `name`, `latitude`, `longitude`, `bladeAt100` (positive float)
- [ ] Pivot creation validates that the referenced `farmId` exists
- [ ] Response includes the `status` JSON field (last MQTT packet)

### Implementation Protocol

**[ENGINEER]** Create `src/pivots/` module. Scope pivot creation to a farm via `:farmId` route param. Validate farm existence before creating pivot. Create DTOs with `bladeAt100` validation (positive number). Include `status` field in responses.

**[REVIEWER]** Verify farm existence check before pivot creation. Verify `bladeAt100` is validated as positive. Verify pivot routes are properly scoped. Check that `status` JSON is returned in GET responses.

**[TESTER]** Test pivot CRUD scoped to farm. Test 404 when creating pivot with invalid `farmId`. Test `bladeAt100` validation (negative value rejected). Test GET returns `status` field.

**[VALIDATOR]** Create a farm, then create a pivot under it. List pivots for the farm. Update pivot coordinates. Delete pivot (admin). Verify pivot with nonexistent farm returns 404. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-7: MQTT Ingestion

**Status**: TODO
**Depends on**: TASK-6
**Estimated complexity**: L

### Acceptance Criteria

- [ ] `MqttService` connects to AWS IoT Core using certificate-based auth
- [ ] Subscribes to `soiltech/pivots/+/telemetry` topic pattern
- [ ] Raw MQTT packets are enqueued to a BullMQ Redis queue (`mqtt-telemetry`)
- [ ] Each queued job contains `pivotId`, `rawPayload`, and `receivedAt`
- [ ] Connection errors are logged, not thrown
- [ ] `MqttModule` registers the BullMQ queue
- [ ] Queue is visible in Redis after receiving a message
- [ ] No processing logic in this task — ingestion only

### Implementation Protocol

**[ENGINEER]** Create `src/mqtt/mqtt.module.ts` and `src/mqtt/mqtt.service.ts`. Use the `mqtt` npm package. Read AWS IoT cert paths from `ConfigService`. Subscribe to the wildcard topic. On each message, extract `pivotId` from topic and enqueue via `@InjectQueue`. Register `BullModule.forRoot` (Redis config) and `BullModule.registerQueue` in the module. Follow `skill-mqtt-worker.md` for the ingestion part only.

**[REVIEWER]** Verify certificate paths are read from config, not hardcoded. Verify connection error handling (log + reconnect, never crash). Verify topic parsing correctly extracts `pivotId`. Verify job payload shape. Check for proper cleanup in `onModuleDestroy`.

**[TESTER]** Unit test `MqttService.enqueue` — mock the queue, verify job is added with correct payload. Unit test topic parsing — various topic formats. Test error handling — connection failure does not throw. Mock `mqtt.connect` for isolation.

**[VALIDATOR]** Boot the app with Redis running. Verify BullMQ queue is registered (check Redis keys). Simulate a message publish (or mock) and verify job appears in queue. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-8: MQTT Worker

**Status**: TODO
**Depends on**: TASK-7
**Estimated complexity**: L

### Acceptance Criteria

- [ ] `MqttProcessor` consumes jobs from the `mqtt-telemetry` queue
- [ ] Power-on event creates a new `State` record (`isOn: true`)
- [ ] Telemetry while active creates a new `Cycle` record linked to active `State`
- [ ] Power-off event updates active `State` to `isOn: false`
- [ ] `Pivot.status` JSON field is updated with every processed packet
- [ ] Malformed JSON packets are logged and discarded (dead-letter), never crash the worker
- [ ] Database errors retry up to 3 times with exponential backoff
- [ ] Worker emits a WebSocket event after each processed packet (placeholder; full WS in TASK-9)

### Implementation Protocol

**[ENGINEER]** Create `src/mqtt/mqtt.processor.ts` following `skill-mqtt-worker.md`. Implement the three event types (power-on, telemetry, power-off). Update `Pivot.status` on every packet. Add try/catch for JSON parsing with dead-letter logging. Configure BullMQ retry with `backoffStrategy`. Add a placeholder WebSocket emit call.

**[REVIEWER]** **Special attention**: verify the worker never crashes on any input. Verify dead-letter handling for malformed packets. Verify the state machine logic: only one active `State` per pivot at a time. Verify `Pivot.status` is always updated. Check for race conditions in concurrent packet processing.

**[TESTER]** Unit test all three event types with mocked Prisma. Test malformed JSON handling — verify no exception thrown, error logged. Test retry configuration. Test that `Pivot.status` is updated. Test edge case: power-off when no active state exists.

**[VALIDATOR]** Boot the app. Enqueue a mock power-on job manually. Verify `State` created. Enqueue telemetry jobs. Verify `Cycle` records created. Enqueue power-off. Verify `State` closed. Check `Pivot.status` in database. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-9: WebSocket Gateway

**Status**: TODO
**Depends on**: TASK-8
**Estimated complexity**: M

### Acceptance Criteria

- [ ] `WebSocketGateway` implemented using `@nestjs/websockets` with socket.io adapter
- [ ] Clients subscribe to updates for a specific `pivotId`
- [ ] Server emits `pivotStatusUpdate` events with pivot ID and status data
- [ ] Connection authenticated via JWT (token in handshake query or headers)
- [ ] Unauthenticated connections rejected
- [ ] `MqttProcessor` calls `WebsocketGateway.emitPivotUpdate()` after processing
- [ ] Multiple clients can subscribe to the same pivot simultaneously

### Implementation Protocol

**[ENGINEER]** Create `src/websocket/websocket.module.ts` and `src/websocket/websocket.gateway.ts`. Use `@WebSocketGateway()` with JWT authentication in the `handleConnection` lifecycle. Implement `subscribeToPivot` and `unsubscribeFromPivot` message handlers. Implement `emitPivotUpdate(pivotId, data)` method that broadcasts to subscribed clients. Wire into `MqttProcessor`.

**[REVIEWER]** **Special attention**: verify JWT validation in WebSocket handshake. Verify room-based subscription (one room per `pivotId`). Verify cleanup on disconnect. Check that `emitPivotUpdate` only sends to clients in the correct room.

**[TESTER]** Unit test `handleConnection` — valid JWT accepted, invalid rejected. Unit test `subscribeToPivot` — client joins correct room. Unit test `emitPivotUpdate` — event emitted to correct room. Test disconnect cleanup.

**[VALIDATOR]** Boot the app. Connect a WebSocket client with valid JWT. Subscribe to a pivot. Trigger a status update (via mock queue job). Verify the client receives the event. Test with invalid JWT — verify rejection. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-10: History Endpoints

**Status**: TODO
**Depends on**: TASK-8
**Estimated complexity**: S

### Acceptance Criteria

- [ ] `GET /pivots/:id/states` — returns paginated list of states for a pivot
- [ ] `GET /pivots/:id/states/:stateId/cycles` — returns paginated cycles for a state
- [ ] Pagination via `page` and `limit` query params (default: page=1, limit=20)
- [ ] Response includes `total`, `page`, `limit`, `data` fields
- [ ] Read-only — all authenticated roles can access
- [ ] Results ordered by `timestamp` descending
- [ ] 404 if pivot or state not found

### Implementation Protocol

**[ENGINEER]** Create `src/states/` and `src/cycles/` modules. Add paginated query methods to services using Prisma's `skip`/`take`. Create `PaginationQueryDto` in `src/common/` with `page` and `limit` validation. Wire controllers with `GET` routes.

**[REVIEWER]** Verify pagination math (`skip = (page - 1) * limit`). Verify default values. Verify 404 on nonexistent pivot/state. Verify ordering is `desc` on `timestamp`. Check for SQL injection via query params (class-validator should prevent).

**[TESTER]** Test pagination: first page, second page, last page, beyond total. Test default pagination values. Test ordering. Test 404 for nonexistent pivot/state. Test that all roles can access.

**[VALIDATOR]** Seed states and cycles data. `curl GET /pivots/:id/states?page=1&limit=5` — verify paginated response. `curl GET /pivots/:id/states/:stateId/cycles` — verify cycles. Test beyond-last-page returns empty `data` array. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-11: Weather Integration

**Status**: TODO
**Depends on**: TASK-6
**Estimated complexity**: M

### Acceptance Criteria

- [ ] `WeatherService` fetches forecast from Open-Meteo API by lat/lng
- [ ] `GET /farms/:id/weather` — returns weather for farm coordinates
- [ ] `GET /pivots/:id/weather` — returns weather for pivot coordinates
- [ ] Responses cached in Redis for 30 minutes (configurable via `WEATHER_CACHE_TTL` env var)
- [ ] Cache key includes coordinates to avoid stale data
- [ ] Graceful handling: if external API is down, return 503 with message
- [ ] Response shape includes temperature, humidity, wind speed, conditions

### Implementation Protocol

**[ENGINEER]** Create `src/weather/` module. Use `HttpModule` (`@nestjs/axios`) for external API calls. Create `WeatherService` with `getWeatherByCoordinates(lat, lng)`. Implement Redis caching via `@nestjs/cache-manager` or direct `ioredis`. Create controller routes. Create `WeatherResponseDto`.

**[REVIEWER]** Verify cache TTL comes from config. Verify cache key format prevents collisions. Verify timeout handling on external API calls. Verify 503 response when API unreachable. Check that coordinates are validated before API call.

**[TESTER]** Unit test `WeatherService` with mocked HTTP client. Test cache hit (second call returns cached). Test cache miss (first call hits API). Test API failure returns 503. Test with invalid coordinates.

**[VALIDATOR]** Boot the app. `curl GET /farms/:id/weather` — verify weather data returned. Call again within 30 minutes — verify response is cached (check Redis key). `curl GET /pivots/:id/weather` — verify pivot-specific weather. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-12: Pivot Control Endpoint

**Status**: TODO
**Depends on**: TASK-7
**Estimated complexity**: M

### Acceptance Criteria

- [ ] `POST /pivots/:id/command` — sends control command to AWS IoT
- [ ] Payload: `{ action: 'turn_on' | 'turn_off', direction?: 'clockwise' | 'counter-clockwise', withWater?: boolean, percentimeter?: number }`
- [ ] `percentimeter` validated: integer, range 0–100, only required when `withWater: true`
- [ ] Command published to MQTT topic: `soiltech/pivots/{pivotId}/command`
- [ ] Only `ADMIN` and `OPERATOR` roles can send commands
- [ ] Returns 202 Accepted (fire-and-forget)
- [ ] 404 if pivot not found

### Implementation Protocol

**[ENGINEER]** Add `POST /pivots/:id/command` to `PivotsController` (or create a dedicated controller). Create `PivotCommandDto` with conditional validation (`percentimeter` required only when `withWater` and `action: 'turn_on'`). Use `MqttService` to publish to the command topic. Return 202.

**[REVIEWER]** Verify conditional validation logic. Verify percentimeter range 0–100. Verify MQTT publish uses correct topic format. Verify role restriction. Check that pivot existence is validated before publishing.

**[TESTER]** Test valid turn_on command returns 202. Test turn_on with water and valid percentimeter. Test percentimeter out of range (>100, <0). Test missing percentimeter when withWater is true. Test turn_off command. Test 403 for viewer role. Test 404 for nonexistent pivot.

**[VALIDATOR]** Create a pivot. `curl POST /pivots/:id/command` with turn_on payload — verify 202. Check MQTT topic received the message (or verify via logs). Test with viewer token — verify 403. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-13: Global Error Handling

**Status**: TODO
**Depends on**: TASK-1
**Estimated complexity**: S

### Acceptance Criteria

- [ ] `HttpExceptionFilter` in `src/common/filters/` formats all HTTP errors consistently: `{ statusCode, message, error, timestamp, path }`
- [ ] `PrismaExceptionFilter` maps Prisma known errors to HTTP responses:
  - `P2002` (unique constraint) → 409 Conflict
  - `P2025` (record not found) → 404 Not Found
  - `P2003` (FK constraint) → 400 Bad Request
- [ ] `ValidationPipe` applied globally with `whitelist: true` and `forbidNonWhitelisted: true`
- [ ] All filters registered globally in `main.ts`
- [ ] Error responses never leaks internal details (stack traces, SQL errors)

### Implementation Protocol

**[ENGINEER]** Create `HttpExceptionFilter` and `PrismaExceptionFilter` in `src/common/filters/`. Register both globally in `main.ts`. Apply `ValidationPipe` globally with strict options. Create a consistent error response shape.

**[REVIEWER]** Verify no internal details leak in error responses. Verify Prisma error codes are mapped correctly. Verify `ValidationPipe` options are strict. Check that custom exceptions from other modules are properly caught.

**[TESTER]** Test `HttpExceptionFilter` formats errors correctly. Test `PrismaExceptionFilter` with P2002, P2025, P2003 codes. Test `ValidationPipe` rejects extra fields. Test that stack traces are never in response body (production mode).

**[VALIDATOR]** Trigger each error type via API calls. Verify response shapes. Verify no stack traces leak. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-14: Dockerization

**Status**: TODO
**Depends on**: TASK-13
**Estimated complexity**: M

### Acceptance Criteria

- [ ] `Dockerfile` for backend: multi-stage build (build → production)
- [ ] `docker-compose.yml` with services: `backend`, `postgres`, `redis`
- [ ] `.env.example` includes all required variables
- [ ] `.dockerignore` excludes `node_modules`, `.git`, `dist`
- [ ] Backend service depends on `postgres` and `redis` health checks
- [ ] PostgreSQL data persisted via named volume
- [ ] `GET /health` endpoint returns `{ status: 'ok', timestamp }` (no auth required)
- [ ] Backend runs migrations on startup before accepting connections
- [ ] `docker compose up -d` brings up the entire stack successfully

### Implementation Protocol

**[ENGINEER]** Create `Dockerfile` with multi-stage build (Node 20 Alpine). Create `docker-compose.yml` with backend, postgres (with health check `pg_isready`), redis (with health check `redis-cli ping`). Create `.dockerignore`. Add `GET /health` endpoint in `AppController`. Add startup migration script.

**[REVIEWER]** Verify multi-stage build minimizes image size. Verify health checks are correct. Verify environment variables are passed correctly to containers. Verify no secrets in `Dockerfile`. Check that `node_modules` are not copied from host.

**[TESTER]** Test `GET /health` returns 200 with correct shape. Test that the health endpoint has no auth requirement. Verify Docker build completes without errors (dry run).

**[VALIDATOR]** Run `docker compose build`. Run `docker compose up -d`. Verify all 3 containers are healthy. `curl GET http://localhost:3000/health` — verify response. Run `docker compose down`. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.

---

## TASK-15: Traefik Setup

**Status**: TODO
**Depends on**: TASK-14
**Estimated complexity**: S

### Acceptance Criteria

- [ ] Traefik service added to `docker-compose.yml`
- [ ] `api.localhost` routes to backend service
- [ ] `localhost` routes to frontend placeholder (nginx serving static page)
- [ ] Traefik dashboard accessible at `traefik.localhost`
- [ ] Labels-based routing (no static Traefik config files)
- [ ] HTTPS not required for local development
- [ ] Frontend placeholder serves a simple "SoilTech Frontend — Coming Soon" page

### Implementation Protocol

**[ENGINEER]** Add `traefik` service to `docker-compose.yml` with API dashboard enabled. Add Docker labels to `backend` service for `api.localhost` routing. Create a minimal `frontend` service (nginx with `index.html` placeholder). Add labels for `localhost` → frontend and `traefik.localhost` → dashboard. Expose ports 80 and 8080.

**[REVIEWER]** Verify Traefik labels syntax. Verify routing rules are correct (Host-based). Verify dashboard is accessible. Verify no conflicts between services. Check that the frontend placeholder is minimal.

**[TESTER]** Test Traefik config syntax (dry run with `traefik --configtest` or equivalent). Verify labels are present on all routed services.

**[VALIDATOR]** Run `docker compose up -d`. `curl -H "Host: api.localhost" http://localhost/health` — verify backend response. `curl -H "Host: localhost" http://localhost` — verify frontend placeholder. Open `http://traefik.localhost:8080` — verify dashboard loads. Run `git log --oneline -10` and confirm commits before marking `VALIDATED ✓`.
