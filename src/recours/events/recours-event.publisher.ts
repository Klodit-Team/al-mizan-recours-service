import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { RABBITMQ_EVENTS } from '../../common/constants/recours.constants';

export interface RecoursEvent {
  eventType: string;
  recoursId: string;
  appelOffreId: string;
  operateurId: string;
  statut: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class RecoursEventPublisher implements OnModuleInit {
  private readonly logger = new Logger(RecoursEventPublisher.name);
  private channelModel: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      const url = this.config.get<string>('rabbitmq.url', 'amqp://guest:guest@localhost:5673');
      this.channelModel = await amqp.connect(url);
      this.channel = await this.channelModel.createChannel();

      const exchange = this.config.get<string>('rabbitmq.exchange', 'al_mizan_events');
      await this.channel.assertExchange(exchange, 'topic', { durable: true });

      this.logger.log('Connecté à RabbitMQ');
    } catch (error) {
      this.logger.warn(`RabbitMQ non disponible (mode dégradé): ${(error as Error).message}`);
    }
  }

  publish(event: RecoursEvent): void {
    if (!this.channel) {
      this.logger.warn(`Event ${event.eventType} non publié: RabbitMQ non connecté`);
      return;
    }

    try {
      const exchange = this.config.get<string>('rabbitmq.exchange', 'al_mizan_events');
      const routingKey = event.eventType;

      const message = Buffer.from(JSON.stringify(event));
      this.channel.publish(exchange, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      });

      this.logger.log(`Event publié: ${routingKey} | recours=${event.recoursId}`);
    } catch (error) {
      this.logger.error(`Erreur publication event: ${(error as Error).message}`);
    }
  }

  publishRecoursDepose(recours: {
    id: string;
    appelOffreId: string;
    operateurId: string;
    reference: string;
  }): void {
    this.publish({
      eventType: RABBITMQ_EVENTS.RECOURS_DEPOSE,
      recoursId: recours.id,
      appelOffreId: recours.appelOffreId,
      operateurId: recours.operateurId,
      statut: 'DEPOSE',
      timestamp: new Date().toISOString(),
      metadata: { reference: recours.reference },
    });
  }

  publishStatutChange(recours: {
    id: string;
    appelOffreId: string;
    operateurId: string;
    statut: string;
    decision?: string;
  }): void {
    const eventMap: Record<string, string> = {
      EN_EXAMEN: RABBITMQ_EVENTS.RECOURS_EN_EXAMEN,
      ACCEPTE: RABBITMQ_EVENTS.RECOURS_ACCEPTE,
      REJETE: RABBITMQ_EVENTS.RECOURS_REJETE,
    };

    const eventType = eventMap[recours.statut];
    if (!eventType) return;

    this.publish({
      eventType,
      recoursId: recours.id,
      appelOffreId: recours.appelOffreId,
      operateurId: recours.operateurId,
      statut: recours.statut,
      timestamp: new Date().toISOString(),
      metadata: recours.decision ? { decision: recours.decision } : undefined,
    });
  }
}
