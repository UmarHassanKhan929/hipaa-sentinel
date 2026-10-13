import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AuditWriterService } from '../src/sentinel/index.js';

const token = (role: string, sub = 'usr_test') =>
  jwt.sign({ role }, process.env.JWT_SECRET!, {
    subject: sub,
    algorithm: 'HS256',
    expiresIn: '5m',
  });
const tick = () => new Promise((r) => setImmediate(r));

describe('hipaa-sentinel (e2e)', () => {
  let app: INestApplication;
  const events: any[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuditWriterService)
      .useValue({ enqueue: (e: unknown) => events.push(e) })
      .compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => (events.length = 0));

  describe('FR-4 error masking (acceptance criterion 1)', () => {
    it('returns only an opaque error + tracking ID on a simulated DB crash', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/patients/pat_1/_simulate-crash')
        .set('Authorization', `Bearer ${token('CLINICIAN')}`)
        .expect(500);

      expect(Object.keys(res.body).sort()).toEqual([
        'error',
        'message',
        'trackingId',
      ]);
      expect(res.body.trackingId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(JSON.stringify(res.body)).not.toMatch(
        /select|relation|ssn|patients|\.ts|node_modules|at\s/i,
      );
    });
  });

  describe('FR-5 minimum necessary', () => {
    it('blocks RESEARCHER from individual records', async () => {
      await request(app.getHttpServer())
        .get('/api/patients/pat_1')
        .set('Authorization', `Bearer ${token('RESEARCHER')}`)
        .expect(403);
    });
    it('allows RESEARCHER on aggregate cohorts', async () => {
      await request(app.getHttpServer())
        .get('/api/cohorts/summary')
        .set('Authorization', `Bearer ${token('RESEARCHER')}`)
        .expect(200);
    });
    it('allows CLINICIAN on individual records', async () => {
      await request(app.getHttpServer())
        .get('/api/patients/pat_1')
        .set('Authorization', `Bearer ${token('CLINICIAN')}`)
        .expect(200);
    });
  });

  describe('FR-2 audit entries', () => {
    it('records a successful read with all required fields', async () => {
      await request(app.getHttpServer())
        .get(
          '/api/patients/pat_99214/cognitive-trend?name=SHOULD_NOT_BE_LOGGED',
        )
        .set('Authorization', `Bearer ${token('CLINICIAN', 'usr_dr_smith')}`)
        .expect(200);
      await tick();

      expect(events).toHaveLength(1);
      const e = events[0];
      expect(e).toMatchObject({
        user_id: 'usr_dr_smith',
        role: 'CLINICIAN',
        action: 'READ',
        patient_id: 'pat_99214',
        resource: 'cognitive-trend',
        method: 'GET',
        path: '/api/patients/pat_99214/cognitive-trend',
        status_code: 200,
      });
      expect(new Date(e.occurred_at).toISOString()).toBe(e.occurred_at);
      expect(typeof e.duration_ms).toBe('number');
      expect(JSON.stringify(e)).not.toContain('SHOULD_NOT_BE_LOGGED');
    });

    it('records denied attempts (403) and unauthenticated attempts (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/patients/pat_1')
        .set('Authorization', `Bearer ${token('RESEARCHER', 'usr_res')}`)
        .expect(403);
      await request(app.getHttpServer()).get('/api/patients/pat_1').expect(401);
      await tick();

      expect(events.map((e) => [e.user_id, e.status_code])).toEqual([
        ['usr_res', 403],
        ['anonymous', 401],
      ]);
    });

    it('does not audit non-ePHI routes', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
      await tick();
      expect(events).toHaveLength(0);
    });
  });
});
