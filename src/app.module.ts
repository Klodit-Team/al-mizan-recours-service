import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RecoursModule } from './recours/recours.module';
import { HealthModule } from './health/health.module';
import appConfig from './config/app.config';
import rabbitmqConfig from './config/rabbitmq.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, rabbitmqConfig],
      envFilePath: '.env',
    }),
    PrismaModule,
    RecoursModule,
    HealthModule,
  ],
})
export class AppModule {}
