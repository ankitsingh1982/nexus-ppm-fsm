-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER,
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectiveEvent" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectiveEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Objective_ownerId_idx" ON "Objective"("ownerId");

-- CreateIndex
CREATE INDEX "ObjectiveEvent_objectiveId_idx" ON "ObjectiveEvent"("objectiveId");

-- AddForeignKey
ALTER TABLE "ObjectiveEvent" ADD CONSTRAINT "ObjectiveEvent_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
