import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const header = 'x-correlation-id';
    const incoming = req.header(header)?.trim();
    const correlationId = incoming && incoming.length > 0 ? incoming : randomUUID();
    req.headers[header] = correlationId;
    res.setHeader(header, correlationId);
    next();
  }
}
