import { Module } from '@nestjs/common';
import { TarefaModule } from './tarefa/tarefa.module';
import { TarefaController } from './tarefa/tarefa.controller';
import { TarefaService } from './tarefa/tarefa.service';
import { TarefaBase } from './tarefa/domain/tarefa.entity';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [TarefaModule],
  controllers: [TarefaController],
  providers: [TarefaService, PrismaService],
})
export class AppModule {}
