import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface RequestUser {
  userId: string;
  roles: string[];
  organisationId?: string;
}

/**
 * Extrait l'utilisateur de la session Redis (injectée par l'API Gateway).
 * L'API Gateway valide la session et injecte les données utilisateur
 * dans les headers avant de forwarder la requête au microservice.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // L'API Gateway injecte l'utilisateur dans les headers
    const user: RequestUser = {
      userId: request.headers['x-user-id'] as string,
      roles: JSON.parse(
        (request.headers['x-user-roles'] as string | undefined) ?? '[]',
      ) as string[],
      organisationId: request.headers['x-organisation-id'] as string | undefined,
    };

    return data ? user[data] : user;
  },
);
