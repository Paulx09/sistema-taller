/*
  Warnings:

  - You are about to alter the column `descripcion` on the `productos` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "productos" ALTER COLUMN "descripcion" SET DATA TYPE VARCHAR(255);
