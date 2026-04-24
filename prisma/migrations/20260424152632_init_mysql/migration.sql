-- CreateTable
CREATE TABLE `recours` (
    `id` CHAR(36) NOT NULL,
    `appel_offre_id` CHAR(36) NOT NULL,
    `operateur_id` CHAR(36) NOT NULL,
    `attribution_provisoire_id` CHAR(36) NOT NULL,
    `reference` VARCHAR(50) NOT NULL,
    `motif` VARCHAR(191) NOT NULL,
    `pieces_jointes_urls` JSON NULL,
    `date_depot` DATETIME(3) NOT NULL,
    `date_limite_reponse` DATETIME(3) NOT NULL,
    `statut` ENUM('DEPOSE', 'EN_EXAMEN', 'ACCEPTE', 'REJETE') NOT NULL DEFAULT 'DEPOSE',
    `decision` VARCHAR(191) NULL,
    `motif_decision` VARCHAR(191) NULL,
    `date_decision` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `recours_reference_key`(`reference`),
    INDEX `recours_appel_offre_id_idx`(`appel_offre_id`),
    INDEX `recours_operateur_id_idx`(`operateur_id`),
    INDEX `recours_statut_idx`(`statut`),
    INDEX `recours_date_depot_idx`(`date_depot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `examen_recours` (
    `id` CHAR(36) NOT NULL,
    `recours_id` CHAR(36) NOT NULL,
    `examinateur_id` CHAR(36) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `recommandation` VARCHAR(191) NULL,
    `date_examen` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `examen_recours_recours_id_key`(`recours_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historique_statut` (
    `id` CHAR(36) NOT NULL,
    `recours_id` CHAR(36) NOT NULL,
    `ancien_statut` ENUM('DEPOSE', 'EN_EXAMEN', 'ACCEPTE', 'REJETE') NULL,
    `nouveau_statut` ENUM('DEPOSE', 'EN_EXAMEN', 'ACCEPTE', 'REJETE') NOT NULL,
    `acteur_id` CHAR(36) NOT NULL,
    `commentaire` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `historique_statut_recours_id_idx`(`recours_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `examen_recours` ADD CONSTRAINT `examen_recours_recours_id_fkey` FOREIGN KEY (`recours_id`) REFERENCES `recours`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historique_statut` ADD CONSTRAINT `historique_statut_recours_id_fkey` FOREIGN KEY (`recours_id`) REFERENCES `recours`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
