import { classifyRoute } from './route-classifier.js';

describe('classifyRoute', () => {
  it.each([
    [
      '/api/patients/pat_1',
      { audited: true, patientLevel: true, patientId: 'pat_1' },
    ],
    [
      '/API/Patients/pat_1/',
      { audited: true, patientLevel: true, patientId: 'pat_1' },
    ],
    [
      '//api//patients/pat_1',
      { audited: true, patientLevel: true, patientId: 'pat_1' },
    ],
    [
      '/Observation?patient=pat_7',
      {
        audited: true,
        patientLevel: true,
        patientId: 'pat_7',
        resource: 'Observation',
      },
    ],
    [
      '/Condition/c1',
      { audited: true, patientLevel: true, resource: 'Condition/c1' },
    ],
    ['/api/cohorts/summary', { audited: true, patientLevel: false }],
    ['/health', { audited: false, patientLevel: false }],
  ])('%s', (url, expected) => {
    expect(classifyRoute(url)).toMatchObject(expected);
  });
});
