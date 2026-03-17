# Skill: Prisma Migrations

## When to use

Every time the database schema changes (add model, add field, change relation, add index).

## Commands

| Action                   | Command                                | When                                       |
| ------------------------ | -------------------------------------- | ------------------------------------------ |
| Create migration         | `npx prisma migrate dev --name <name>` | Development only                           |
| Apply pending migrations | `npx prisma migrate deploy`            | Staging / production                       |
| Reset database           | `npx prisma migrate reset`             | Development only — **NEVER in production** |
| Regenerate client        | `npx prisma generate`                  | After manual schema edits                  |
| View migration status    | `npx prisma migrate status`            | Any environment                            |

## Step-by-step: Adding a new model

### 1. Edit `prisma/schema.prisma`

```prisma
model Farm {
  id        String   @id @default(uuid())
  name      String
  latitude  Float
  longitude Float
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  pivots    Pivot[]

  @@map("farms")
}
```

### 2. Generate and apply migration

```bash
npx prisma migrate dev --name add-farm-model
```

This will:

1. Generate a SQL migration file in `prisma/migrations/`
2. Apply it to the development database
3. Regenerate the Prisma Client

### 3. Verify

```bash
npx prisma migrate status
```

## Migration naming convention

Use descriptive kebab-case names:

- `add-farm-model`
- `add-pivot-status-json`
- `add-user-role-enum`
- `create-state-cycles-tables`
- `add-index-pivot-farm-id`

## Seeding

### 1. Create seed script

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@soiltech.com" },
    update: {},
    create: {
      email: "admin@soiltech.com",
      name: "Admin",
      password: "<hashed>",
      role: "ADMIN",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

### 2. Add to `package.json`

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### 3. Run seed

```bash
npx prisma db seed
```

## Critical rules

> **NEVER** run `prisma migrate reset` in production. It drops all data.

> **NEVER** manually edit a migration file after it has been applied. Create a new migration instead.

> **ALWAYS** commit the migration SQL file alongside the schema change. The migration file is the source of truth for what runs in production.
