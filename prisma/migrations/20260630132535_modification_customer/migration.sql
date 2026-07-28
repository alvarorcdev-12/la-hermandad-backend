/*
  Warnings:

  - You are about to drop the column `can_delete` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `customers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "can_delete",
DROP COLUMN "notes",
ADD COLUMN     "note" TEXT;
