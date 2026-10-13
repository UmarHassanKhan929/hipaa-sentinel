import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { stripQuery } from './route-classifier.js';

@Catch()
export class SanitizingExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Sentinel');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();

    // Expected client errors (400/401/403/404...) keep their status but only a safe message.
    if (exception instanceof HttpException && exception.getStatus() < 500) {
      const status = exception.getStatus();
      return res.status(status).json({
        statusCode: status,
        error: HttpStatus[status] ?? 'ERROR',
        message: exception.message,
      });
    }

    // Everything else is opaque to the client, full detail stays internal.
    const trackingId = randomUUID();
    this.logger.error(
      `trackingId=${trackingId} ${req.method} ${stripQuery(req.originalUrl)}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message:
        'An unexpected error occurred. Quote the tracking ID when contacting support.',
      trackingId,
    });
  }
}
