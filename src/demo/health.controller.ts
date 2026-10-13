import { Controller, Get } from '@nestjs/common';
import { Public } from '../sentinel/index.js';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  ok() {
    return { status: 'ok' };
  }
}
