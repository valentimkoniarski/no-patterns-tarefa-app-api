# Regras de Negócio do Domínio de Tarefas

## 1. Regras Gerais de Tarefa
- Título não pode ser vazio
- Subtítulo não pode ser vazio
- Descrição não pode ser vazio
- Tipo de tarefa deve ser válido (SIMPLES ou PROJETO)

## 2. Regras de Tarefa Simples
- Não pode ter subtarefas
- Pontos não podem ser negativos
- Tempo estimado em dias não pode ser negativo
- Se status for CONCLUIDA, a tarefa deve estar marcada como concluída
- Pode ter prioridade (BAIXA por padrão)
- Pode ter pontos (0 por padrão)
- Pode ter tempo estimado em dias (0 por padrão)
- Pode ter tarefa pai

## 3. Regras de Tarefa Projeto
- Não pode ter pontos
- Não pode ter tempo estimado
- Não pode ter prioridade
- Não pode ter tarefa pai
- Limite de subtarefas não pode ser negativo
- Pode ter subtarefas (até o limite definido)
- Subtarefas devem ser do tipo SIMPLES
- Não pode adicionar subtarefas se estiver em andamento ou concluído

## 4. Regras de Status
- Uma tarefa pendente pode ser iniciada
- Uma tarefa em andamento não pode ser iniciada novamente
- Uma tarefa concluída não pode ser iniciada
- Uma tarefa pendente não pode ser concluída
- Uma tarefa em andamento pode ser concluída
- Uma tarefa concluída não pode ser concluída novamente
- Um projeto só pode ser concluído se todas as subtarefas estiverem concluídas

## 5. Regras de Subtarefas
- Não pode adicionar subtarefa do tipo PROJETO
- Não pode adicionar subtarefa com mesmo ID
- Não pode exceder o limite de subtarefas do projeto
- Não pode adicionar subtarefa em projeto em andamento ou concluído

## 6. Regras de Progresso
- Tarefa simples pendente tem progresso 0%
- Tarefa simples em andamento tem progresso 50%
- Tarefa simples concluída tem progresso 100%
- Progresso do projeto é calculado pela média de subtarefas concluídas

## 7. Regras de Clone
- Clone não deve ter ID
- Clone deve ter status PENDENTE
- Clone não deve estar concluído
- Clone de projeto deve clonar todas as subtarefas
- Subtarefas clonadas não devem ter ID

## 8. Regras de Sumário
- Tarefa simples tem totalSubtarefas = 1
- Projeto soma pontos de todas as subtarefas
- Projeto soma tempo estimado de todas as subtarefas
- Projeto conta subtarefas concluídas e pendentes