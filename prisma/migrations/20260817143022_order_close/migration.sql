/*
  Warnings:

  - The values [COMPLETED,REFUNDED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `notes` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `payments` table. All the data in the column will be lost.
  - Made the column `location_id` on table `orders` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
ALTER TABLE "public"."orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_location_id_fkey";

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "notes",
ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "note" TEXT,
ALTER COLUMN "location_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "notes",
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "track_inventory" SET DEFAULT true;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
