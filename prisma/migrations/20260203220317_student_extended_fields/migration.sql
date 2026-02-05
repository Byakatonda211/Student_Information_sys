/*
  SAFE MIGRATION: Student Extended Fields Only

  This migration intentionally ONLY adds new optional columns to "Student"
  (PLE particulars, residence/emergency, health details).

  It does NOT drop/alter any other tables or columns to avoid data loss.
*/

-- AlterTable
ALTER TABLE "Student"
  ADD COLUMN IF NOT EXISTS "religion" TEXT,
  ADD COLUMN IF NOT EXISTS "nationality" TEXT,
  ADD COLUMN IF NOT EXISTS "medicalNotes" TEXT,

  -- PLE particulars
  ADD COLUMN IF NOT EXISTS "pleSittingYear" INTEGER,
  ADD COLUMN IF NOT EXISTS "plePrimarySchool" TEXT,
  ADD COLUMN IF NOT EXISTS "pleIndexNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "pleAggregates" INTEGER,
  ADD COLUMN IF NOT EXISTS "pleDivision" TEXT,

  -- Residence & emergency
  ADD COLUMN IF NOT EXISTS "village" TEXT,
  ADD COLUMN IF NOT EXISTS "parish" TEXT,
  ADD COLUMN IF NOT EXISTS "districtOfResidence" TEXT,
  ADD COLUMN IF NOT EXISTS "homeDistrict" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT,

  -- Health details
  ADD COLUMN IF NOT EXISTS "medicalConditions" TEXT,
  ADD COLUMN IF NOT EXISTS "recurrentMedication" TEXT,
  ADD COLUMN IF NOT EXISTS "knownDisability" TEXT;
