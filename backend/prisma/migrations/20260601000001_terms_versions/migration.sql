-- CreateTable: TermsVersion (metadata + activation).
CREATE TABLE `TermsVersion` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(50) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NULL,

    UNIQUE INDEX `TermsVersion_label_key`(`label`),
    INDEX `TermsVersion_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: TermsVersionLocale (markdown content per language).
CREATE TABLE `TermsVersionLocale` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `termsVersionId` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(8) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TermsVersionLocale_termsVersionId_idx`(`termsVersionId`),
    UNIQUE INDEX `TermsVersionLocale_termsVersionId_locale_key`(`termsVersionId`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: UserTermsAcceptance (user × version trace).
CREATE TABLE `UserTermsAcceptance` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `termsVersionId` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip` VARCHAR(45) NULL,

    INDEX `UserTermsAcceptance_userId_idx`(`userId`),
    INDEX `UserTermsAcceptance_termsVersionId_idx`(`termsVersionId`),
    UNIQUE INDEX `UserTermsAcceptance_userId_termsVersionId_key`(`userId`, `termsVersionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TermsVersionLocale` ADD CONSTRAINT `TermsVersionLocale_termsVersionId_fkey` FOREIGN KEY (`termsVersionId`) REFERENCES `TermsVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserTermsAcceptance` ADD CONSTRAINT `UserTermsAcceptance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Restrict — empêche de supprimer une version acceptée.
ALTER TABLE `UserTermsAcceptance` ADD CONSTRAINT `UserTermsAcceptance_termsVersionId_fkey` FOREIGN KEY (`termsVersionId`) REFERENCES `TermsVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
