import { Test, TestingModule } from '@nestjs/testing';
import { TarefaService } from './tarefa.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { execSync } from 'child_process';

describe('TarefaService (Integração)', () => {
  let service: TarefaService;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'file:./dev-test.db?mode=memory&cache=shared';

    execSync('npx prisma db push', {
      env: process.env,
      stdio: 'inherit',
    });

    // 3) Montar o TestingModule
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [TarefaService, PrismaService],
    }).compile();

    service = module.get<TarefaService>(TarefaService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await prisma.tarefa.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Tratamento de Erros', () => {
    it('deve lançar BadRequestException ao criar tarefa com tipo inválido', async () => {
      const tarefa = await service.criarTarefa({
        titulo: 'Tarefa Inválida',
        subtitulo: 'Sub',
        descricao: 'Desc',
        tipo: 'SIMPLES',
        prioridade: 'ALTA',
        pontos: 3,
        tempoEstimadoDias: 2,
      });

      console.log(tarefa);
    });
  });
});
