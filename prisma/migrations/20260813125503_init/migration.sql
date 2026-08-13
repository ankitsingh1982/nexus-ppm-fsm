-- CreateTable
CREATE TABLE "CollectionRecord" (
    "collection" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionRecord_pkey" PRIMARY KEY ("collection","id")
);

-- CreateIndex
CREATE INDEX "CollectionRecord_collection_idx" ON "CollectionRecord"("collection");
