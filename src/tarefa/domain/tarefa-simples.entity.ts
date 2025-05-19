import {
  PrioridadeTarefa,
  StatusTarefa,
  Tarefa,
  TarefaTipo,
} from '@prisma/client';
import { TarefaBase, TarefaBaseProps, SumarioTarefa } from './tarefa.entity';
import { TarefaDto } from '../tarefa.service';

export type TarefaSimplesProps = TarefaBaseProps & {
  tarefaPaiId?: number;
  prioridade: PrioridadeTarefa;
  pontos: number;
  tempoEstimadoDias: number;
};

export class TarefaSimples extends TarefaBase {
  private tarefaPaiId?: number;
  private prioridade: PrioridadeTarefa;
  private pontos: number;
  private tempoEstimadoDias: number;

  constructor(props: TarefaSimplesProps & { status?: StatusTarefa }) {
    super({ ...props, tipo: TarefaTipo.SIMPLES, status: props.status });

    if (props.pontos < 0) {
      throw new Error('Pontos não podem ser negativos');
    }

    if (props.tempoEstimadoDias < 0) {
      throw new Error('Tempo estimado não pode ser negativo');
    }

    this.tarefaPaiId = props.tarefaPaiId;
    this.prioridade = props.prioridade;
    this.pontos = props.pontos;
    this.tempoEstimadoDias = props.tempoEstimadoDias;
  }

  static fromPrisma(raw: Tarefa): TarefaSimples {
    return new TarefaSimples({
      id: raw.id,
      titulo: raw.titulo,
      subtitulo: raw.subTitulo,
      descricao: raw.descricao,
      dataPrazo: raw.dataPrazo ?? undefined,
      concluida: raw.concluida,
      status: raw.status,
      tipo: TarefaTipo.SIMPLES,
      tarefaPaiId: raw.tarefaPaiId ?? undefined,
      prioridade: raw.prioridade ?? PrioridadeTarefa.BAIXA,
      pontos: raw.pontos ?? 0,
      tempoEstimadoDias: raw.tempoEstimadoDias ?? 0,
    });
  }

  static atualizar(dto: TarefaDto): TarefaSimples {
    if (dto.concluida) {
      throw new Error('Tarefa já concluída');
    }

    if (dto.pontos && dto.pontos < 0) {
      throw new Error('Pontos não podem ser negativos');
    }

    if (dto.tempoEstimadoDias && dto.tempoEstimadoDias < 0) {
      throw new Error('Tempo estimado não pode ser negativo');
    }

    return new TarefaSimples({
      id: dto.id,
      titulo: dto.titulo,
      subtitulo: dto.subtitulo,
      descricao: dto.descricao,
      dataPrazo: dto.dataPrazo ?? undefined,
      concluida: dto.concluida,
      status: dto.status,
      tipo: TarefaTipo.SIMPLES,
      tarefaPaiId: dto.tarefaPai ?? undefined,
      prioridade: dto.prioridade ?? PrioridadeTarefa.BAIXA,
      pontos: dto.pontos ?? 0,
      tempoEstimadoDias: dto.tempoEstimadoDias ?? 0,
    });
  }

  get getStatus() {
    return this.status;
  }

  iniciarTarefa() {
    if (this.concluida) {
      throw new Error('Tarefa já concluída');
    }

    if (this.status !== StatusTarefa.PENDENTE) {
      throw new Error('Tarefa não pode ser iniciada');
    }

    this.status = StatusTarefa.EM_ANDAMENTO;
  }

  concluirTarefa() {
    if (this.status !== StatusTarefa.EM_ANDAMENTO) {
      throw new Error('Tarefa não pode ser concluída');
    }

    this.concluida = true;
    this.status = StatusTarefa.CONCLUIDA;
  }

  obterSumario(): SumarioTarefa {
    return {
      pontosTotais: this.pontos,
      estimativaTotalDias: this.tempoEstimadoDias,
      concluidas: this.concluida ? 1 : 0,
      pendentes: this.concluida ? 0 : 1,
      progresso: this.getProgresso(),
    };
  }

  getProgresso(): number {
    switch (this.status) {
      case StatusTarefa.PENDENTE:
        return 0;
      case StatusTarefa.EM_ANDAMENTO:
        return 50;
      case StatusTarefa.CONCLUIDA:
        return 100;
    }
  }

  // clone(mods: Partial<TarefaSimplesProps>): TarefaSimples {
  //   return new TarefaSimples({
  //     id: this.id,
  //     titulo: mods.titulo ?? this.titulo,
  //     subtitulo: mods.subtitulo ?? this.subtitulo,
  //     descricao: mods.descricao ?? this.descricao,
  //     dataPrazo: mods.dataPrazo ?? this.dataPrazo,
  //     concluida: this.concluida,
  //     status: this.status,
  //     tarefaPaiId: this.tarefaPaiId,
  //     prioridade: mods.prioridade ?? this.prioridade,
  //     pontos: mods.pontos ?? this.pontos,
  //     tempoEstimadoDias: mods.tempoEstimadoDias ?? this.tempoEstimadoDias,
  //   });
  // }

  toPrisma(): Tarefa {
    return {
      id: this.id as number,
      titulo: this.titulo,
      subTitulo: this.subtitulo,
      descricao: this.descricao,
      dataPrazo: this.dataPrazo ?? null,
      concluida: this.concluida,
      status: this.status,
      tipo: this.tipo,
      tarefaPaiId: this.tarefaPaiId ?? null,
      prioridade: this.prioridade,
      pontos: this.pontos,
      tempoEstimadoDias: this.tempoEstimadoDias,
      limite: null,
      dataAtualizacao: new Date(),
      dataCriacao: new Date(),
    };
  }
}
