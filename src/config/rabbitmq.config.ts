import { registerAs } from '@nestjs/config';

export default registerAs('rabbitmq', () => ({
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  recoursQueue: process.env.RABBITMQ_RECOURS_QUEUE || 'recours_queue',
  exchange: process.env.RABBITMQ_EXCHANGE || 'al_mizan_events',
}));
