import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TarefaSimples } from './domain/tarefa-simples.entity';
import { TarefaProjeto } from './domain/tarefa-projeto.entity';
import { PrioridadeTarefa, StatusTarefa, Tarefa } from '@prisma/client';

export type TarefaDto = {
  id?: number;
  titulo: string;
  subtitulo: string;
  descricao: string;
  dataPrazo?: Date;
  concluida?: boolean;
  tarefaPai?: number;
  status?: StatusTarefa
} & (
  | {
      tipo: 'SIMPLES';
      prioridade: PrioridadeTarefa;
      pontos: number;
      tempoEstimadoDias: number;
      subtarefasIds?: never;
      limite?: never;
    }
  | {
      tipo: 'PROJETO';
      subtarefasIds: number[];
      limite?: number;
      prioridade?: never;
      pontos?: never;
      tempoEstimadoDias?: never;
    }
);

@Injectable()
export class TarefaService {
  constructor(private prisma: PrismaService) {}

  private mapearTarefaExistente(
    tarefaPrisma: Tarefa & { subtarefas?: { id: number }[] },
  ) {
    const tarefaBase = {
      titulo: tarefaPrisma.titulo,
      subtitulo: tarefaPrisma.subTitulo,
      descricao: tarefaPrisma.descricao,
      dataPrazo: tarefaPrisma.dataPrazo ?? undefined,
      status: tarefaPrisma.status,
      tipo: tarefaPrisma.tipo,
    };

    if (tarefaPrisma.tipo === 'PROJETO') {
      return new TarefaProjeto({
        ...tarefaBase,
        limiteSubtarefas: tarefaPrisma.limite ?? undefined,
        subtarefasIds: tarefaPrisma.subtarefas
          ? tarefaPrisma.subtarefas.map((st) => st.id)
          : [],
      });
    } else if (tarefaPrisma.tipo === 'SIMPLES') {
      return new TarefaSimples({
        ...tarefaBase,
        tarefaPaiId: tarefaPrisma.tarefaPaiId ?? undefined,
        prioridade: tarefaPrisma.prioridade ?? PrioridadeTarefa.BAIXA,
        pontos: tarefaPrisma.pontos ?? 0,
        tempoEstimadoDias: tarefaPrisma.tempoEstimadoDias ?? 0,
      });
    }

    throw new BadRequestException('Tipo de tarefa inválido');
  }

  private async validarSubtarefas(subtarefasIds: number[]) {
    const subtarefas = await this.prisma.tarefa.findMany({
      where: {
        id: { in: subtarefasIds },
        tipo: 'SIMPLES',
      },
      select: { id: true, tarefaPaiId: true },
    });

    const encontrados = subtarefas.map((s) => s.id);
    const faltantes = subtarefasIds.filter((id) => !encontrados.includes(id));
    if (faltantes.length > 0) {
      throw new NotFoundException(
        `Subtarefas não encontradas: ${faltantes.join(', ')}`,
      );
    }

    const jaVinculada = subtarefas.find((s) => s.tarefaPaiId != null);
    if (jaVinculada) {
      throw new BadRequestException(`Subtarefa ${jaVinculada.id} já tem pai`);
    }
  }

  async criarTarefa(dto: TarefaDto) {
    let tarefa;
    if (dto.tipo === 'SIMPLES') {
      tarefa = new TarefaSimples({
        titulo: dto.titulo,
        subtitulo: dto.subtitulo,
        descricao: dto.descricao,
        dataPrazo: dto.dataPrazo,
        concluida: dto.concluida ?? false,
        prioridade: dto.prioridade,
        pontos: dto.pontos,
        tempoEstimadoDias: dto.tempoEstimadoDias,
        tipo: 'SIMPLES',
      });
    } else if (dto.tipo === 'PROJETO') {
      if (dto.subtarefasIds && dto.subtarefasIds.length > 0) {
        await this.validarSubtarefas(dto.subtarefasIds);
      }

      tarefa = new TarefaProjeto({
        titulo: dto.titulo,
        subtitulo: dto.subtitulo,
        descricao: dto.descricao,
        dataPrazo: dto.dataPrazo,
        concluida: dto.concluida ?? false,
        limiteSubtarefas: dto.limite,
        subtarefasIds: dto.subtarefasIds ?? [],
        tipo: 'PROJETO',
      });
    }

    if (dto.tarefaPai) {
      const pai = await this.prisma.tarefa.findUnique({
        where: { id: dto.tarefaPai },
      });
      if (!pai) throw new NotFoundException('Tarefa pai não encontrada');
      if (pai.tipo !== dto.tipo)
        throw new BadRequestException('Tipo de pai inválido');
    }

    const data = tarefa.toPrisma();
    await this.prisma.tarefa.create({ data });
    return tarefa;
  }

  async atualizarTarefa(id: number, dto: TarefaDto) {
    const tarefaPrisma = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });

    const dtoCompleto = {
      ...tarefaPrisma,
      ...dto,
    } as unknown as TarefaDto;

    if (dtoCompleto.subtarefasIds && dtoCompleto.subtarefasIds.length > 0) {
      await this.validarSubtarefas(dtoCompleto.subtarefasIds);
    }

    const tarefa =
      tarefaPrisma.tipo === 'SIMPLES'
        ? TarefaSimples.atualizar(dtoCompleto)
        : TarefaProjeto.atualizar(dtoCompleto);

    await this.prisma.tarefa.update({
      where: { id },
      data: tarefa.toPrisma(),
    });
  }

  async apagarTarefa(id: number) {
    await this.prisma.tarefa.delete({ where: { id } });
  }

  async iniciarTarefa(id: number) {
    const tarefaExistente = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });

    const tarefa = this.mapearTarefaExistente(tarefaExistente);
    tarefa.iniciarTarefa();

    await this.prisma.tarefa.update({
      where: { id },
      data: {
        status: tarefa.getStatus,
      },
    });
  }

  async concluirTarefa(id: number) {
    const tarefaExistente = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });

    const tarefa = this.mapearTarefaExistente(tarefaExistente);
    tarefa.concluirTarefa();

    await this.prisma.tarefa.update({
      where: { id },
      data: {
        status: 'CONCLUIDA',
        concluida: true,
      },
    });
  }

  async obterSumario(id: number) {
    const tarefaExistente = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });
    const tarefa = this.mapearTarefaExistente(tarefaExistente);
    const sumario = tarefa.obterSumario();

    return {
      sumario,
    };
  }
}
