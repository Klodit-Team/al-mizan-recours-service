import { Module } from '@nestjs/common';
import { RecoursController } from './controllers/recours.controller';
import { RecoursService } from './services/recours.service';
import { RecoursRepository } from './repositories/recours.repository';
import { ReferenceGeneratorService } from './services/reference-generator.service';
import { DelaiValidatorService } from './services/delai-validator.service';
import { StatutTransitionService } from './services/statut-transition.service';
import { RecoursEventPublisher } from './events/recours-event.publisher';

/**
 * Module recours – encapsule tout le domaine métier du recours.
 * Chaque service a une responsabilité unique (SRP).
 * L'extension se fait par ajout de providers sans modifier l'existant (OCP).
 */
@Module({
  controllers: [RecoursController],
  providers: [
    // ── Services métier
    RecoursService,
    ReferenceGeneratorService,
    DelaiValidatorService,
    StatutTransitionService,

    // ── Data access
    RecoursRepository,

    // ── Messaging
    RecoursEventPublisher,
  ],
  exports: [RecoursService],
})
export class RecoursModule {}
