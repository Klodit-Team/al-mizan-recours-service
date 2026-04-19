import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 8009,
  apiPrefix: process.env.API_PREFIX || 'recours-service/v1',
  recoursDelaiReponseJours: parseInt(process.env.RECOURS_DELAI_REPONSE_JOURS, 10) || 10,
}));
