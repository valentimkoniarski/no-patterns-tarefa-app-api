import { Module } from '@nestjs/common';
import { TarefaModule } from './tarefa/tarefa.module';
import { TarefaController } from './tarefa/tarefa.controller';
import { TarefaService } from './tarefa/tarefa.service';
import { Tarefa } from './tarefa/tarefa.entity';

@Module({
  imports: [TarefaModule, Tarefa],
  controllers: [TarefaController],
  providers: [TarefaService],
})
export class AppModule {}
