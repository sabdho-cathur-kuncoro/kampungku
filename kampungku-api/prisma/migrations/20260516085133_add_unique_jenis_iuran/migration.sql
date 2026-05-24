/*
  Warnings:

  - A unique constraint covering the columns `[nama]` on the table `jenis_iuran` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "jenis_iuran_nama_key" ON "jenis_iuran"("nama");
