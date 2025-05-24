import { PrioridadeTarefa, StatusTarefa, TarefaTipo } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

export class CampoInvalidoException extends BadRequestException {
  constructor(campo: string, motivo: string) {
    super(`Campo inválido: ${campo}. Motivo: ${motivo}`);
  }
}

export interface TarefaProps {
  titulo: string;
  subtitulo: string;
  descricao: string;
  status: StatusTarefa;
  dataPrazo?: Date;
  concluida: boolean;
  tipo: TarefaTipo;
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
  private status: StatusTarefa;
  private concluida: boolean;

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
    this.concluida = props.concluida;
    this.status = props.status;
    this.tipo = props.tipo;
    this.subtarefas = [];

    if (props.tipo === TarefaTipo.PROJETO) {
      this.limiteSubtarefas = props.limiteSubtarefas ?? 0;

      if (props.subtarefas && props.subtarefas.length > 0) {
        for (const subtarefa of props.subtarefas) {
          this.adicionarSubtarefa(subtarefa);
        }
      }

      if (this.subtarefas.length > this.limiteSubtarefas) {
        throw new CampoInvalidoException(
          'limiteSubtarefas',
          'Número de subtarefas excede o limite permitido para este projeto',
        );
      }
    }

    if (props.tipo === TarefaTipo.SIMPLES) {
      this.tarefaPai = props.tarefaPai;
      this.prioridade = props.prioridade ?? PrioridadeTarefa.BAIXA;
      this.pontos = props.pontos ?? 0;
      this.tempoEstimadoDias = props.tempoEstimadoDias ?? 0;
    }
  }

  private validar(props: TarefaProps): void {
    if (!props.titulo)
      throw new CampoInvalidoException('titulo', 'não pode ser vazio');
    if (!props.subtitulo)
      throw new CampoInvalidoException('subtitulo', 'não pode ser vazio');
    if (!props.descricao)
      throw new CampoInvalidoException('descricao', 'não pode ser vazio');

    if (!props.tipo || !Object.values(TarefaTipo).includes(props.tipo)) {
      throw new CampoInvalidoException('tipo', 'tipo de tarefa inválido');
    }

    if (props.tipo === TarefaTipo.PROJETO) {
      if (props.limiteSubtarefas !== undefined && props.limiteSubtarefas < 0) {
        throw new CampoInvalidoException(
          'limiteSubtarefas',
          'não pode ser negativo',
        );
      }

      if (props.subtarefas && props.subtarefas.length > 0) {
        for (const subtarefa of props.subtarefas) {
          if (subtarefa.tipo !== TarefaTipo.SIMPLES) {
            throw new CampoInvalidoException(
              'subtarefas',
              'devem ser do tipo simples',
            );
          }
        }
      }

      if (
        props.pontos ||
        props.tempoEstimadoDias ||
        props.prioridade ||
        props.tarefaPai
      ) {
        throw new CampoInvalidoException(
          'projeto',
          'não pode ter pontos, tempo estimado, prioridade ou tarefa pai',
        );
      }
    }

    if (props.tipo === TarefaTipo.SIMPLES) {
      if (props.pontos !== undefined && props.pontos < 0) {
        throw new CampoInvalidoException('pontos', 'não podem ser negativos');
      }
      if (
        props.tempoEstimadoDias !== undefined &&
        props.tempoEstimadoDias < 0
      ) {
        throw new CampoInvalidoException(
          'tempoEstimadoDias',
          'não pode ser negativo',
        );
      }
      if (
        props.status === StatusTarefa.CONCLUIDA &&
        props.concluida === false
      ) {
        throw new CampoInvalidoException(
          'status',
          'uma tarefa concluída deve ter o status como concluída',
        );
      }
      if (props.subtarefas?.length) {
        throw new CampoInvalidoException(
          'subtarefas',
          'tarefa simples não pode ter subtarefas',
        );
      }
    }
  }

  private validarSubtarefa(subtarefa: Tarefa): void {
    if (subtarefa.tipo === TarefaTipo.PROJETO) {
      throw new CampoInvalidoException(
        'tipo',
        'não pode ser PROJETO para subtarefas',
      );
    }

    for (const sub of this.subtarefas) {
      if (sub?.id && subtarefa?.id) {
        if (sub.id === subtarefa.id) {
          throw new CampoInvalidoException('subtarefa', 'já existe');
        }
      }
    }

    const NOVA_SUBTAREFA = 1;
    const totalSubtarefas = this.subtarefas.length + NOVA_SUBTAREFA;

    if (totalSubtarefas > this.limiteSubtarefas) {
      throw new CampoInvalidoException(
        'limiteSubtarefas',
        `limite de ${this.limiteSubtarefas} subtarefas atingido. Atual: ${this.subtarefas.length}`,
      );
    }
  }

  get getStatus(): StatusTarefa {
    return this.status;
  }

  get getConcluida(): boolean {
    return this.concluida;
  }

  private set setStatus(status: StatusTarefa) {
    this.status = status;
  }

  private set setConcluida(concluida: boolean) {
    this.concluida = concluida;
  }

  adicionarSubtarefa(subtarefa: Tarefa): void {
    this.validarSubtarefa(subtarefa);
    this.subtarefas.push(subtarefa);
  }

  iniciar(): void {
    if (this.status === StatusTarefa.PENDENTE) {
      this.status = StatusTarefa.EM_ANDAMENTO;
      if (this.tipo === TarefaTipo.PROJETO) {
        for (const subtarefa of this.subtarefas) {
          subtarefa.iniciar();
        }
      }
    } else if (this.status === StatusTarefa.EM_ANDAMENTO) {
      throw new CampoInvalidoException(
        'status',
        'Já possui tarefas em andamento',
      );
    } else if (this.status === StatusTarefa.CONCLUIDA) {
      throw new CampoInvalidoException('status', 'Já possui tarefas concluída');
    }
  }

  concluir(): void {
    if (this.status === StatusTarefa.PENDENTE) {
      throw new CampoInvalidoException(
        'status',
        'Não pode concluir antes de iniciar',
      );
    } else if (this.status === StatusTarefa.EM_ANDAMENTO) {
      if (this.tipo === TarefaTipo.PROJETO) {
        for (const sub of this.subtarefas) {
          sub.concluir();
        }
      }
      this.status = StatusTarefa.CONCLUIDA;
      this.concluida = true;
    } else if (this.status === StatusTarefa.CONCLUIDA) {
      throw new CampoInvalidoException('status', 'Já concluída');
    }
  }

  obterProgresso() {
    if (this.tipo === TarefaTipo.SIMPLES) {
      return this.concluida
        ? 100
        : this.status === StatusTarefa.EM_ANDAMENTO
          ? 50
          : 0;
    }

    if (this.tipo === TarefaTipo.PROJETO) {
      const total = this.subtarefas.length || 1;
      const concluidas = this.subtarefas.filter(
        (t) => t.status === StatusTarefa.CONCLUIDA,
      ).length;
      return Math.round((concluidas / total) * 100);
    }
  }

  obterSumario() {
    if (this.tipo === TarefaTipo.SIMPLES) {
      return {
        totalSubtarefas: 1,
        concluidas: this.status === StatusTarefa.CONCLUIDA ? 1 : 0,
        pendentes: this.status !== StatusTarefa.CONCLUIDA ? 1 : 0,
        pontosTotais: this.pontos,
        estimativaTotalDias: this.tempoEstimadoDias,
        progresso: this.obterProgresso(),
      };
    }

    if (this.tipo === TarefaTipo.PROJETO) {
      const total = this.subtarefas.length;
      const concluidas = this.subtarefas.filter(
        (t) => t.status === StatusTarefa.CONCLUIDA,
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
  }

  clonar(dto?: Partial<TarefaProps>) {
    if (this.tipo === TarefaTipo.SIMPLES) {
      return new Tarefa({
        ...this,
        ...dto,
        id: undefined,
        status: StatusTarefa.PENDENTE,
        concluida: false,
      });
    }
    if (this.tipo === TarefaTipo.PROJETO) {
      const subtarefasClonadas = this.subtarefas.map((s) => s.clonar());
      return new Tarefa({
        ...this,
        subtarefas: subtarefasClonadas,
        ...dto,
        id: undefined,
        status: StatusTarefa.PENDENTE,
        concluida: false,
      });
    }
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
