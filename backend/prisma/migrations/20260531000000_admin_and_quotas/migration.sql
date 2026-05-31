-- AlterTable: add admin role, billing plan, quota override, suspension marker.
ALTER TABLE `User`
    ADD COLUMN `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    ADD COLUMN `plan` ENUM('FREE', 'PRO') NOT NULL DEFAULT 'FREE',
    ADD COLUMN `monthlyRequestQuota` INTEGER NULL,
    ADD COLUMN `suspendedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `User_role_idx` ON `User`(`role`);
