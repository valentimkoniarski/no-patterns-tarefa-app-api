-- CreateTable
CREATE TABLE "tarefas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "subtitulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataCriacao" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" DATETIME,
    "dataPrazo" DATETIME,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "tipo" TEXT NOT NULL,
    "tarefaPaiId" INTEGER,
    "limite" INTEGER,
    "prioridade" TEXT,
    "pontos" INTEGER,
    "tempoEstimadoDias" INTEGER,
    CONSTRAINT "tarefas_tarefaPaiId_fkey" FOREIGN KEY ("tarefaPaiId") REFERENCES "tarefas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
