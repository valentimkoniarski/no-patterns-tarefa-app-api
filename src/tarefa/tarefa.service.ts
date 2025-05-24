import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PrioridadeTarefa,
  StatusTarefa,
  Tarefa as TarefaPrisma,
  TarefaTipo,
} from '@prisma/client';
import { Tarefa, TarefaProps } from './tarefa';

export interface FiltrosTarefa {
  status?: StatusTarefa;
  tipo?: 'SIMPLES' | 'PROJETO';
  prioridade?: PrioridadeTarefa;
  concluida?: boolean;
  dataInicio?: Date;
  dataFim?: Date;
}

export type TarefaDto = {
  id?: number;
  titulo: string;
  subtitulo: string;
  descricao: string;
  dataPrazo?: Date;
  concluida?: boolean;
  tarefaPaiId?: number;
  status?: StatusTarefa;
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

export type Operator = 'eq' | 'contains' | 'gt' | 'lt' | 'range';

export interface FilterOp {
  field: string;
  op: Operator;
  value: any;
}

export interface ListarTarefasDTO {
  pagina?: number;
  limite?: number;
  filtros?: FilterOp[];
}

@Injectable()
export class TarefaService {
  constructor(private prisma: PrismaService) {}

  async listarTarefas(
    pagina: number = 1,
    limite: number = 10,
    filtros?: FilterOp[],
  ) {
    const skip = (pagina - 1) * limite;
    const where: any = {};

    if (filtros) {
      for (const filtro of filtros) {
        switch (filtro.op) {
          case 'eq':
            where[filtro.field] = filtro.value;
            break;
          case 'contains':
            where[filtro.field] = { contains: String(filtro.value) };
            break;
          case 'gt':
            where[filtro.field] = { gt: filtro.value };
            break;
          case 'lt':
            where[filtro.field] = { lt: filtro.value };
            break;
          case 'range':
            where[filtro.field] = {};
            if (filtro.value.start !== undefined)
              where[filtro.field].gte = filtro.value.start;
            if (filtro.value.end !== undefined)
              where[filtro.field].lte = filtro.value.end;
            break;
          default:
            throw new BadRequestException(`Operador inválido: ${filtro.op}`);
        }
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.tarefa.findMany({
        where,
        skip,
        take: limite,
        include: { subtarefas: true },
        orderBy: { id: 'desc' },
      }),
      this.prisma.tarefa.count({ where }),
    ]);

    return {
      tarefas: rows.map((t) => this.mapearDominio(t)),
      paginacao: {
        pagina,
        limite,
        total,
        totalPaginas: Math.ceil(total / limite),
      },
    };
  }

  async tarefaDetalhes(id: number) {
    const tarefaExistente = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });
    const tarefa = this.mapearDominio(tarefaExistente);
    const sumario = tarefa.obterSumario();

    return {
      sumario,
      tarefaExistente,
    };
  }

  async criarTarefa(dto: TarefaDto) {
    const props: TarefaProps = {
      titulo: dto.titulo,
      subtitulo: dto.subtitulo,
      descricao: dto.descricao,
      dataPrazo: dto.dataPrazo,
      concluida: dto.concluida ?? false,
      tipo: dto.tipo,
      status: dto.status ?? StatusTarefa.PENDENTE,
      tarefaPai: dto.tarefaPaiId ? ({ id: dto.tarefaPaiId } as any) : undefined,
      ...(dto.tipo === TarefaTipo.SIMPLES && {
        prioridade: dto.prioridade,
        pontos: dto.pontos,
        tempoEstimadoDias: dto.tempoEstimadoDias,
      }),
      ...(dto.tipo === TarefaTipo.PROJETO && {
        subtarefas: dto.subtarefasIds
          ? dto.subtarefasIds.map((id) => ({ id }) as any)
          : [],
        limiteSubtarefas: dto.limite,
      }),
    };

    const tarefa = new Tarefa(props);

    const data = tarefa.toPrisma();
    await this.prisma.tarefa.create({ data });
    return tarefa;
  }

  async atualizarTarefa(id: number, dto: Partial<TarefaDto>) {
    const tarefaPrisma = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });

    const subtarefasCompletas = dto.subtarefasIds
      ? await this.prisma.tarefa.findMany({
          where: {
            id: { in: dto.subtarefasIds },
          },
          include: { tarefaPai: true },
        })
      : [];

    const propsAtualizados = {
      ...tarefaPrisma,
      ...dto,
      subtarefas: subtarefasCompletas,
    };

    const tarefa = this.mapearDominio(propsAtualizados)

    await this.prisma.tarefa.update({
      where: { id },
      data: tarefa.toPrisma(),
    });

    if (dto.subtarefasIds) {
      await this.prisma.tarefa.update({
        where: { id },
        data: {
          subtarefas: {
            connect: dto.subtarefasIds.map((id) => ({ id })),
          },
        },
      });
    }

    return tarefa;
  }

  async apagarTarefa(id: number) {
    await this.prisma.tarefa.delete({ where: { id } });
  }

  async iniciarTarefa(id: number) {
    const tarefaExistente = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });

    const tarefa = this.mapearDominio(tarefaExistente);
    tarefa.iniciar();

    await this.prisma.tarefa.update({
      where: { id },
      data: {
        status: tarefa.getStatus,
        subtarefas: {
          updateMany: tarefa.subtarefas.map((subtarefa) => ({
            where: { id: subtarefa.id },
            data: {
              status: subtarefa.getStatus,
            },
          })),
        },
      },
    });
  }

  async concluirTarefa(id: number) {
    const tarefaExistente = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });

    const tarefa = this.mapearDominio(tarefaExistente);
    tarefa.concluir();

    await this.prisma.tarefa.update({
      where: { id },
      data: {
        status: tarefa.getStatus,
        concluida: tarefa.getConcluida,
        subtarefas: {
          updateMany: tarefa.subtarefas.map((subtarefa) => ({
            where: { id: subtarefa.id },
            data: {
              status: subtarefa.getStatus,
              concluida: subtarefa.getConcluida,
            },
          })),
        },
      },
    });
  }

  async clonarTarefa(id: number, dto?: Partial<TarefaDto>) {
    const tarefaExistente = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });

    const tarefa = this.mapearDominio(tarefaExistente);
    const tarefaClonada = tarefa.clonar(dto);

    if (!tarefaClonada) throw new NotFoundException('Tarefa não encontrada');

    const tarefaParaPrisma = tarefaClonada.toPrisma();

    await this.prisma.tarefa.create({
      data: {
        ...tarefaParaPrisma,
        subtarefas: {
          createMany: {
            data: tarefaClonada.subtarefas.map((subtarefa) => ({
              ...subtarefa.toPrisma(),
              tarefaPaiId: undefined,
            })),
          },
        },
      },
    });
    return tarefaClonada;
  }

  private mapearDominio(
    tarefaPrisma: TarefaPrisma & { subtarefas?: TarefaPrisma[] },
  ) {
    const props: TarefaProps = {
      id: tarefaPrisma.id,
      titulo: tarefaPrisma.titulo,
      subtitulo: tarefaPrisma.subtitulo,
      descricao: tarefaPrisma.descricao,
      dataPrazo: tarefaPrisma.dataPrazo ?? undefined,
      status: tarefaPrisma.status,
      concluida: tarefaPrisma.concluida,
      tipo: tarefaPrisma.tipo,
      tarefaPai: tarefaPrisma.tarefaPaiId
        ? ({ id: tarefaPrisma.tarefaPaiId } as Tarefa)
        : undefined,
      ...(tarefaPrisma.tipo === TarefaTipo.SIMPLES && {
        prioridade: tarefaPrisma.prioridade ?? PrioridadeTarefa.BAIXA,
        pontos: tarefaPrisma.pontos ?? 0,
        tempoEstimadoDias: tarefaPrisma.tempoEstimadoDias ?? 0,
      }),
      ...(tarefaPrisma.tipo === TarefaTipo.PROJETO && {
        subtarefas:
          tarefaPrisma.subtarefas?.map((st) => this.mapearDominio(st)) ?? [],
        limiteSubtarefas: tarefaPrisma.limiteSubtarefas ?? undefined,
      }),
    };

    return new Tarefa(props);
  }
}
