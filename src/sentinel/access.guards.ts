import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators.js';
import { AuthedRequest, Role } from './roles.js';
import { classifyRoute } from './route-classifier.js';

/** § 164.312(a)(1): honour @Roles() on handlers/controllers. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required?.length) return true;
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user || !required.includes(req.user.role)) {
      throw new ForbiddenException('Insufficient privileges.');
    }
    return true;
  }
}

/** FR-5 (Privacy Rule § 164.502(b)): RESEARCHER may only use aggregate endpoints. */
@Injectable()
export class MinimumNecessaryGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const c = classifyRoute(req.originalUrl);
    if (c.audited && c.patientLevel && req.user?.role === Role.RESEARCHER) {
      throw new ForbiddenException('Insufficient privileges.');
    }
    return true;
  }
}
