import { StatusTarefa, TarefaTipo } from '@prisma/client';

export interface SumarioTarefa {
  totalSubtarefas?: number;
  concluidas?: number;
  pendentes?: number;
  pontosTotais?: number;
  estimativaTotalDias?: number;
  progresso?: number;
}

export type TarefaBaseProps = {
  id?: number;
  titulo: string;
  subtitulo: string;
  descricao: string;
  dataPrazo?: Date;
  concluida?: boolean;
  status?: StatusTarefa;
  tipo: TarefaTipo;
};

export abstract class TarefaBase {
  protected id?: number;
  protected titulo: string;
  protected subtitulo: string;
  protected descricao: string;
  protected status: StatusTarefa;
  protected dataPrazo?: Date;
  concluida: boolean;
  tipo: TarefaTipo;

  constructor(props: TarefaBaseProps) {
    if (!props.titulo) throw new Error('Título é obrigatório');
    if (!props.subtitulo) throw new Error('Subtítulo é obrigatório');
    if (!props.descricao) throw new Error('Descrição é obrigatória');

    this.id = props.id;
    this.titulo = props.titulo;
    this.subtitulo = props.subtitulo;
    this.descricao = props.descricao;
    this.status = props.status ?? StatusTarefa.PENDENTE;
    this.dataPrazo = props.dataPrazo;
    this.concluida = props.concluida ?? false;
    this.tipo = props.tipo;
  }

  getStatus() {
    return this.status;
  }

  getTitulo() {
    return this.titulo;
  }

  getSubtitulo() {
    return this.subtitulo;
  }

  getDescricao() {
    return this.descricao;
  }

  getConcluida() {
    return this.concluida;
  }
}
