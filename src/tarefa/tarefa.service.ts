import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrioridadeTarefa, StatusTarefa, Tarefa as TarefaPrisma } from '@prisma/client';
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
      for (const f of filtros) {
        switch (f.op) {
          case 'eq':
            where[f.field] = f.value;
            break;
          case 'contains':
            where[f.field] = { contains: String(f.value) };
            break;
          case 'gt':
            where[f.field] = { gt: f.value };
            break;
          case 'lt':
            where[f.field] = { lt: f.value };
            break;
          case 'range':
            where[f.field] = {};
            if (f.value.start !== undefined) where[f.field].gte = f.value.start;
            if (f.value.end !== undefined) where[f.field].lte = f.value.end;
            break;
          default:
            throw new BadRequestException(`Operador inválido: ${f.op}`);
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
      tarefas: rows.map((t) => this.mapearTarefaExistente(t)),
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
    const tarefa = this.mapearTarefaExistente(tarefaExistente);
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
      status: dto.status ?? StatusTarefa.PENDENTE,
      tarefaPai: dto.tarefaPaiId ? { id: dto.tarefaPaiId } as any : undefined,
      ...(dto.tipo === 'SIMPLES' && {
        prioridade: dto.prioridade,
        pontos: dto.pontos,
        tempoEstimadoDias: dto.tempoEstimadoDias,
      }),
      ...(dto.tipo === 'PROJETO' && {
        subtarefas: dto.subtarefasIds ? dto.subtarefasIds.map(id => ({ id } as any)) : [],
        limiteSubtarefas: dto.limite,
      }),
    };

    const tarefa = new Tarefa(props);

    if (dto.tarefaPaiId) {
      const pai = await this.prisma.tarefa.findUnique({
        where: { id: dto.tarefaPaiId },
      });
      if (!pai) throw new NotFoundException('Tarefa pai não encontrada');
      if (pai.tipo !== 'PROJETO')
        throw new BadRequestException('Tarefa pai deve ser do tipo PROJETO');
    }

    if (dto.tipo === 'PROJETO' && dto.subtarefasIds) {
      await this.validarSubtarefas(dto.subtarefasIds);
    }

    const data = tarefa.toPrisma();
    await this.prisma.tarefa.create({ data });
    return tarefa;
  }

  async atualizarTarefa(id: number, dto: Partial<TarefaDto>) {
    const tarefaPrisma = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });

    const propsAtualizados: TarefaProps = {
      ...this.mapearTarefaExistente(tarefaPrisma),
      ...dto,
      status: dto.status ?? this.mapearTarefaExistente(tarefaPrisma).status,
      concluida: dto.concluida ?? this.mapearTarefaExistente(tarefaPrisma).concluida,
      subtarefas: dto.subtarefasIds
        ? dto.subtarefasIds.map(id => ({ id } as any))
        : tarefaPrisma.subtarefas?.map(st => ({ id: st.id } as any)) || [],
    };

    const tarefa = new Tarefa(propsAtualizados);

    if (dto.subtarefasIds) {
      await this.validarSubtarefas(dto.subtarefasIds);
    }

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
    tarefa.iniciar();

    await this.prisma.tarefa.update({
      where: { id },
      data: {
        status: tarefa.status,
      },
    });
  }

  async concluirTarefa(id: number) {
    const tarefaExistente = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });

    const tarefa = this.mapearTarefaExistente(tarefaExistente);
    tarefa.concluir();

    await this.prisma.tarefa.update({
      where: { id },
      data: {
        status: tarefa.status,
        concluida: tarefa.concluida,
      },
    });
  }

  async clonarTarefa(id: number, dto?: Partial<TarefaDto>) {
    const tarefaExistente = await this.prisma.tarefa.findUniqueOrThrow({
      where: { id },
      include: { subtarefas: true },
    });

    const tarefa = this.mapearTarefaExistente(tarefaExistente);
    const tarefaClonada = tarefa.clonar(dto);
    const data = tarefaClonada.toPrisma();
    await this.prisma.tarefa.create({ data });
    return tarefaClonada;
  }

  private mapearTarefaExistente(tarefaPrisma: TarefaPrisma & { subtarefas?: { id: number }[] }) {
    const props: TarefaProps = {
      id: tarefaPrisma.id,
      titulo: tarefaPrisma.titulo,
      subtitulo: tarefaPrisma.subtitulo,
      descricao: tarefaPrisma.descricao,
      dataPrazo: tarefaPrisma.dataPrazo ?? undefined,
      status: tarefaPrisma.status,
      concluida: tarefaPrisma.concluida,
      tarefaPai: tarefaPrisma.tarefaPaiId ? { id: tarefaPrisma.tarefaPaiId } as any : undefined,
      ...(tarefaPrisma.tipo === 'SIMPLES' && {
        prioridade: tarefaPrisma.prioridade ?? PrioridadeTarefa.BAIXA,
        pontos: tarefaPrisma.pontos ?? 0,
        tempoEstimadoDias: tarefaPrisma.tempoEstimadoDias ?? 0,
      }),
      ...(tarefaPrisma.tipo === 'PROJETO' && {
        subtarefas: tarefaPrisma.subtarefas ? tarefaPrisma.subtarefas.map(st => ({ id: st.id } as any)) : [],
        limiteSubtarefas: tarefaPrisma.limiteSubtarefas ?? undefined,
      }),
    };

    return new Tarefa(props);
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
}