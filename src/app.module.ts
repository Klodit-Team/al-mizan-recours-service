import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RecoursModule } from './recours/recours.module';
import { HealthModule } from './health/health.module';
import { RedisCacheModule } from './cache/cache.module';
import appConfig from './config/app.config';
import rabbitmqConfig from './config/rabbitmq.config';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, rabbitmqConfig, redisConfig],
      envFilePath: ['.env', '.env.example'],
    }),

    PrismaModule,
    RedisCacheModule,
    RecoursModule,
    HealthModule,
  ],
})
export class AppModule {}
