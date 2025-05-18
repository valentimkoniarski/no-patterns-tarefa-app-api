-- CreateEnum
CREATE TYPE "StatusTarefa" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "TarefaTipo" AS ENUM ('FOLHA', 'COMPOSTA', 'PIPELINE');

-- CreateEnum
CREATE TYPE "PrioridadeTarefa" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- CreateTable
CREATE TABLE "tarefas-no-pattern-db" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "subTitulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusTarefa" NOT NULL DEFAULT 'PENDENTE',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,
    "dataPrazo" TIMESTAMP(3),
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "tipo" "TarefaTipo" NOT NULL,
    "tarefaPaiId" INTEGER,
    "limite" INTEGER,
    "prioridade" "PrioridadeTarefa",
    "pontos" INTEGER,
    "tempoEstimadoDias" INTEGER,
    "etapas" JSONB,

    CONSTRAINT "tarefas-no-pattern-db_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tarefas-no-pattern-db" ADD CONSTRAINT "tarefas-no-pattern-db_tarefaPaiId_fkey" FOREIGN KEY ("tarefaPaiId") REFERENCES "tarefas-no-pattern-db"("id") ON DELETE CASCADE ON UPDATE CASCADE;
