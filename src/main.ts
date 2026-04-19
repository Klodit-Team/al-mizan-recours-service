import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 8009);
  const apiPrefix = configService.get<string>('API_PREFIX', 'recours-service/v1');

  // ── Global prefix
  app.setGlobalPrefix(apiPrefix);

  // ── CORS
  app.enableCors({
    origin: false, // Géré par l'API Gateway
    credentials: true,
  });

  // ── Global Pipes: validation & transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global Interceptors
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  // ── Swagger / OpenAPI 3.0
  const swaggerConfig = new DocumentBuilder()
    .setTitle(configService.get('SWAGGER_TITLE', 'Al-Mizan – Service Recours'))
    .setDescription(
      configService.get(
        'SWAGGER_DESCRIPTION',
        'Microservice de gestion des recours – Loi 23-12, Art. 82-84',
      ),
    )
    .setVersion(configService.get('SWAGGER_VERSION', '1.0'))
    .addTag('recours', 'Gestion des recours des soumissionnaires')
    .addTag('examen', 'Examen et décision par la Commission des marchés')
    .addTag('health', 'Santé et disponibilité du service')
    .addBearerAuth(
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'session_id',
        description: "Session ID (cookie HttpOnly sécurisé géré par l'API Gateway)",
      },
      'session-cookie',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(port);
  console.log(`Recours Service démarré sur http://localhost:${port}/${apiPrefix}`);
  console.log(`Swagger UI: http://localhost:${port}/${apiPrefix}/docs`);
}

void bootstrap();
