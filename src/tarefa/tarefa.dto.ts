export class TarefaDTO {
  tipo: 'FOLHA' | 'COMPOSTA';
  titulo: string;
  subTitulo: string;
  descricao: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA';
  dataPrazo?: string;
  prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA';
  pontos?: number;
  tempoEstimadoDias?: number;
  tipoCalculoPontos?: 'FIXO' | 'PESO';
  subtarefas?: number[];
}
