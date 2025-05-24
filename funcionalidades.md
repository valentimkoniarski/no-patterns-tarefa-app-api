# Documentação da API de Tarefas

## Endpoints

### 1. Listagem e Filtros
#### GET /tarefas
Lista todas as tarefas com suporte a paginação e filtros.

**Parâmetros de Query:**
- `pagina` (default: 1): Número da página
- `limite` (default: 10): Itens por página
- `filtros` (opcional): JSON com filtros

**Operadores de Filtro:**
- `eq`: igual
- `contains`: contém texto
- `gt`: maior que
- `lt`: menor que
- `range`: intervalo de datas

**Resposta:**
```json
{
  "tarefas": [...],
  "paginacao": {
    "pagina": 1,
    "limite": 10,
    "total": 100,
    "totalPaginas": 10
  }
}
```

### 2. Detalhes
#### GET /tarefas/:id/detalhes
Retorna informações detalhadas de uma tarefa específica.

**Resposta:**
```json
{
  "sumario": {
    "totalSubtarefas": 1,
    "concluidas": 0,
    "pendentes": 1,
    "pontosTotais": 5,
    "estimativaTotalDias": 2,
    "progresso": 0
  },
  "tarefaExistente": {...}
}
```

### 3. Criação
#### POST /tarefas
Cria uma nova tarefa.

**Tipos de Tarefa:**

1. **Tarefa Simples**
```json
{
  "titulo": "string",
  "subtitulo": "string",
  "descricao": "string",
  "tipo": "SIMPLES",
  "prioridade": "BAIXA|MEDIA|ALTA",
  "pontos": 0,
  "tempoEstimadoDias": 0,
  "tarefaPaiId": 1 // opcional
}
```

2. **Tarefa Projeto**
```json
{
  "titulo": "string",
  "subtitulo": "string",
  "descricao": "string",
  "tipo": "PROJETO",
  "subtarefasIds": [1, 2, 3],
  "limite": 5 // opcional
}
```

### 4. Atualização
#### PUT /tarefas/:id
Atualiza uma tarefa existente.

**Body:** Mesmo formato da criação, com campos opcionais.

### 5. Gerenciamento de Status
#### PATCH /tarefas/:id/iniciar
Inicia uma tarefa, mudando seu status para EM_ANDAMENTO.

#### PATCH /tarefas/:id/concluir
Conclui uma tarefa, mudando seu status para CONCLUIDA.

### 6. Clonagem
#### POST /tarefas/:id/clonar
Cria uma cópia da tarefa.

**Body (opcional):** DTO para sobrescrever dados do clone.

### 7. Remoção
#### DELETE /tarefas/:id
Remove uma tarefa do sistema.

## Códigos de Erro

### 400 Bad Request
- Dados inválidos
- Formato de filtros inválido
- Operador de filtro inválido
- Subtarefa já tem pai
- Tarefa pai deve ser do tipo PROJETO

### 404 Not Found
- Tarefa não encontrada
- Tarefa pai não encontrada
- Subtarefas não encontradas

## Validações

### Tarefa Simples
- Não pode ter subtarefas
- Pontos não podem ser negativos
- Tempo estimado não pode ser negativo
- Status CONCLUIDA requer concluida = true

### Tarefa Projeto
- Não pode ter pontos
- Não pode ter tempo estimado
- Não pode ter prioridade
- Não pode ter tarefa pai
- Limite de subtarefas não pode ser negativo
- Subtarefas devem ser do tipo SIMPLES

### Status
- Pendente → Em Andamento
- Em Andamento → Concluída
- Projeto só conclui com todas subtarefas concluídas

### Subtarefas
- Não pode ser do tipo PROJETO
- Não pode ter mesmo ID
- Não pode exceder limite
- Não pode adicionar em projeto em andamento/concluído 