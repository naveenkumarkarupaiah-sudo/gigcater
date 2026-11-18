-- Prisma migration generated from backend/prisma-diff-review.sql
-- Adds missing enums, columns, tables, indexes and foreign keys to align DB with schema.prisma

-- Create new enums
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');
CREATE TYPE "ComplaintStatus" AS ENUM ('PENDING', 'RESOLVED_GENUINE', 'RESOLVED_INVALID');

-- Extend existing enums
ALTER TYPE "ApplicationStatus" ADD VALUE 'PAID';
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- Add new columns to existing tables
ALTER TABLE "applications" 
  ADD COLUMN "additionalWorkers" TEXT,
  ADD COLUMN "attendanceConfirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "checkInLat" DOUBLE PRECISION,
  ADD COLUMN "checkInLng" DOUBLE PRECISION,
  ADD COLUMN "checkInPhoto" TEXT,
  ADD COLUMN "checkInTime" TIMESTAMP(3),
  ADD COLUMN "checkOutLat" DOUBLE PRECISION,
  ADD COLUMN "checkOutLng" DOUBLE PRECISION,
  ADD COLUMN "checkOutPhoto" TEXT,
  ADD COLUMN "checkOutTime" TIMESTAMP(3),
  ADD COLUMN "groupSize" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "paymentDueAt" TIMESTAMP(3),
  ADD COLUMN "paymentPaidAt" TIMESTAMP(3),
  ADD COLUMN "paymentProofKey" TEXT,
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "paymentStatus" "PaymentStatus",
  ADD COLUMN "rating" INTEGER;

ALTER TABLE "events" ADD COLUMN "category" TEXT;
ALTER TABLE "worker_profiles" ADD COLUMN "gpayNumber" TEXT;

-- Create new tables
CREATE TABLE "agent_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "photos" TEXT,
    "whatsappNumber" TEXT NOT NULL,
    "originalProofDoc" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- Indexes and foreign keys
CREATE UNIQUE INDEX "agent_profiles_userId_key" ON "agent_profiles"("userId");
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
