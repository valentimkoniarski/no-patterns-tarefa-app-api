import {
  PrioridadeTarefa,
  StatusTarefa,
  Tarefa,
  TarefaTipo,
} from '@prisma/client';
import { TarefaBase, TarefaBaseProps, SumarioTarefa } from './tarefa.entity';

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

  private constructor(props: TarefaSimplesProps & { status?: StatusTarefa }) {
    super({ ...props, tipo: TarefaTipo.SIMPLES, status: props.status });

    if (props.tarefaPaiId) {
      throw new Error('Tarefa simples não pode ter tarefa pai');
    }

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

  static criar(props: TarefaSimplesProps): TarefaSimples {
    return new TarefaSimples({
      ...props,
      concluida: false,
      status: StatusTarefa.PENDENTE,
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

    this.dataAtualizacao = new Date();
    this.status = StatusTarefa.EM_ANDAMENTO;
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

  obterSumario(): SumarioTarefa {
    return {
      totalSubtarefas: 1,
      concluidas: this.concluida ? 1 : 0,
      pendentes: this.concluida ? 0 : 1,
      pontosTotais: this.pontos,
      estimativaTotalDias: this.tempoEstimadoDias,
      progresso: this.concluida ? 100 : 0,
    };
  }

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
      dataCriacao: this.dataCriacao,
      dataAtualizacao: this.dataAtualizacao,
    };
  }
}
