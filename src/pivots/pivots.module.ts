import { Module } from '@nestjs/common';
import { PivotsService } from './pivots.service';
import { PivotsController } from './pivots.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PivotsController],
  providers: [PivotsService],
  exports: [PivotsService],
})
export class PivotsModule {}
