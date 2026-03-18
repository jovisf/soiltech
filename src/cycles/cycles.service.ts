import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

@Injectable()
export class CyclesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByState(
    pivotId: string,
    stateId: string,
    paginationQuery: PaginationQueryDto,
  ) {
    const { page = 1, limit = 20 } = paginationQuery;
    const skip = (page - 1) * limit;

    // Check if pivot exists
    const pivot = await this.prisma.pivot.findUnique({
      where: { id: pivotId },
    });

    if (!pivot) {
      throw new NotFoundException(`Pivot with ID ${pivotId} not found`);
    }

    // Check if state exists and belongs to the pivot
    const state = await this.prisma.state.findUnique({
      where: { id: stateId },
    });

    if (!state || state.pivotId !== pivotId) {
      throw new NotFoundException(
        `State with ID ${stateId} not found for pivot ${pivotId}`,
      );
    }

    const [total, data] = await Promise.all([
      this.prisma.cycle.count({
        where: { stateId },
      }),
      this.prisma.cycle.findMany({
        where: { stateId },
        skip,
        take: limit,
        orderBy: {
          timestamp: 'desc',
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      data,
    };
  }
}
