import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role, Roles } from '../sentinel/index.js';

@Controller('api/patients')
export class PatientsController {
  @Get(':id')
  getOne(@Param('id') id: string) {
    return { id, name: 'Synthetic Patient', dob: '1950-01-01' };
  }

  @Get(':id/cognitive-trend')
  trend(@Param('id') id: string) {
    return {
      patientId: id,
      measure: 'MMSE',
      points: [
        { date: '2026-01-01', score: 27 },
        { date: '2026-07-01', score: 25 },
      ],
    };
  }

  @Post()
  @Roles(Role.CLINICIAN, Role.ADMIN)
  create(@Body() _body: Record<string, unknown>) {
    return { id: 'pat_new' };
  }

  /** Demo only: simulates a leaky DB crash. Remove before production. */
  @Get(':id/_simulate-crash')
  crash(): never {
    throw new Error(
      `relation "patients" does not exist; query: SELECT * FROM patients WHERE ssn = '000-00-0000'`,
    );
  }
}
