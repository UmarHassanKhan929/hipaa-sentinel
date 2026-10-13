import { Pool } from 'pg';

describe('audit.events immutability (acceptance criterion 2)', () => {
  const writer = new Pool({ connectionString: process.env.AUDIT_DB_DSN });
  const owner = new Pool({ connectionString: process.env.OWNER_DSN });

  beforeAll(async () => {
    await writer.query(
      `INSERT INTO audit.events (occurred_at,user_id,role,action,method,path,status_code,duration_ms)
       VALUES (now(),'u_test','CLINICIAN','READ','GET','/api/patients/p1',200,1.2)`,
    );
  });
  afterAll(async () => {
    await writer.end();
    await owner.end();
  });

  it('writer role can INSERT', async () => {
    const r = await writer.query(
      `INSERT INTO audit.events (occurred_at,user_id,role,action,method,path,status_code,duration_ms)
       VALUES (now(),'u_test','CLINICIAN','READ','GET','/x',200,1)`,
    );
    expect(r.rowCount).toBe(1);
  });

  it('writer role cannot UPDATE or DELETE', async () => {
    await expect(
      writer.query(`UPDATE audit.events SET user_id = 'x'`),
    ).rejects.toThrow(/permission denied/i);
    await expect(writer.query(`DELETE FROM audit.events`)).rejects.toThrow(
      /permission denied/i,
    );
  });

  it('even the owner is blocked by the append-only trigger', async () => {
    await expect(
      owner.query(`UPDATE audit.events SET user_id = 'x'`),
    ).rejects.toThrow(/append-only/i);
    await expect(owner.query(`DELETE FROM audit.events`)).rejects.toThrow(
      /append-only/i,
    );
    await expect(owner.query(`TRUNCATE audit.events`)).rejects.toThrow(
      /append-only/i,
    );
  });
});
