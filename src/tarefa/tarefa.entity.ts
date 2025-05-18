export interface TarefaProps {
  id: number;
  titulo: string;
  subTitulo: string;
  descricao: string;
  status: string;
  dataCriacao: Date;
  dataAtualizacao: Date;
  concluida: boolean;
  tipo: string;
  dataPrazo?: Date;
  prioridade?: string;
  pontos?: number;
  tempoEstimadoDias?: number;
  subtarefas?: any[];
}

export class Tarefa {
  public id: number;
  public titulo: string;
  public subTitulo: string;
  public descricao: string;
  public status: string;
  public dataCriacao: Date;
  public dataAtualizacao: Date;
  public concluida: boolean;
  public tipo: string;
  public dataPrazo?: Date;
  public prioridade?: string;
  public pontos?: number;
  public tempoEstimadoDias?: number;
  public subtarefas?: any[];

  constructor(props: TarefaProps) {
    this.id = props.id;
    this.titulo = props.titulo;
    this.subTitulo = props.subTitulo;
    this.descricao = props.descricao;
    this.status = props.status;
    this.dataCriacao = props.dataCriacao;
    this.dataAtualizacao = props.dataAtualizacao;
    this.concluida = props.concluida;
    this.tipo = props.tipo;
    this.dataPrazo = props.dataPrazo;
    this.prioridade = props.prioridade;
    this.pontos = props.pontos;
    this.tempoEstimadoDias = props.tempoEstimadoDias;
    this.subtarefas = props.subtarefas;
  }

  calcularSumario(): any {
    if (this.tipo === 'FOLHA') {
      const progresso =
        this.status === 'CONCLUIDA'
          ? 100
          : this.status === 'EM_ANDAMENTO'
            ? 50
            : 0;
      return {
        pontosTotais: this.pontos || 0,
        estimativaTotalDias: this.tempoEstimadoDias || 0,
        progresso,
      };
    } else {
      let total = 0,
        concluidas = 0;
      if (Array.isArray(this.subtarefas)) {
        for (const sub of this.subtarefas) {
          total++;
          if (sub.status === 'CONCLUIDA') concluidas++;
        }
      }
      return { totalSubtarefas: total, concluidas };
    }
  }
}
