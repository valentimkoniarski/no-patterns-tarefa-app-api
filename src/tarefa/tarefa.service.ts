import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Tarefa } from './tarefa.entity';
import { TarefaDTO } from './tarefa.dto';
import { StatusTarefa } from '@prisma/client';

@Injectable()
export class TarefaService {
  constructor(private prisma: PrismaService) {}

  async criar(dto: TarefaDTO): Promise<any> {
    validarCamposObrigatorios(dto);
    validarPrazo(dto);
    validaAssociacaoPaisFilhos(this.prisma)

    const created = await this.prisma.tarefa.create({
      data: {
        titulo: dto.titulo,
        subTitulo: dto.subTitulo,
        descricao: dto.descricao,
        status: dto.status,
        dataPrazo: dto.dataPrazo ? new Date(dto.dataPrazo) : undefined,
        tipo: dto.tipo,
        prioridade: dto.prioridade,
        pontos: dto.pontos,
        tempoEstimadoDias: dto.tempoEstimadoDias,
      },
    });

    if (dto.tipo === 'COMPOSTA' && Array.isArray(dto.subtarefas)) {
      for (const subId of dto.subtarefas) {
        await this.prisma.tarefa.update({
          where: { id: subId },
          data: { tarefaPaiId: created.id },
        });
      }
    }

    return created;
  }

  async atualizar(id: number, dto: TarefaDTO): Promise<any> {
    const existing = await this.prisma.tarefa.findUnique({
      where: { id },
      include: { subtarefas: true },
    });
    if (!existing) throw new NotFoundException('Tarefa não encontrada');

    await this.prisma.tarefa.update({
      where: { id },
      data: {
        titulo: dto.titulo,
        subTitulo: dto.subTitulo,
        descricao: dto.descricao,
        status: dto.status,
        dataPrazo: dto.dataPrazo ? new Date(dto.dataPrazo) : null,
        prioridade: dto.prioridade,
        pontos: dto.pontos,
        tempoEstimadoDias: dto.tempoEstimadoDias,
      },
    });

    if (dto.tipo === 'COMPOSTA') {
      await this.prisma.tarefa.updateMany({
        where: { tarefaPaiId: id },
        data: { tarefaPaiId: null },
      });
      if (Array.isArray(dto.subtarefas)) {
        for (const subId of dto.subtarefas) {
          await this.prisma.tarefa.update({
            where: { id: subId },
            data: { tarefaPaiId: id },
          });
        }
      }
    }

    const updated = await this.prisma.tarefa.findUnique({
      where: { id },
      include: { subtarefas: true },
    });
    return updated;
  }

  async findAll(): Promise<Tarefa[]> {
    const raws = await this.prisma.tarefa.findMany({
      include: { subtarefas: true },
    });
    return raws.map(
      (r) =>
        new Tarefa({
          id: r.id,
          titulo: r.titulo,
          subTitulo: r.subTitulo,
          descricao: r.descricao,
          status: r.status,
          dataCriacao: r.dataCriacao,
          dataAtualizacao: r.dataAtualizacao,
          concluida: r.concluida,
          tipo: r.tipo,
          dataPrazo: r.dataPrazo ?? undefined,
          prioridade: r.prioridade ?? undefined,
          pontos: r.pontos ?? undefined,
          tempoEstimadoDias: r.tempoEstimadoDias ?? undefined,
          subtarefas: r.subtarefas,
        }),
    );
  }

  async excluir(id: number): Promise<void> {
    const task = await this.prisma.tarefa.findUnique({
      where: { id },
      include: { subtarefas: true },
    });
    await this.prisma.tarefa.delete({ where: { id } });
    if (task && task.subtarefas.length > 0) {
      await this.prisma.tarefa.deleteMany({
        where: { id: { in: task.subtarefas.map((s) => s.id) } },
      });
    }
  }

  async obterSumario(id: number): Promise<any> {
    const r = await this.prisma.tarefa.findUnique({
      where: { id },
      include: { subtarefas: true },
    });
    if (!r) throw new NotFoundException('Tarefa não encontrada');

    if (r.tipo === 'FOLHA') {
      const progressoBase =
        r.status === 'CONCLUIDA' ? 100 : r.status === 'EM_ANDAMENTO' ? 50 : 0;
      let peso = 1;
      switch (r.prioridade) {
        case 'ALTA':
          peso = 1.2;
          break;
        case 'BAIXA':
          peso = 0.8;
          break;
        default:
          peso = 1;
          break;
      }
      const progresso = Math.min(100, Math.round(progressoBase * peso));
      return {
        pontosTotais: r.pontos || 0,
        estimativaTotalDias: r.tempoEstimadoDias || 0,
        progresso,
      };
    }

    const totalSub = Array.isArray(r.subtarefas) ? r.subtarefas.length : 0;
    const concluidas = r.subtarefas.filter(
      (s) => s.status === 'CONCLUIDA',
    ).length;
    const pendentes = totalSub - concluidas;
    const pontosTotais = r.subtarefas.reduce(
      (sum, s) => sum + (s.pontos || 0),
      0,
    );
    const estimativaTotalDias = r.subtarefas.reduce(
      (sum, s) => sum + (s.tempoEstimadoDias || 0),
      0,
    );
    const progressoComp = totalSub
      ? Math.round((concluidas / totalSub) * 100)
      : 0;
    return {
      totalSubtarefas: totalSub,
      concluidas,
      pendentes,
      pontosTotais,
      estimativaTotalDias,
      progresso: progressoComp,
    };
  }
}

export function validaAssociacaoPaisFilhos(prisma: any) {
  return async (parentId: number, childId: number): Promise<void> => {
    const parent = await prisma.tarefa.findUnique({
      where: { id: parentId },
      include: { subtarefas: true },
    });
    if (!parent) throw new NotFoundException('Tarefa pai não encontrada');

    const child = await prisma.tarefa.findUnique({
      where: { id: childId },
      include: { tarefaPai: true },
    });
    if (!child) throw new NotFoundException('Tarefa filho não encontrada');

    if (child.tarefaPai && child.tarefaPai.id !== parentId) {
      throw new BadRequestException(
        'A tarefa filho já está associada a outra tarefa pai.',
      );
    }
  };
}

export function validarTransicaoEstadoHandler(
  currentStatus: StatusTarefa,
  nextStatus: StatusTarefa,
): void {
  if (
    currentStatus === StatusTarefa.PENDENTE &&
    nextStatus !== StatusTarefa.EM_ANDAMENTO
  ) {
    throw new BadRequestException('Só é possível iniciar uma tarefa pendente.');
  }
  if (
    currentStatus === StatusTarefa.EM_ANDAMENTO &&
    nextStatus !== StatusTarefa.CONCLUIDA
  ) {
    throw new BadRequestException(
      'Só é possível concluir uma tarefa em andamento.',
    );
  }
}

export function validarPrazo(dto: TarefaDTO): void {
  if (dto.dataPrazo) {
    const prazo = new Date(dto.dataPrazo);
    const hoje = new Date();
    if (hoje > prazo) {
      throw new BadRequestException(
        'A data do prazo não pode ser anterior a hoje.',
      );
    }
  }
}

export function validarCamposObrigatorios(dto: TarefaDTO): void {
  if (!dto.titulo) {
    throw new BadRequestException('Título é obrigatório.');
  }

  if (!dto.descricao) {
    throw new BadRequestException('Descrição é obrigatória.');
  }

  if (!dto.subTitulo) {
    throw new BadRequestException('Subtítulo é obrigatório.');
  }

  if (!dto.status) {
    throw new BadRequestException('Status é obrigatório.');
  }

  if (!dto.tipo) {
    throw new BadRequestException('Tipo é obrigatório.');
  }

  if ('pontos' in dto) {
    if (!dto.pontos) {
      throw new BadRequestException('Pontos são obrigatórios.');
    }

    if (!dto.tempoEstimadoDias) {
      throw new BadRequestException('Tempo estimado em dias é obrigatório.');
    }

    if (!dto.prioridade) {
      throw new BadRequestException('Prioridade é obrigatória.');
    }
  }

  if ('subtarefas' in dto) {
    if (!dto.subtarefas || dto.subtarefas.length === 0) {
      throw new BadRequestException('Subtarefas são obrigatórias.');
    }
  }
}
