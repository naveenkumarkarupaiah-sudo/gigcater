-- AlterTable
ALTER TABLE "users" ADD COLUMN     "firebaseUid" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_firebaseUid_key" ON "users"("firebaseUid");
