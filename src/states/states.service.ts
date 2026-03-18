import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

@Injectable()
export class StatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByPivot(pivotId: string, paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 20 } = paginationQuery;
    const skip = (page - 1) * limit;

    // Check if pivot exists
    const pivot = await this.prisma.pivot.findUnique({
      where: { id: pivotId },
    });

    if (!pivot) {
      throw new NotFoundException(`Pivot with ID ${pivotId} not found`);
    }

    const [total, data] = await Promise.all([
      this.prisma.state.count({
        where: { pivotId },
      }),
      this.prisma.state.findMany({
        where: { pivotId },
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
