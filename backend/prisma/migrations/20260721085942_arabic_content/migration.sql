-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "addressAr" TEXT,
ADD COLUMN     "cityAr" TEXT,
ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "bioAr" TEXT,
ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "nameAr" TEXT;
