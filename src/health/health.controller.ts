import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Health check du service',
    description: 'Vérifie la disponibilité du service et de sa connexion PostgreSQL.',
  })
  @ApiResponse({ status: 200, description: 'Service opérationnel' })
  @ApiResponse({ status: 503, description: 'Service indisponible' })
  async check() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    return {
      service: 'recours-service',
      status: 'ok',
      port: process.env.PORT || 8008,
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe (Kubernetes)',
    description: 'Indique si le service est prêt à recevoir du trafic.',
  })
  @ApiResponse({ status: 200, description: 'Service prêt' })
  ready() {
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe (Kubernetes)',
    description: 'Indique si le processus est vivant.',
  })
  @ApiResponse({ status: 200, description: 'Service vivant' })
  live() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }
}
