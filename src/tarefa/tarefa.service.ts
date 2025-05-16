import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Tarefa } from './tarefa.entity';
import { TarefaDTO } from './tarefa.dto';

@Injectable()
export class TarefaService {
  constructor(private prisma: PrismaService) {}

  async criar(dto: TarefaDTO): Promise<Tarefa> {
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
        tipoCalculoPontos: dto.tipoCalculoPontos,
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

    const full = await this.prisma.tarefa.findUnique({
      where: { id: created.id },
      include: { subtarefas: true },
    });
    return new Tarefa(
      full.id,
      full.titulo,
      full.subTitulo,
      full.descricao,
      full.status,
      full.dataCriacao,
      full.dataAtualizacao,
      full.concluida,
      full.dataPrazo,
      full.tipo,
      full.prioridade,
      full.pontos,
      full.tempoEstimadoDias,
      full.subtarefas,
    );
  }

  async atualizar(id: number, dto: TarefaDTO): Promise<Tarefa> {
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
        tipoCalculoPontos: dto.tipoCalculoPontos,
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
    return new Tarefa(
      updated.id,
      updated.titulo,
      updated.subTitulo,
      updated.descricao,
      updated.status,
      updated.dataCriacao,
      updated.dataAtualizacao,
      updated.concluida,
      updated.dataPrazo,
      updated.tipo,
      updated.prioridade,
      updated.pontos,
      updated.tempoEstimadoDias,
      updated.subtarefas,
    );
  }

  async findAll(): Promise<Tarefa[]> {
    const raws = await this.prisma.tarefa.findMany({
      include: { subtarefas: true },
    });
    return raws.map(
      (r) =>
        new Tarefa(
          r.id,
          r.titulo,
          r.subTitulo,
          r.descricao,
          r.status,
          r.dataCriacao,
          r.dataAtualizacao,
          r.dataPrazo,
          r.concluida,
          r.tipo,
          r.prioridade,
          r.pontos,
          r.tempoEstimadoDias,
          r.subtarefas,
        ),
    );
  }

  async excluir(id: number): Promise<void> {
    const task = await this.prisma.tarefa.findUnique({
      where: { id },
      include: { subtarefas: true },
    });
    await this.prisma.tarefa.delete({ where: { id } });
    if (task.subtarefas.length > 0) {
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
