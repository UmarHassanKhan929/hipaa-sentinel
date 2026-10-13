import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isRole, Public } from '../sentinel/index.js';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly jwt: JwtService) {}

  /** Demo only: mints tokens so the browser UI can act as any role. Remove before production. */
  @Public()
  @Post('demo-token')
  token(@Body() body: { role?: string; userId?: string }) {
    if (!body.role || !isRole(body.role)) {
      throw new BadRequestException('role must be CLINICIAN, RESEARCHER or ADMIN');
    }
    return {
      token: this.jwt.sign(
        { role: body.role },
        { subject: body.userId ?? 'usr_demo_user', expiresIn: '1h' },
      ),
    };
  }
}
