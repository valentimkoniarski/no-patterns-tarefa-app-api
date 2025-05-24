import { PrioridadeTarefa, StatusTarefa, TarefaTipo } from '@prisma/client';
import { CampoInvalidoException, Tarefa } from './tarefa';

describe('Tarefa', () => {
  describe('Tipo invalido', () => {
    it('deve lançar erro ao criar tarefa com tipo inválido', () => {
      expect(() => {
        new Tarefa({
          titulo: 'Tarefa Inválida',
          subtitulo: 'Subtítulo Inválido',
          descricao: 'Descrição Inválida',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: 'TIPO_INVALIDO' as TarefaTipo,
        });
      }).toThrow(new CampoInvalidoException('tipo', 'tipo de tarefa inválido'));
    });
  });

  describe('Tarefa Simples', () => {
    const propsTarefaSimples = {
      titulo: 'Tarefa Teste',
      subtitulo: 'Subtítulo Teste',
      descricao: 'Descrição Teste',
      status: StatusTarefa.PENDENTE,
      concluida: false,
      tipo: TarefaTipo.SIMPLES,
      prioridade: PrioridadeTarefa.MEDIA,
      pontos: 5,
      tempoEstimadoDias: 2,
    };

    describe('construtor', () => {
      it('deve criar uma tarefa simples com sucesso', () => {
        const tarefa = new Tarefa(propsTarefaSimples);

        expect(tarefa.titulo).toBe(propsTarefaSimples.titulo);
        expect(tarefa.subtitulo).toBe(propsTarefaSimples.subtitulo);
        expect(tarefa.descricao).toBe(propsTarefaSimples.descricao);
        expect(tarefa.status).toBe(propsTarefaSimples.status);
        expect(tarefa.concluida).toBe(propsTarefaSimples.concluida);
        expect(tarefa.tipo).toBe(propsTarefaSimples.tipo);
        expect(tarefa.prioridade).toBe(propsTarefaSimples.prioridade);
        expect(tarefa.pontos).toBe(propsTarefaSimples.pontos);
        expect(tarefa.tempoEstimadoDias).toBe(propsTarefaSimples.tempoEstimadoDias);
      });

      it('deve lançar erro ao criar tarefa simples sem título', () => {
        expect(() => {
          new Tarefa({ ...propsTarefaSimples, titulo: '' });
        }).toThrow(new CampoInvalidoException('titulo', 'não pode ser vazio'));
      });

      it('deve lançar erro ao criar tarefa simples sem subtítulo', () => {
        expect(() => {
          new Tarefa({ ...propsTarefaSimples, subtitulo: '' });
        }).toThrow(new CampoInvalidoException('subtitulo', 'não pode ser vazio'));
      });

      it('deve lançar erro ao criar tarefa simples sem descrição', () => {
        expect(() => {
          new Tarefa({ ...propsTarefaSimples, descricao: '' });
        }).toThrow(new CampoInvalidoException('descricao', 'não pode ser vazio'));
      });

      it('deve lançar erro ao criar tarefa simples com pontos negativos', () => {
        expect(() => {
          new Tarefa({ ...propsTarefaSimples, pontos: -1 });
        }).toThrow(new CampoInvalidoException('pontos', 'não podem ser negativos'));
      });

      it('deve lançar erro ao criar tarefa simples com tempo estimado negativo', () => {
        expect(() => {
          new Tarefa({ ...propsTarefaSimples, tempoEstimadoDias: -1 });
        }).toThrow(new CampoInvalidoException('tempoEstimadoDias', 'não pode ser negativo'));
      });

      it('deve lançar erro ao criar tarefa simples com status concluído mas não concluída', () => {
        expect(() => {
          new Tarefa({
            ...propsTarefaSimples,
            status: StatusTarefa.CONCLUIDA,
            concluida: false,
          });
        }).toThrow(new CampoInvalidoException('status', 'uma tarefa concluída deve ter o status como concluída'));
      });
    });

    describe('iniciar', () => {
      it('deve iniciar uma tarefa pendente', () => {
        const tarefa = new Tarefa(propsTarefaSimples);
        tarefa.iniciar();
        expect(tarefa.status).toBe(StatusTarefa.EM_ANDAMENTO);
      });

      it('deve lançar erro ao tentar iniciar tarefa já em andamento', () => {
        const tarefa = new Tarefa({
          ...propsTarefaSimples,
          status: StatusTarefa.EM_ANDAMENTO,
        });
        expect(() => tarefa.iniciar()).toThrow(new CampoInvalidoException('status', 'Já em andamento'));
      });

      it('deve lançar erro ao tentar iniciar tarefa já concluída', () => {
        const tarefa = new Tarefa({
          ...propsTarefaSimples,
          status: StatusTarefa.CONCLUIDA,
          concluida: true,
        });
        expect(() => tarefa.iniciar()).toThrow(new CampoInvalidoException('status', 'Já concluída'));
      });
    });

    describe('concluir', () => {
      it('deve concluir uma tarefa em andamento', () => {
        const tarefa = new Tarefa({
          ...propsTarefaSimples,
          status: StatusTarefa.EM_ANDAMENTO,
        });
        tarefa.concluir();
        expect(tarefa.status).toBe(StatusTarefa.CONCLUIDA);
        expect(tarefa.concluida).toBe(true);
      });

      it('deve lançar erro ao tentar concluir tarefa pendente', () => {
        const tarefa = new Tarefa(propsTarefaSimples);
        expect(() => tarefa.concluir()).toThrow(new CampoInvalidoException('status', 'Não pode concluir antes de iniciar'));
      });

      it('deve lançar erro ao tentar concluir tarefa já concluída', () => {
        const tarefa = new Tarefa({
          ...propsTarefaSimples,
          status: StatusTarefa.CONCLUIDA,
          concluida: true,
        });
        expect(() => tarefa.concluir()).toThrow(new CampoInvalidoException('status', 'Já concluída'));
      });
    });

    describe('obterProgresso', () => {
      it('deve retornar progresso 0 para tarefa pendente', () => {
        const tarefa = new Tarefa(propsTarefaSimples);
        expect(tarefa.obterProgresso()).toBe(0);
      });

      it('deve retornar progresso 50 para tarefa em andamento', () => {
        const tarefa = new Tarefa({
          ...propsTarefaSimples,
          status: StatusTarefa.EM_ANDAMENTO,
        });
        expect(tarefa.obterProgresso()).toBe(50);
      });

      it('deve retornar progresso 100 para tarefa concluída', () => {
        const tarefa = new Tarefa({
          ...propsTarefaSimples,
          status: StatusTarefa.CONCLUIDA,
          concluida: true,
        });
        expect(tarefa.obterProgresso()).toBe(100);
      });
    });

    describe('obterSumario', () => {
      it('deve retornar sumário correto para tarefa simples', () => {
        const tarefa = new Tarefa(propsTarefaSimples);
        const sumario = tarefa.obterSumario();
        expect(sumario).toEqual({
          totalSubtarefas: 1,
          concluidas: 0,
          pendentes: 1,
          pontosTotais: propsTarefaSimples.pontos,
          estimativaTotalDias: propsTarefaSimples.tempoEstimadoDias,
          progresso: 0,
        });
      });
    });

    describe('clonar', () => {
      it('deve clonar tarefa simples corretamente', () => {
        const tarefa = new Tarefa(propsTarefaSimples);
        const clone = tarefa.clonar();
        expect(clone).toBeInstanceOf(Tarefa);
        expect(clone.id).toBeUndefined();
        expect(clone.titulo).toBe(tarefa.titulo);
        expect(clone.subtitulo).toBe(tarefa.subtitulo);
        expect(clone.descricao).toBe(tarefa.descricao);
        expect(clone.status).toBe(StatusTarefa.PENDENTE);
        expect(clone.concluida).toBe(tarefa.concluida);
        expect(clone.tipo).toBe(tarefa.tipo);
        expect(clone.prioridade).toBe(tarefa.prioridade);
        expect(clone.pontos).toBe(tarefa.pontos);
        expect(clone.tempoEstimadoDias).toBe(tarefa.tempoEstimadoDias);
      });
    });
  });

  describe('Tarefa Projeto', () => {
    const propsTarefaProjeto = {
      titulo: 'Projeto Teste',
      subtitulo: 'Subtítulo Projeto',
      descricao: 'Descrição Projeto',
      status: StatusTarefa.PENDENTE,
      concluida: false,
      tipo: TarefaTipo.PROJETO,
      limiteSubtarefas: 3,
      subtarefas: [],
    };

    describe('construtor', () => {
      it('deve criar uma tarefa projeto com sucesso', () => {
        const tarefa = new Tarefa(propsTarefaProjeto);

        expect(tarefa.titulo).toBe(propsTarefaProjeto.titulo);
        expect(tarefa.subtitulo).toBe(propsTarefaProjeto.subtitulo);
        expect(tarefa.descricao).toBe(propsTarefaProjeto.descricao);
        expect(tarefa.status).toBe(propsTarefaProjeto.status);
        expect(tarefa.concluida).toBe(propsTarefaProjeto.concluida);
        expect(tarefa.tipo).toBe(propsTarefaProjeto.tipo);
        expect(tarefa.limiteSubtarefas).toBe(propsTarefaProjeto.limiteSubtarefas);
      });

      it('deve lançar erro ao criar projeto com limite de subtarefas negativo', () => {
        expect(() => {
          new Tarefa({ ...propsTarefaProjeto, limiteSubtarefas: -1 });
        }).toThrow(new CampoInvalidoException('limiteSubtarefas', 'não pode ser negativo'));
      });

      it('deve lançar erro ao criar projeto com pontos', () => {
        expect(() => {
          new Tarefa({ ...propsTarefaProjeto, pontos: 5 });
        }).toThrow(new CampoInvalidoException('projeto', 'não pode ter pontos, tempo estimado, prioridade ou tarefa pai'));
      });

      it('deve lançar erro ao criar projeto com tempo estimado', () => {
        expect(() => {
          new Tarefa({ ...propsTarefaProjeto, tempoEstimadoDias: 2 });
        }).toThrow(new CampoInvalidoException('projeto', 'não pode ter pontos, tempo estimado, prioridade ou tarefa pai'));
      });

      it('deve lançar erro ao criar projeto com prioridade', () => {
        expect(() => {
          new Tarefa({
            ...propsTarefaProjeto,
            prioridade: PrioridadeTarefa.ALTA,
          });
        }).toThrow(new CampoInvalidoException('projeto', 'não pode ter pontos, tempo estimado, prioridade ou tarefa pai'));
      });

      it('deve lançar erro ao criar projeto com tarefa pai', () => {
        const tarefaPai = new Tarefa({
          ...propsTarefaProjeto,
          tipo: TarefaTipo.PROJETO,
        });
        expect(() => {
          new Tarefa({ ...propsTarefaProjeto, tarefaPai });
        }).toThrow(new CampoInvalidoException('projeto', 'não pode ter pontos, tempo estimado, prioridade ou tarefa pai'));
      });
    });

    describe('adicionarSubtarefa', () => {
      it('deve adicionar subtarefa com sucesso', () => {
        const projeto = new Tarefa(propsTarefaProjeto);
        const subtarefa = new Tarefa({
          titulo: 'Subtarefa',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
        });

        projeto.adicionarSubtarefa(subtarefa);
        expect(projeto.subtarefas).toHaveLength(1);
        expect(projeto.subtarefas[0]).toBe(subtarefa);
      });

      it('deve lançar erro ao adicionar subtarefa em projeto em andamento', () => {
        const projeto = new Tarefa({
          ...propsTarefaProjeto,
          status: StatusTarefa.EM_ANDAMENTO,
        });
        const subtarefa = new Tarefa({
          titulo: 'Subtarefa',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
        });

        expect(() => projeto.adicionarSubtarefa(subtarefa)).toThrow(
          new CampoInvalidoException('status', 'não é possível adicionar subtarefa em andamento ou concluída'),
        );
      });

      it('deve lançar erro ao adicionar subtarefa do tipo projeto', () => {
        const projeto = new Tarefa(propsTarefaProjeto);
        const subtarefa = new Tarefa({
          ...propsTarefaProjeto,
          titulo: 'Subtarefa Projeto',
          tipo: TarefaTipo.PROJETO,
        });

        expect(() => projeto.adicionarSubtarefa(subtarefa)).toThrow(
          new CampoInvalidoException('tipo', 'não pode ser PROJETO para subtarefas'),
        );
      });

      it('deve lançar erro ao exceder limite de subtarefas', () => {
        const projeto = new Tarefa(propsTarefaProjeto);
        const subtarefa1 = new Tarefa({
          id: 1,
          titulo: 'Subtarefa 1',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
        });
        const subtarefa2 = new Tarefa({
          id: 2,
          titulo: 'Subtarefa 2',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
        });
        const subtarefa3 = new Tarefa({
          id: 3,
          titulo: 'Subtarefa 3',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
        });
        const subtarefa4 = new Tarefa({
          id: 4,
          titulo: 'Subtarefa 4',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
        });

        projeto.adicionarSubtarefa(subtarefa1);
        projeto.adicionarSubtarefa(subtarefa2);
        projeto.adicionarSubtarefa(subtarefa3);
        expect(() => projeto.adicionarSubtarefa(subtarefa4)).toThrow(
          new CampoInvalidoException('limiteSubtarefas', 'limite de 3 subtarefas atingido. Atual: 3'),
        );
      });

      it('deve lançar erro ao adicionar subtarefa em projeto concluído', () => {
        const projeto = new Tarefa({
          ...propsTarefaProjeto,
          status: StatusTarefa.CONCLUIDA,
          concluida: true,
        });
        const subtarefa = new Tarefa({
          id: 1,
          titulo: 'Subtarefa',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
        });

        expect(() => projeto.adicionarSubtarefa(subtarefa)).toThrow(
          new CampoInvalidoException('status', 'não é possível adicionar subtarefa em andamento ou concluída'),
        );
      });

      it('deve lançar erro ao adicionar subtarefa com mesmo id', () => {
        const projeto = new Tarefa(propsTarefaProjeto);
        const subtarefa = new Tarefa({
          id: 1,
          titulo: 'Subtarefa',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
        });

        projeto.adicionarSubtarefa(subtarefa);
        expect(() => projeto.adicionarSubtarefa(subtarefa)).toThrow(
          new CampoInvalidoException('subtarefa', 'já existe'),
        );
      });
    });

    describe('obterProgresso', () => {
      it('deve calcular progresso corretamente para projeto', () => {
        const projeto = new Tarefa(propsTarefaProjeto);
        const subtarefa1 = new Tarefa({
          titulo: 'Subtarefa 1',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.CONCLUIDA,
          concluida: true,
          tipo: TarefaTipo.SIMPLES,
        });
        const subtarefa2 = new Tarefa({
          titulo: 'Subtarefa 2',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
        });

        projeto.adicionarSubtarefa(subtarefa1);
        projeto.adicionarSubtarefa(subtarefa2);
        expect(projeto.obterProgresso()).toBe(50);
      });
    });

    describe('obterSumario', () => {
      it('deve retornar sumário correto para projeto', () => {
        const projeto = new Tarefa(propsTarefaProjeto);
        const subtarefa1 = new Tarefa({
          titulo: 'Subtarefa 1',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.CONCLUIDA,
          concluida: true,
          tipo: TarefaTipo.SIMPLES,
          pontos: 5,
          tempoEstimadoDias: 2,
        });
        const subtarefa2 = new Tarefa({
          titulo: 'Subtarefa 2',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
          pontos: 3,
          tempoEstimadoDias: 1,
        });

        projeto.adicionarSubtarefa(subtarefa1);
        projeto.adicionarSubtarefa(subtarefa2);

        const sumario = projeto.obterSumario();
        expect(sumario).toEqual({
          totalSubtarefas: 2,
          concluidas: 1,
          pendentes: 1,
          pontosTotais: 8,
          estimativaTotalDias: 3,
          progresso: 50,
        });
      });
    });

    describe('concluir', () => {
      it('deve lançar erro ao tentar concluir projeto com subtarefas pendentes', () => {
        const projeto = new Tarefa(propsTarefaProjeto);
        const subtarefa = new Tarefa({
          titulo: 'Subtarefa',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
        });

        projeto.adicionarSubtarefa(subtarefa);
        projeto.iniciar();

        expect(() => projeto.concluir()).toThrow(
          new CampoInvalidoException('status', 'Há subtarefas pendentes'),
        );
      });

      it('deve concluir projeto com todas subtarefas concluídas', () => {
        const projeto = new Tarefa(propsTarefaProjeto);
        const subtarefa = new Tarefa({
          titulo: 'Subtarefa',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.CONCLUIDA,
          concluida: true,
          tipo: TarefaTipo.SIMPLES,
        });

        projeto.adicionarSubtarefa(subtarefa);
        projeto.iniciar();
        projeto.concluir();

        expect(projeto.status).toBe(StatusTarefa.CONCLUIDA);
        expect(projeto.concluida).toBe(true);
      });
    });

    describe('clonar', () => {
      it('deve clonar projeto corretamente', () => {
        const projeto = new Tarefa(propsTarefaProjeto);
        const subtarefa = new Tarefa({
          titulo: 'Subtarefa',
          subtitulo: 'Subtítulo',
          descricao: 'Descrição',
          status: StatusTarefa.PENDENTE,
          concluida: false,
          tipo: TarefaTipo.SIMPLES,
        });

        projeto.adicionarSubtarefa(subtarefa);
        const clone = projeto.clonar();

        expect(clone).toBeInstanceOf(Tarefa);
        expect(clone.id).toBeUndefined();
        expect(clone.titulo).toBe(projeto.titulo);
        expect(clone.subtitulo).toBe(projeto.subtitulo);
        expect(clone.descricao).toBe(projeto.descricao);
        expect(clone.status).toBe(projeto.status);
        expect(clone.concluida).toBe(projeto.concluida);
        expect(clone.tipo).toBe(projeto.tipo);
        expect(clone.limiteSubtarefas).toBe(projeto.limiteSubtarefas);
        expect(clone.subtarefas).toHaveLength(1);
        expect(clone.subtarefas[0].id).toBeUndefined();
        expect(clone.subtarefas[0].titulo).toBe(subtarefa.titulo);
      });
    });
  });
});
