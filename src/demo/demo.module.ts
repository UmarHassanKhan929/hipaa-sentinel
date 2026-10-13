import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { AuthController } from './auth.controller.js';
import { CohortsController } from './cohorts.controller.js';
import { HealthController } from './health.controller.js';
import { PatientsController } from './patients.controller.js';

@Module({
  controllers: [
    AuthController,
    PatientsController,
    CohortsController,
    HealthController,
    AuditController,
  ],
})
export class DemoModule {}
