-- CreateEnum
CREATE TYPE "SequenceType" AS ENUM ('SEQUENTIAL', 'PARALLEL');

-- AlterTable
ALTER TABLE "ApprovalFlow" ADD COLUMN     "min_approval_percentage" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "sequence_type" "SequenceType" NOT NULL DEFAULT 'SEQUENTIAL';
