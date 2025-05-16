import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TarefaModule } from './tarefa/tarefa.module';

@Module({
  imports: [TarefaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
