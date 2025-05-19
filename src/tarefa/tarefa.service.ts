import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TarefaSimples, TarefaSimplesProps } from './tarefa-simples.entity';
import { TarefaProjeto } from './tarefa-projeto.entity';
import { PrioridadeTarefa } from '@prisma/client';

export type TarefaDto = {
  titulo: string;
  subtitulo: string;
  descricao: string;
  dataPrazo?: Date;
  concluida?: boolean;
  tarefaPai?: number;
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

  private mapearTarefaExistente(tarefaExistente) {
    const tarefaBase = {
      titulo: tarefaExistente.titulo,
      subtitulo: tarefaExistente.subTitulo,
      descricao: tarefaExistente.descricao,
      dataPrazo: tarefaExistente.dataPrazo ?? undefined,
      status: tarefaExistente.status,
      tipo: tarefaExistente.tipo,
    };

    if (tarefaExistente.tipo === 'PROJETO') {
      return TarefaProjeto.criar({
        ...tarefaBase,
        limite: tarefaExistente.limite ?? undefined,
        subtarefas: (tarefaExistente.subtarefas ?? []).map((sub) => ({
          ...sub,
          subtitulo: tarefaExistente.subTitulo,
          dataPrazo: tarefaExistente.dataPrazo ?? undefined,
          tarefaPaiId: tarefaExistente.tarefaPaiId ?? undefined,
          prioridade: tarefaExistente.prioridade ?? PrioridadeTarefa.MEDIA,
          pontos: tarefaExistente.pontos ?? 0,
          tempoEstimadoDias: tarefaExistente.tempoEstimadoDias ?? 0,
        })),
      });
    } else if (tarefaExistente.tipo === 'SIMPLES') {
      return TarefaSimples.criar({
        ...tarefaBase,
        tarefaPaiId: tarefaExistente.tarefaPaiId ?? undefined,
        prioridade: tarefaExistente.prioridade ?? PrioridadeTarefa.MEDIA,
        pontos: tarefaExistente.pontos ?? 0,
        tempoEstimadoDias: tarefaExistente.tempoEstimadoDias ?? 0,
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
      tarefa = TarefaSimples.criar(dto);
    } else {
      if (dto.subtarefasIds && dto.subtarefasIds.length > 0) {
        await this.validarSubtarefas(dto.subtarefasIds);
      }

      tarefa = TarefaProjeto.criar(dto);
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

  async atualizarTarefa(id: number, dto: any) {
    const tarefaExistente = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });

    const tarefa = this.mapearTarefaExistente(tarefaExistente);

    if (tarefa.tipo === 'PROJETO') {
      if (dto.subtarefasIds && dto.subtarefasIds.length > 0) {
        await this.validarSubtarefas(dto.subtarefasIds);
      }

      tarefa.atualizar(dto);
    } else if (dto.tipo === 'SIMPLES') {
      tarefa.atualizar(dto);
    }

    console.log('tarefa', tarefa);

    await this.prisma.tarefa.update({
      where: { id },
      data: tarefa.toPrisma(),
    });
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
