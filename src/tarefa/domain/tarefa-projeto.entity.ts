import { StatusTarefa, Tarefa, TarefaTipo } from '@prisma/client';
import { TarefaSimplesProps } from './tarefa-simples.entity';
import { TarefaBaseProps, TarefaBase } from './tarefa.entity';

export type TarefaProjetoProps = TarefaBaseProps & {
  subtarefasIds?: number[];
  subtarefas?: TarefaSimplesProps[];
  limiteSubtarefas?: number;
};

export class TarefaProjeto extends TarefaBase {
  private subtarefasIds: number[];
  private subtarefas: TarefaSimplesProps[];
  private limiteSubtarefas?: number;

  constructor(props: TarefaProjetoProps & { status?: StatusTarefa }) {
    super({ ...props, tipo: TarefaTipo.PROJETO, status: props.status });

    if (props.limiteSubtarefas && props.limiteSubtarefas < 0) {
      throw new Error('Limite de subtarefas não pode ser negativo');
    }

    if (props.subtarefasIds && props.limiteSubtarefas) {
      if (props.limiteSubtarefas < props.subtarefasIds.length) {
        throw new Error(
          `Limite de subtarefas (${props.limiteSubtarefas}) excedido (${props.subtarefasIds.length})`,
        );
      }
    }

    this.subtarefasIds = props.subtarefasIds ?? [];
    this.subtarefas = props.subtarefas ?? [];
    this.limiteSubtarefas = props.limiteSubtarefas;
  }

  getStatus() {
    return this.status;
  }

  static atualizar(dto: TarefaProjetoProps) {
    if (dto.concluida) {
      throw new Error('Tarefa já concluída');
    }

    if (
      dto.subtarefasIds &&
      dto.limiteSubtarefas &&
      dto.limiteSubtarefas < dto.subtarefasIds?.length
    ) {
      throw new Error(
        `Limite de subtarefas (${dto.limiteSubtarefas}) excedido (${dto.subtarefasIds?.length})`,
      );
    }

    return new TarefaProjeto({
      id: dto.id,
      titulo: dto.titulo,
      subtitulo: dto.subtitulo,
      descricao: dto.descricao,
      dataPrazo: dto.dataPrazo ?? undefined,
      concluida: dto.concluida,
      status: dto.status,
      tipo: TarefaTipo.PROJETO,
      limiteSubtarefas: dto.limiteSubtarefas ?? undefined,
      subtarefasIds: dto.subtarefasIds ?? [],
    });
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
      progresso: this.obterProgresso(),
    };
  }

  obterProgresso(): number {
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

    for (const subtarefa of this.subtarefas) {
      subtarefa.status = StatusTarefa.EM_ANDAMENTO;
    }
  }

  concluirTarefa() {
    for (const subtarefa of this.subtarefas) {
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
      id: this.id as number,
      titulo: this.titulo,
      subtitulo: this.subtitulo,
      descricao: this.descricao,
      dataPrazo: this.dataPrazo ?? null,
      concluida: this.concluida,
      status: this.status,
      tipo: this.tipo,
      tarefaPaiId: null,
      prioridade: null,
      pontos: 0,
      tempoEstimadoDias: 0,
      limite: this.limiteSubtarefas ?? null,
      dataAtualizacao: new Date(),
      dataCriacao: new Date(),
    };
  }

  clonar(mods?: Partial<TarefaProjetoProps>): TarefaProjeto {
    return new TarefaProjeto({
      titulo: mods?.titulo ?? this.titulo,
      subtitulo: mods?.subtitulo ?? this.subtitulo,
      descricao: mods?.descricao ?? this.descricao,
      dataPrazo: mods?.dataPrazo ?? this.dataPrazo,
      concluida: false,
      status: StatusTarefa.PENDENTE,
      tipo: TarefaTipo.PROJETO,
      limiteSubtarefas: mods?.limiteSubtarefas ?? this.limiteSubtarefas,
    });
  }

  private getSubtarefasAsFolhas(): TarefaSimplesProps[] {
    if (!Array.isArray(this.subtarefas)) return [];
    return this.subtarefas.filter(
      (t): t is TarefaSimplesProps => typeof t !== 'number',
    );
  }
}
