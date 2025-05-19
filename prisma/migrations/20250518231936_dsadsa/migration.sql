/*
  Warnings:

  - The values [FOLHA,COMPOSTA,PIPELINE] on the enum `TarefaTipo` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `etapas` on the `tarefas-no-pattern-db` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TarefaTipo_new" AS ENUM ('SIMPLES', 'PROJETO');
ALTER TABLE "tarefas-no-pattern-db" ALTER COLUMN "tipo" TYPE "TarefaTipo_new" USING ("tipo"::text::"TarefaTipo_new");
ALTER TYPE "TarefaTipo" RENAME TO "TarefaTipo_old";
ALTER TYPE "TarefaTipo_new" RENAME TO "TarefaTipo";
DROP TYPE "TarefaTipo_old";
COMMIT;

-- AlterTable
ALTER TABLE "tarefas-no-pattern-db" DROP COLUMN "etapas";
