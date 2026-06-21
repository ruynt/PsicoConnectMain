-- CreateEnum
CREATE TYPE "PsychologistPatientStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "PsychologistPatient"
  ADD COLUMN "status" "PsychologistPatientStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "respondedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3);

-- Backfill old inactive links as rejected so only active approved links remain valid.
UPDATE "PsychologistPatient"
SET "status" = 'REJECTED',
    "respondedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP),
    "rejectedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)
WHERE "active" = false;

-- Mark old active links as already approved.
UPDATE "PsychologistPatient"
SET "status" = 'APPROVED',
    "respondedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "active" = true;

-- CreateIndex
CREATE INDEX "PsychologistPatient_status_idx" ON "PsychologistPatient"("status");

-- CreateIndex
CREATE INDEX "PsychologistPatient_patientId_status_idx" ON "PsychologistPatient"("patientId", "status");

-- CreateIndex
CREATE INDEX "PsychologistPatient_psychologistId_status_idx" ON "PsychologistPatient"("psychologistId", "status");
