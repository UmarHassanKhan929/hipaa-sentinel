import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC } from './decorators.js';
import { AuthedRequest, isRole } from './roles.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    ) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const [type, token] = (req.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync<{
        sub?: string;
        role?: string;
      }>(token);
      if (!payload.sub || !isRole(payload.role))
        throw new Error('invalid claims');
      req.user = { userId: payload.sub, role: payload.role };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
