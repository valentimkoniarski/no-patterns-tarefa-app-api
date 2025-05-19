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
      concluida: false,
      status: StatusTarefa.PENDENTE,
    });
  }

  get getStatus() {
    return this.status;
  }

  get getSubtarefas() {
    return this.subtarefas;
  }

  iniciarTarefa() {
    if (this.concluida) {
      throw new Error('Tarefa já concluída');
    }

    if (this.status !== StatusTarefa.PENDENTE) {
      throw new Error('Tarefa já iniciada');
    }

    this.status = StatusTarefa.EM_ANDAMENTO;
    this.dataAtualizacao = new Date();

    for (const subtarefa of this.getSubtarefas) {
      subtarefa.status = StatusTarefa.EM_ANDAMENTO;
    }
  }

  obterSumario(): SumarioTarefa {
    return {
      totalSubtarefas: this.subtarefasIds.length,
      progresso: 1,
    };
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
