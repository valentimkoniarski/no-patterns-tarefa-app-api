import { Module } from '@nestjs/common';
import { TarefaModule } from './tarefa/tarefa.module';
import { TarefaController } from './tarefa/tarefa.controller';
import { TarefaService } from './tarefa/tarefa.service';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        switch (process.env.NODE_ENV) {
          case 'test':
            return '.env.test';
          case 'production':
            return '.env.prod';
          default:
            return '.env'; // default é dev
        }
      })(),
    }),
    TarefaModule,
  ],
  controllers: [TarefaController],
  providers: [TarefaService, PrismaService],
})
export class AppModule {}
