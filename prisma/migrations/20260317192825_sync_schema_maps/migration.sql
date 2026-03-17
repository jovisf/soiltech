/*
  Warnings:

  - You are about to drop the column `stateId` on the `cycles` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `farms` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `farms` table. All the data in the column will be lost.
  - You are about to drop the column `bladeAt100` on the `pivots` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `pivots` table. All the data in the column will be lost.
  - You are about to drop the column `farmId` on the `pivots` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `pivots` table. All the data in the column will be lost.
  - You are about to drop the column `isIrrigating` on the `states` table. All the data in the column will be lost.
  - You are about to drop the column `isOn` on the `states` table. All the data in the column will be lost.
  - You are about to drop the column `pivotId` on the `states` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - Added the required column `state_id` to the `cycles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `farms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `blade_at_100` to the `pivots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `farm_id` to the `pivots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `pivots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `is_irrigating` to the `states` table without a default value. This is not possible if the table is not empty.
  - Added the required column `is_on` to the `states` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pivot_id` to the `states` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "cycles" DROP CONSTRAINT "cycles_stateId_fkey";

-- DropForeignKey
ALTER TABLE "pivots" DROP CONSTRAINT "pivots_farmId_fkey";

-- DropForeignKey
ALTER TABLE "states" DROP CONSTRAINT "states_pivotId_fkey";

-- DropIndex
DROP INDEX "cycles_stateId_idx";

-- DropIndex
DROP INDEX "pivots_farmId_idx";

-- DropIndex
DROP INDEX "states_pivotId_idx";

-- AlterTable
ALTER TABLE "cycles" DROP COLUMN "stateId",
ADD COLUMN     "state_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "farms" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "pivots" DROP COLUMN "bladeAt100",
DROP COLUMN "createdAt",
DROP COLUMN "farmId",
DROP COLUMN "updatedAt",
ADD COLUMN     "blade_at_100" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "farm_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "states" DROP COLUMN "isIrrigating",
DROP COLUMN "isOn",
DROP COLUMN "pivotId",
ADD COLUMN     "is_irrigating" BOOLEAN NOT NULL,
ADD COLUMN     "is_on" BOOLEAN NOT NULL,
ADD COLUMN     "pivot_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "cycles_state_id_idx" ON "cycles"("state_id");

-- CreateIndex
CREATE INDEX "pivots_farm_id_idx" ON "pivots"("farm_id");

-- CreateIndex
CREATE INDEX "states_pivot_id_idx" ON "states"("pivot_id");

-- AddForeignKey
ALTER TABLE "pivots" ADD CONSTRAINT "pivots_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "states" ADD CONSTRAINT "states_pivot_id_fkey" FOREIGN KEY ("pivot_id") REFERENCES "pivots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;
