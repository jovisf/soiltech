import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';

@Injectable()
export class FarmsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFarmDto: CreateFarmDto) {
    return this.prisma.farm.create({
      data: createFarmDto,
    });
  }

  async findAll() {
    return this.prisma.farm.findMany({
      include: {
        _count: {
          select: { pivots: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { id },
      include: {
        pivots: true,
      },
    });

    if (!farm) {
      throw new NotFoundException(`Farm with ID ${id} not found`);
    }

    return farm;
  }

  async update(id: string, updateFarmDto: UpdateFarmDto) {
    await this.findOne(id);

    return this.prisma.farm.update({
      where: { id },
      data: updateFarmDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.farm.delete({
      where: { id },
    });
  }
}
