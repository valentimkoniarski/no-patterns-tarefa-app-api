export class Tarefa {
  constructor(
    public id: number,
    public titulo: string,
    public subTitulo: string,
    public descricao: string,
    public status: string,
    public dataCriacao: Date,
    public dataAtualizacao: Date,
    public concluida: boolean,
    public tipo: string,
    public dataPrazo?: Date,
    public prioridade?: string,
    public pontos?: number,
    public tempoEstimadoDias?: number,
    public subtarefas?: any[],
  ) {}

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
