import { PrioridadeTarefa, StatusTarefa, TarefaTipo } from '@prisma/client';

export interface TarefaProps {
  titulo: string;
  subtitulo: string;
  descricao: string;
  status: StatusTarefa;
  dataPrazo?: Date;
  concluida: boolean;
  subtarefas?: Tarefa[];
  limiteSubtarefas?: number;
  tarefaPai?: Tarefa;
  prioridade?: PrioridadeTarefa;
  pontos?: number;
  tempoEstimadoDias?: number;
  id?: number;
}

export class Tarefa {
  readonly id?: number;
  readonly titulo: string;
  readonly subtitulo: string;
  readonly descricao: string;
  readonly dataPrazo?: Date;
  readonly tarefaPai?: Tarefa;

  readonly tipo: TarefaTipo;
  private _status: StatusTarefa;
  private _concluida: boolean;

  readonly prioridade: PrioridadeTarefa;
  readonly pontos: number;
  readonly tempoEstimadoDias: number;

  readonly limiteSubtarefas: number;
  readonly subtarefas: Tarefa[];

  constructor(props: TarefaProps) {
    this.validar(props);

    this.id = props.id;
    this.titulo = props.titulo;
    this.subtitulo = props.subtitulo;
    this.descricao = props.descricao;
    this.dataPrazo = props.dataPrazo;
    this._concluida = props.concluida;

    this._status = props.status;
    this.tarefaPai = props.tarefaPai;

    this.prioridade = props.prioridade ?? PrioridadeTarefa.BAIXA;
    this.pontos = props.pontos ?? 0;
    this.tempoEstimadoDias = props.tempoEstimadoDias ?? 0;

    const hasSubtarefas = props.subtarefas && props.subtarefas.length > 0;
    this.tipo = hasSubtarefas ? TarefaTipo.PROJETO : TarefaTipo.SIMPLES;

    this.limiteSubtarefas = props.limiteSubtarefas ?? 0;
    this.subtarefas = [];

    if (hasSubtarefas) {
      for (const subtarefa of props.subtarefas!) {
        this.adicionarSubtarefa(subtarefa);
      }
    }
  }

  get status(): StatusTarefa {
    return this._status;
  }

  get concluida(): boolean {
    return this._concluida;
  }

  private set status(status: StatusTarefa) {
    this._status = status;
  }

  private set concluida(concluida: boolean) {
    this._concluida = concluida;
  }

  private validar(props: TarefaProps): void {
    if (!props.titulo) throw new Error('Título não pode ser vazio');
    if (!props.subtitulo) throw new Error('Subtítulo não pode ser vazio');
    if (!props.descricao) throw new Error('Descrição não pode ser vazia');
    if (props.limiteSubtarefas !== undefined && props.limiteSubtarefas < 0) {
      throw new Error('Limite de subtarefas não pode ser negativo');
    }
    if (props.pontos !== undefined && props.pontos < 0) {
      throw new Error('Pontos não podem ser negativos');
    }
    if (props.tempoEstimadoDias !== undefined && props.tempoEstimadoDias < 0) {
      throw new Error('Tempo estimado não pode ser negativo');
    }
    if (props.status === StatusTarefa.CONCLUIDA && props.concluida === false) {
      throw new Error('Uma tarefa concluída deve ter o status como concluída');
    }
  }

  adicionarSubtarefa(subtarefa: Tarefa): void {
    if (this.tipo === TarefaTipo.SIMPLES) {
      throw new Error('Tarefa simples não pode ter subtarefas');
    }

    if (this._status !== StatusTarefa.PENDENTE) {
      throw new Error(
        'Não é possível adicionar subtarefa em andamento ou concluída',
      );
    }

    if (this.subtarefas.some((t) => t.id === subtarefa.id)) {
      throw new Error('Subtarefa já adicionada');
    }

    if (this.subtarefas.length >= this.limiteSubtarefas) {
      throw new Error('Limite de subtarefas atingido');
    }

    if (subtarefa.tipo === TarefaTipo.PROJETO) {
      throw new Error('Subtarefa não pode ser do tipo projeto');
    }

    this.subtarefas.push(subtarefa);
  }

  iniciar(): void {
    if (this._status === StatusTarefa.PENDENTE) {
      this._status = StatusTarefa.EM_ANDAMENTO;
    } else if (this._status === StatusTarefa.EM_ANDAMENTO) {
      throw new Error('Já em andamento');
    } else if (this._status === StatusTarefa.CONCLUIDA) {
      throw new Error('Já concluída');
    }
  }

  concluir(): void {
    if (this._status === StatusTarefa.PENDENTE) {
      throw new Error('Não pode concluir antes de iniciar');
    } else if (this._status === StatusTarefa.EM_ANDAMENTO) {
      if (this.tipo === TarefaTipo.PROJETO) {
        for (const sub of this.subtarefas) {
          if (sub._status !== StatusTarefa.CONCLUIDA) {
            throw new Error('Há subtarefas pendentes');
          }
        }
      }
      this._status = StatusTarefa.CONCLUIDA;
      this._concluida = true;
    } else if (this._status === StatusTarefa.CONCLUIDA) {
      throw new Error('Já concluída');
    }
  }

  obterProgresso(): number {
    if (this.tipo === TarefaTipo.SIMPLES) {
      return this._concluida
        ? 100
        : this._status === StatusTarefa.EM_ANDAMENTO
          ? 50
          : 0;
    }
    const total = this.subtarefas.length || 1;
    const concluidas = this.subtarefas.filter(
      (t) => t._status === StatusTarefa.CONCLUIDA,
    ).length;
    return Math.round((concluidas / total) * 100);
  }

  obterSumario() {
    if (this.tipo === TarefaTipo.SIMPLES) {
      return {
        totalSubtarefas: 1,
        concluidas: this._status === StatusTarefa.CONCLUIDA ? 1 : 0,
        pendentes: this._status !== StatusTarefa.CONCLUIDA ? 1 : 0,
        pontosTotais: this.pontos,
        estimativaTotalDias: this.tempoEstimadoDias,
        progresso: this.obterProgresso(),
      };
    }
    const total = this.subtarefas.length;
    const concluidas = this.subtarefas.filter(
      (t) => t._status === StatusTarefa.CONCLUIDA,
    ).length;
    const pontosTotais = this.subtarefas.reduce(
      (acc, t) => acc + (t.pontos ?? 0),
      0,
    );
    const estimativaTotalDias = this.subtarefas.reduce(
      (acc, t) => acc + (t.tempoEstimadoDias ?? 0),
      0,
    );

    return {
      totalSubtarefas: total,
      concluidas,
      pendentes: total - concluidas,
      pontosTotais,
      estimativaTotalDias,
      progresso: this.obterProgresso(),
    };
  }

  clonar(dto?: Partial<TarefaProps>): Tarefa {
    if (this.tipo === TarefaTipo.SIMPLES) {
      return new Tarefa({
        ...this,
        id: undefined,
        ...dto,
      });
    }

    const subtarefasClonadas = this.subtarefas.map((s) => s.clonar());
    return new Tarefa({
      ...this,
      id: undefined,
      subtarefas: subtarefasClonadas,
      ...dto,
    });
  }

  toPrisma() {
    return {
      id: this.id,
      titulo: this.titulo,
      subtitulo: this.subtitulo,
      descricao: this.descricao,
      status: this.status,
      dataPrazo: this.dataPrazo,
      concluida: this.concluida,
      tipo: this.tipo,
      prioridade: this.prioridade,
      pontos: this.pontos,
      tempoEstimadoDias: this.tempoEstimadoDias,
      limiteSubtarefas: this.limiteSubtarefas,
      tarefaPaiId: this.tarefaPai?.id,
    };
  }
}
