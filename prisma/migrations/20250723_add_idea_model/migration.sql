-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('PENDING', 'REVIEWING', 'ACCEPTED', 'REJECTED', 'IMPLEMENTED');

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "IdeaStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Idea_userId_idx" ON "Idea"("userId");

-- CreateIndex
CREATE INDEX "Idea_status_idx" ON "Idea"("status");

-- CreateIndex
CREATE INDEX "Idea_createdAt_idx" ON "Idea"("createdAt");

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;