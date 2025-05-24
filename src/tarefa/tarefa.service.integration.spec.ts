import { Test, TestingModule } from '@nestjs/testing';
import { TarefaService } from './tarefa.service';
import { PrismaService } from '../prisma/prisma.service';
import { StatusTarefa, PrioridadeTarefa } from '@prisma/client';

describe('TarefaService Integration Tests', () => {
  let service: TarefaService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TarefaService, PrismaService],
    }).compile();

    service = module.get<TarefaService>(TarefaService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.tarefa.deleteMany();
  });

  it('deve criar uma tarefa simples com sucesso', async () => {
    const tarefa = await service.criarTarefa({
      titulo: 'Tarefa Simples',
      subtitulo: 'simples',
      descricao: 'descrição simples',
      tipo: 'SIMPLES',
      prioridade: 'ALTA',
      pontos: 3,
      tempoEstimadoDias: 2,
    });

    expect(tarefa).toHaveProperty('id');
    expect(tarefa.titulo).toBe('Tarefa Simples');
    expect(tarefa.subtitulo).toBe('simples');
    expect(tarefa.descricao).toBe('descrição simples');
    expect(tarefa.tipo).toBe('SIMPLES');
    expect(tarefa.prioridade).toBe('ALTA');
    expect(tarefa.pontos).toBe(3);
    expect(tarefa.tempoEstimadoDias).toBe(2);
  });

  it('deve criar uma tarefa do tipo projeto com sucesso', async () => {
    const tarefa = await service.criarTarefa({
      titulo: 'Projeto Teste',
      subtitulo: 'projeto',
      descricao: 'descrição do projeto',
      tipo: 'PROJETO',
      subtarefasIds: [],
      limite: 5,
    });

    expect(tarefa).toHaveProperty('id');
    expect(tarefa.titulo).toBe('Projeto Teste');
    expect(tarefa.tipo).toBe('PROJETO');
    expect(tarefa.limiteSubtarefas).toBe(5);
  });

  it('deve listar tarefas com paginação', async () => {
    // Criar algumas tarefas
    await service.criarTarefa({
      titulo: 'Tarefa 1',
      subtitulo: 'teste',
      descricao: 'descrição 1',
      tipo: 'SIMPLES',
      prioridade: 'ALTA',
      pontos: 1,
      tempoEstimadoDias: 1,
    });

    await service.criarTarefa({
      titulo: 'Tarefa 2',
      subtitulo: 'teste',
      descricao: 'descrição 2',
      tipo: 'SIMPLES',
      prioridade: 'MEDIA',
      pontos: 2,
      tempoEstimadoDias: 2,
    });

    const resultado = await service.listarTarefas(1, 10);

    expect(resultado.tarefas).toHaveLength(2);
    expect(resultado.paginacao.total).toBe(2);
    expect(resultado.paginacao.pagina).toBe(1);
    expect(resultado.paginacao.limite).toBe(10);
    expect(resultado.paginacao.totalPaginas).toBe(1);
  });

  it('deve filtrar tarefas por status', async () => {
    await service.criarTarefa({
      titulo: 'Tarefa Pendente',
      subtitulo: 'teste',
      descricao: 'descrição',
      tipo: 'SIMPLES',
      prioridade: 'ALTA',
      pontos: 1,
      tempoEstimadoDias: 1,
    });

    const tarefaConcluida = await service.criarTarefa({
      titulo: 'Tarefa Concluída',
      subtitulo: 'teste',
      descricao: 'descrição',
      tipo: 'SIMPLES',
      prioridade: 'ALTA',
      pontos: 1,
      tempoEstimadoDias: 1,
    });

    await service.iniciarTarefa(tarefaConcluida.id as number);
    expect(tarefaConcluida.getStatus).toBe(StatusTarefa.PENDENTE);

    await service.concluirTarefa(tarefaConcluida.id as number);

    const resultado = await service.listarTarefas(1, 10, [
      { field: 'status', op: 'eq', value: StatusTarefa.CONCLUIDA },
    ]);

    expect(resultado.tarefas).toHaveLength(1);
    expect(resultado.tarefas[0].titulo).toBe('Tarefa Concluída');
  });

  it('deve filtrar tarefas por texto no título', async () => {
    await service.criarTarefa({
      titulo: 'Tarefa Importante',
      subtitulo: 'teste',
      descricao: 'descrição',
      tipo: 'SIMPLES',
      prioridade: 'ALTA',
      pontos: 1,
      tempoEstimadoDias: 1,
    });

    await service.criarTarefa({
      titulo: 'Outra Tarefa',
      subtitulo: 'teste',
      descricao: 'descrição',
      tipo: 'SIMPLES',
      prioridade: 'ALTA',
      pontos: 1,
      tempoEstimadoDias: 1,
    });

    const resultado = await service.listarTarefas(1, 10, [
      { field: 'titulo', op: 'contains', value: 'Importante' },
    ]);

    expect(resultado.tarefas).toHaveLength(1);
    expect(resultado.tarefas[0].titulo).toBe('Tarefa Importante');
  });

  it('deve filtrar tarefas por data de prazo', async () => {
    const dataInicio = new Date('2024-01-01');
    const dataFim = new Date('2024-12-31');

    await service.criarTarefa({
      titulo: 'Tarefa 2024',
      subtitulo: 'teste',
      descricao: 'descrição',
      tipo: 'SIMPLES',
      prioridade: 'ALTA',
      pontos: 1,
      tempoEstimadoDias: 1,
      dataPrazo: new Date('2024-06-15'),
    });

    await service.criarTarefa({
      titulo: 'Tarefa 2025',
      subtitulo: 'teste',
      descricao: 'descrição',
      tipo: 'SIMPLES',
      prioridade: 'ALTA',
      pontos: 1,
      tempoEstimadoDias: 1,
      dataPrazo: new Date('2025-01-15'),
    });

    const resultado = await service.listarTarefas(1, 10, [
      {
        field: 'dataPrazo',
        op: 'range',
        value: { start: dataInicio, end: dataFim },
      },
    ]);

    expect(resultado.tarefas).toHaveLength(1);
    expect(resultado.tarefas[0].titulo).toBe('Tarefa 2024');
  });

  it('deve filtrar tarefas por prioridade', async () => {
    await service.criarTarefa({
      titulo: 'Tarefa Alta',
      subtitulo: 'teste',
      descricao: 'descrição',
      tipo: 'SIMPLES',
      prioridade: 'ALTA',
      pontos: 1,
      tempoEstimadoDias: 1,
    });

    await service.criarTarefa({
      titulo: 'Tarefa Baixa',
      subtitulo: 'teste',
      descricao: 'descrição',
      tipo: 'SIMPLES',
      prioridade: 'BAIXA',
      pontos: 1,
      tempoEstimadoDias: 1,
    });

    const resultado = await service.listarTarefas(1, 10, [
      { field: 'prioridade', op: 'eq', value: PrioridadeTarefa.ALTA },
    ]);

    expect(resultado.tarefas).toHaveLength(1);
    expect(resultado.tarefas[0].titulo).toBe('Tarefa Alta');
  });

  it('deve retornar erro para operador inválido', async () => {
    await expect(
      service.listarTarefas(1, 10, [
        { field: 'titulo', op: 'invalid' as any, value: 'teste' },
      ]),
    ).rejects.toThrow('Operador inválido: invalid');
  });

  it('deve atualizar uma tarefa existente', async () => {
    const tarefaCriada = await service.criarTarefa({
      titulo: 'Tarefa Original',
      subtitulo: 'original',
      descricao: 'descrição original',
      tipo: 'SIMPLES',
      prioridade: 'BAIXA',
      pontos: 1,
      tempoEstimadoDias: 1,
    });

    const tarefaAtualizada = await service.atualizarTarefa(
      tarefaCriada.id as number,
      {
        titulo: 'Tarefa Atualizada',
        prioridade: 'ALTA',
      },
    );

    expect(tarefaAtualizada.titulo).toBe('Tarefa Atualizada');
    expect(tarefaAtualizada.prioridade).toBe('ALTA');
  });

  it('deve concluir uma tarefa', async () => {
    const tarefa = await service.criarTarefa({
      titulo: 'Tarefa para Concluir',
      subtitulo: 'teste',
      descricao: 'descrição',
      tipo: 'SIMPLES',
      prioridade: 'MEDIA',
      pontos: 2,
      tempoEstimadoDias: 1,
    });

    await service.iniciarTarefa(tarefa.id as number);
    expect(tarefa.getStatus).toBe(StatusTarefa.PENDENTE);

    await service.concluirTarefa(tarefa.id as number);

    const tarefaDetalhes = await service.tarefaDetalhes(tarefa.id as number);
    expect(tarefaDetalhes.tarefaExistente.status).toBe(StatusTarefa.CONCLUIDA);
    expect(tarefaDetalhes.tarefaExistente.concluida).toBe(true);
  });

  it('deve clonar uma tarefa', async () => {
    const tarefaOriginal = await service.criarTarefa({
      titulo: 'Tarefa Original',
      subtitulo: 'original',
      descricao: 'descrição original',
      tipo: 'SIMPLES',
      prioridade: 'ALTA',
      pontos: 3,
      tempoEstimadoDias: 2,
    });

    const tarefaClonada = await service.clonarTarefa(
      tarefaOriginal.id as number,
      {
        titulo: 'Tarefa Clonada',
      },
    );

    expect(tarefaClonada.id).not.toBe(tarefaOriginal.id);
    expect(tarefaClonada.titulo).toBe('Tarefa Clonada');
    expect(tarefaClonada.prioridade).toBe(tarefaOriginal.prioridade);
    expect(tarefaClonada.pontos).toBe(tarefaOriginal.pontos);
  });
});
