import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TarefaSimples } from './domain/tarefa-simples.entity';
import { TarefaProjeto } from './domain/tarefa-projeto.entity';
import { PrioridadeTarefa, StatusTarefa, Tarefa } from '@prisma/client';

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
  tarefaPai?: number;
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
        status: tarefa.getStatus(),
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

  async clonarTarefa(id: number, dto?: TarefaDto) {
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

  private mapearTarefaExistente(
    tarefaPrisma: Tarefa & { subtarefas?: { id: number }[] },
  ) {
    const tarefaBase = {
      titulo: tarefaPrisma.titulo,
      subtitulo: tarefaPrisma.subtitulo,
      descricao: tarefaPrisma.descricao,
      dataPrazo: tarefaPrisma.dataPrazo ?? undefined,
      status: tarefaPrisma.status,
      tipo: tarefaPrisma.tipo,
    };

    if (tarefaPrisma.tipo === 'PROJETO') {
      return new TarefaProjeto({
        ...tarefaBase,
        limiteSubtarefas: tarefaPrisma.limiteSubtarefas ?? undefined,
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
}
