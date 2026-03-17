## Summary
The database schema for User, Farm, Pivot, State, and Cycle models, along with the Role enum, has been defined in `prisma/schema.prisma`. Relationships, UUID defaults, and `@@map` for snake_case table names have been set up.

## Files
- `prisma/schema.prisma`

## Deviations
- None.

## Blockers
The `npx prisma migrate dev --name initial-schema` command failed with "P1001: Can't reach database server at `localhost:5432`". This indicates that a PostgreSQL database instance is not running or accessible. Since `TASK-14: Dockerization` has not yet been implemented, `docker-compose.yml` does not exist, preventing the use of `docker compose up -d` to start the database. A running PostgreSQL instance is required to apply the migration and proceed with this task.
