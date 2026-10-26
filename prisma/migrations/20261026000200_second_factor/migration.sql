-- AlterTable
ALTER TABLE `Session` ADD COLUMN `twoFactorVerified` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `recoveryHashes` JSON NULL,
    ADD COLUMN `totpCipher` TEXT NULL,
    ADD COLUMN `totpEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `totpKeyVersion` VARCHAR(191) NULL,
    ADD COLUMN `totpLastStep` INTEGER NULL,
    ADD COLUMN `totpPendingCipher` TEXT NULL,
    ADD COLUMN `totpPendingVersion` VARCHAR(191) NULL;
