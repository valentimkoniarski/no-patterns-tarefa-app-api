import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TarefaSimples, TarefaSimplesProps } from './tarefa-simples.entity';
import { TarefaProjeto } from './tarefa-projeto.entity';
import { PrioridadeTarefa } from '@prisma/client';

export type CriarTarefaDto = {
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
    const dadosTarefa = {
      ...tarefaExistente,
      subtitulo: tarefaExistente.subTitulo,
      dataPrazo: tarefaExistente.dataPrazo ?? undefined,
      tarefaPaiId: tarefaExistente.tarefaPaiId ?? undefined,
      prioridade: tarefaExistente.prioridade ?? PrioridadeTarefa.MEDIA,
      pontos: tarefaExistente.pontos ?? 0,
      tempoEstimadoDias: tarefaExistente.tempoEstimadoDias ?? 0,
    };

    if (tarefaExistente.tipo === 'PROJETO') {
      return TarefaProjeto.criar({
        ...dadosTarefa,
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
    }

    return TarefaSimples.criar(dadosTarefa);
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

  async criarTarefa(dto: CriarTarefaDto) {
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


    console.log(tarefa);

    tarefa.concluirTarefa();

    // O campo `updatedAt` será automaticamente atualizado pelo Prisma
    await this.prisma.tarefa.update({
      where: { id },
      data: {
        status: 'CONCLUIDA',
        concluida: true,
      },
    });
  }
}
