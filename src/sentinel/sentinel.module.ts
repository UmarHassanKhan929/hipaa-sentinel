import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MinimumNecessaryGuard, RolesGuard } from './access.guards.js';
import { AuditMiddleware } from './audit.middleware.js';
import { AuditWriterService } from './audit-writer.service.js';
import { JwtAuthGuard } from './auth.guard.js';
import { SanitizingExceptionFilter } from './sanitizing-exception.filter.js';
import { SENTINEL_OPTIONS, SentinelOptions } from './sentinel.options.js';

@Module({})
export class HipaaSentinelModule implements NestModule {
  static forRoot(options: SentinelOptions): DynamicModule {
    return {
      module: HipaaSentinelModule,
      global: true,
      imports: [
        JwtModule.register({
          secret: options.jwtSecret,
          verifyOptions: { algorithms: ['HS256'] }, // pin the algorithm
        }),
      ],
      providers: [
        { provide: SENTINEL_OPTIONS, useValue: options },
        AuditWriterService,
        AuditMiddleware,
        // Guards run in this order: authenticate -> role check -> minimum necessary
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: MinimumNecessaryGuard },
        { provide: APP_FILTER, useClass: SanitizingExceptionFilter },
      ],
      exports: [AuditWriterService],
    };
  }

  configure(consumer: MiddlewareConsumer) {
    // Nest 11 / Express 5 wildcard syntax. On Nest 10 use '*'.
    consumer
      .apply(AuditMiddleware)
      .forRoutes({ path: '*splat', method: RequestMethod.ALL });
  }
}
