-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'ADMIN';