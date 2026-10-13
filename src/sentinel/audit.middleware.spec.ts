import { EventEmitter } from 'events';
import { AuditMiddleware } from './audit.middleware.js';

describe('AuditMiddleware overhead (acceptance criterion 3)', () => {
  it('p99 of the synchronous path is under 3 ms', () => {
    const events: unknown[] = [];
    const mw = new AuditMiddleware({
      enqueue: (e: unknown) => events.push(e),
    } as never);
    const samples: number[] = [];

    for (let i = 0; i < 5000; i++) {
      const req: any = {
        method: 'GET',
        originalUrl: '/api/patients/pat_1/cognitive-trend?x=1',
        ip: '10.0.0.1',
        headers: { 'user-agent': 'jest' },
        user: { userId: 'u', role: 'CLINICIAN' },
      };
      const res: any = Object.assign(new EventEmitter(), { statusCode: 200 });
      const t0 = process.hrtime.bigint();
      mw.use(req, res, () => undefined);
      res.emit('finish');
      samples.push(Number(process.hrtime.bigint() - t0) / 1e6);
    }

    samples.sort((a, b) => a - b);
    expect(samples[Math.floor(samples.length * 0.99)]).toBeLessThan(3);
    expect(events).toHaveLength(5000);
  });
});
