# Skill: Scaffold a NestJS Module

## When to use

Every time a new domain module is added to the project (e.g., `farms`, `pivots`, `weather`).

## File structure

```
src/<module>/
  <module>.module.ts
  <module>.controller.ts
  <module>.service.ts
  dto/
    create-<entity>.dto.ts
    update-<entity>.dto.ts
```

## Step-by-step

### 1. Create the module file

```typescript
// src/farms/farms.module.ts
import { Module } from "@nestjs/common";
import { FarmsService } from "./farms.service";
import { FarmsController } from "./farms.controller";
import { PrismaModule } from "@/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [FarmsController],
  providers: [FarmsService],
  exports: [FarmsService],
})
export class FarmsModule {}
```

### 2. Create the service (repository pattern via Prisma)

```typescript
// src/farms/farms.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CreateFarmDto } from "./dto/create-farm.dto";
import { UpdateFarmDto } from "./dto/update-farm.dto";

@Injectable()
export class FarmsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateFarmDto) {
    return this.prisma.farm.create({ data: dto });
  }

  findAll() {
    return this.prisma.farm.findMany();
  }

  async findOne(id: string) {
    const farm = await this.prisma.farm.findUnique({ where: { id } });
    if (!farm) throw new NotFoundException(`Farm ${id} not found`);
    return farm;
  }

  async update(id: string, dto: UpdateFarmDto) {
    await this.findOne(id);
    return this.prisma.farm.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.farm.delete({ where: { id } });
  }
}
```

### 3. Create the controller

```typescript
// src/farms/farms.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { FarmsService } from "./farms.service";
import { CreateFarmDto } from "./dto/create-farm.dto";
import { UpdateFarmDto } from "./dto/update-farm.dto";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@prisma/client";

@Controller("farms")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.OPERATOR)
  create(@Body() dto: CreateFarmDto) {
    return this.farmsService.create(dto);
  }

  @Get()
  findAll() {
    return this.farmsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.farmsService.findOne(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN, Role.OPERATOR)
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateFarmDto) {
    return this.farmsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.farmsService.remove(id);
  }
}
```

### 4. Create DTOs

```typescript
// src/farms/dto/create-farm.dto.ts
import { IsNotEmpty, IsString, IsNumber } from "class-validator";

export class CreateFarmDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;
}
```

```typescript
// src/farms/dto/update-farm.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { CreateFarmDto } from "./create-farm.dto";

export class UpdateFarmDto extends PartialType(CreateFarmDto) {}
```

### 5. Register in AppModule

```typescript
import { FarmsModule } from "./farms/farms.module";

@Module({
  imports: [
    // ...existing modules
    FarmsModule,
  ],
})
export class AppModule {}
```

## Import chain

```
AppModule → FarmsModule → PrismaModule
                        → FarmsController → FarmsService → PrismaService
```

## Checklist

- [ ] Module file created and imports PrismaModule
- [ ] Service uses PrismaService directly (no separate repository class)
- [ ] Controller uses `ParseUUIDPipe` for all `:id` params
- [ ] DTOs use `class-validator` decorators
- [ ] Guards applied at controller level
- [ ] Module registered in `AppModule`
