import { Controller, Get } from '@nestjs/common';

@Controller('api/cohorts')
export class CohortsController {
  @Get('summary')
  summary() {
    // Stretch goal: small-cell suppression (e.g. hide counts < 11)
    return {
      cohortSize: 128,
      meanMMSE: 25.3,
      ageBands: { '60-69': 40, '70-79': 55, '80+': 33 },
    };
  }
}
