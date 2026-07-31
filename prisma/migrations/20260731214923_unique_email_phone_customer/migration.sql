/*
  Warnings:

  - A unique constraint covering the columns `[store_id,email]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[store_id,phone]` on the table `customers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "customers_store_id_email_idx";

-- CreateIndex
CREATE UNIQUE INDEX "customers_store_id_email_key" ON "customers"("store_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_store_id_phone_key" ON "customers"("store_id", "phone");
