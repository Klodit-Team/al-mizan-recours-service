import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

@Injectable()
export class ParsePaginationPipe implements PipeTransform {
  transform(value: unknown): PaginationParams {
    const v = value as Record<string, string> | undefined;
    const page = Math.max(1, parseInt(v?.page ?? '', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(v?.limit ?? '', 10) || 20));

    if (isNaN(page) || isNaN(limit)) {
      throw new BadRequestException('Les paramètres de pagination sont invalides');
    }

    return { page, limit, skip: (page - 1) * limit };
  }
}
