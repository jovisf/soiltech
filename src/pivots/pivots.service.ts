import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePivotDto } from './dto/create-pivot.dto';
import { UpdatePivotDto } from './dto/update-pivot.dto';

@Injectable()
export class PivotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(farmId: string, createPivotDto: CreatePivotDto) {
    // Validate farm existence
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
    });

    if (!farm) {
      throw new NotFoundException(`Farm with ID ${farmId} not found`);
    }

    return this.prisma.pivot.create({
      data: {
        ...createPivotDto,
        farmId,
        status: {}, // Initial status
      },
    });
  }

  async findAllByFarm(farmId: string) {
    // Check if farm exists (optional but good for consistency)
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
    });

    if (!farm) {
      throw new NotFoundException(`Farm with ID ${farmId} not found`);
    }

    return this.prisma.pivot.findMany({
      where: { farmId },
    });
  }

  async findOne(id: string) {
    const pivot = await this.prisma.pivot.findUnique({
      where: { id },
    });

    if (!pivot) {
      throw new NotFoundException(`Pivot with ID ${id} not found`);
    }

    return pivot;
  }

  async update(id: string, updatePivotDto: UpdatePivotDto) {
    await this.findOne(id);

    return this.prisma.pivot.update({
      where: { id },
      data: updatePivotDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.pivot.delete({
      where: { id },
    });
  }
}
