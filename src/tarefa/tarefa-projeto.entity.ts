import { StatusTarefa, TarefaTipo } from '@prisma/client';
import { TarefaBase, TarefaBaseProps, SumarioTarefa } from './tarefa.entity';
import { TarefaSimplesProps } from './tarefa-simples.entity';

export type TarefaProjetoProps = TarefaBaseProps & {
  subtarefasIds?: number[];
  subtarefas?: TarefaSimplesProps[];
  limite?: number;
};

export class TarefaProjeto extends TarefaBase {
  private subtarefasIds: number[];
  private subtarefas: TarefaSimplesProps[];

  private constructor(props: TarefaProjetoProps & { status?: StatusTarefa }) {
    super({ ...props, tipo: TarefaTipo.PROJETO, status: props.status });

    this.subtarefasIds = props.subtarefasIds ?? [];
    this.subtarefas = props.subtarefas ?? [];
  }

  static criar(props: TarefaProjetoProps): TarefaProjeto {
    return new TarefaProjeto({
      ...props,
    });
  }

  get getStatus() {
    return this.status;
  }

  get getSubtarefas() {
    return this.subtarefas;
  }

  obterSumario() {
    const folhas = this.getSubtarefasAsFolhas();
    const total = folhas.length;
    const concluidas = folhas.filter(
      (t) => t.status === StatusTarefa.CONCLUIDA,
    ).length;

    return {
      totalSubtarefas: total,
      concluidas,
      pendentes: total - concluidas,
      pontosTotais: folhas.reduce(
        (acc, tarefaSimples) => acc + tarefaSimples.pontos,
        0,
      ),
      estimativaTotalDias: folhas.reduce(
        (acc, tarefaSimples) => acc + tarefaSimples.tempoEstimadoDias,
        0,
      ),
      progresso: this.getProgresso(),
    };
  }

  obterSubtarefasComoFolhas(): TarefaSimplesProps[] {
    return this.subtarefas as TarefaSimplesProps[];
  }

  private getSubtarefasAsFolhas(): TarefaSimplesProps[] {
    if (!Array.isArray(this.subtarefas)) return [];
    return this.subtarefas.filter(
      (t): t is TarefaSimplesProps => typeof t !== 'number',
    );
  }

  getProgresso(): number {
    const folhas = this.getSubtarefasAsFolhas();
    const total = folhas.length;
    if (total === 0) return 0;

    const concluidas = folhas.filter(
      (t) => t.status === StatusTarefa.CONCLUIDA,
    ).length;
    return Math.round((concluidas / total) * 100);
  }

  iniciarTarefa() {
    if (this.concluida) {
      throw new Error('Tarefa já concluída');
    }

    if (this.status !== StatusTarefa.PENDENTE) {
      throw new Error('Tarefa já iniciada');
    }

    this.status = StatusTarefa.EM_ANDAMENTO;

    for (const subtarefa of this.getSubtarefas) {
      subtarefa.status = StatusTarefa.EM_ANDAMENTO;
    }
  }

  concluirTarefa() {
    for (const subtarefa of this.getSubtarefas) {
      if (subtarefa.status !== StatusTarefa.CONCLUIDA) {
        throw new Error('Tarefa não pode ser concluída');
      }
    }

    if (this.concluida) {
      throw new Error('Tarefa já concluída');
    }

    if (this.status !== StatusTarefa.EM_ANDAMENTO) {
      throw new Error('Tarefa não pode ser concluída');
    }

    this.concluida = true;
    this.status = StatusTarefa.CONCLUIDA;
  }

  toPrisma() {
    return {
      titulo: this.titulo,
      subTitulo: this.subtitulo,
      descricao: this.descricao,
      dataPrazo: this.dataPrazo,
      concluida: this.concluida,
      status: this.status,
      tipo: this.tipo,
      subtarefas: {
        connect: this.subtarefasIds.map((id) => ({ id })),
      },
    };
  }
}
