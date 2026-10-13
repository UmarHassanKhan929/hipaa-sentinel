import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuditWriterService } from './audit-writer.service.js';
import { actionFor, classifyRoute, stripQuery } from './route-classifier.js';
import { AuthedRequest } from './roles.js';

const clip = (v: string | undefined | null, max: number) =>
  v ? v.slice(0, max) : null;

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private readonly writer: AuditWriterService) {}

  use(req: AuthedRequest, res: Response, next: NextFunction) {
    const c = classifyRoute(req.originalUrl);
    if (!c.audited) return next();

    const start = process.hrtime.bigint();

    // 'finish' fires after guards/filters ran, so req.user and the final status code are known,
    // and rejected (401/403) and crashed (500) requests are still recorded.
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      this.writer.enqueue({
        occurred_at: new Date().toISOString(),
        user_id: req.user?.userId ?? 'anonymous',
        role: req.user?.role ?? 'NONE',
        action: actionFor(req.method),
        patient_id: clip(c.patientId, 128),
        resource: clip(c.resource, 256),
        client_ip: req.ip ?? null,
        user_agent: clip(req.headers['user-agent'], 256),
        method: req.method,
        path: stripQuery(req.originalUrl),
        status_code: res.statusCode,
        duration_ms: Number(durationMs.toFixed(3)),
      });
    });

    next();
  }
}
