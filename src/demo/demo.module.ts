import { Module } from '@nestjs/common';
import { CohortsController } from './cohorts.controller.js';
import { HealthController } from './health.controller.js';
import { PatientsController } from './patients.controller.js';

@Module({
  controllers: [PatientsController, CohortsController, HealthController],
})
export class DemoModule {}
