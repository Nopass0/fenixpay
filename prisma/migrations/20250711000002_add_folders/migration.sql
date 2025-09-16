-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisiteOnFolder" (
    "folderId" TEXT NOT NULL,
    "requisiteId" TEXT NOT NULL,

    CONSTRAINT "RequisiteOnFolder_pkey" PRIMARY KEY ("folderId","requisiteId")
);

-- CreateIndex
CREATE INDEX "Folder_traderId_idx" ON "Folder"("traderId");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisiteOnFolder" ADD CONSTRAINT "RequisiteOnFolder_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisiteOnFolder" ADD CONSTRAINT "RequisiteOnFolder_requisiteId_fkey" FOREIGN KEY ("requisiteId") REFERENCES "BankDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;