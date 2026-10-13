import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool } from 'pg';
import { AuditEvent } from './audit-event.js';
import type { SentinelOptions } from './sentinel.options.js';
import { SENTINEL_OPTIONS } from './sentinel.options.js';

const MAX_QUEUE = 10_000;

const INSERT_SQL = `
INSERT INTO audit.events
  (occurred_at, user_id, role, action, patient_id, resource, client_ip,
   user_agent, method, path, status_code, duration_ms)
SELECT occurred_at, user_id, role, action, patient_id, resource, client_ip,
       user_agent, method, path, status_code, duration_ms
FROM jsonb_to_recordset($1::jsonb) AS t(
  occurred_at timestamptz, user_id text, role text, action text, patient_id text,
  resource text, client_ip text, user_agent text, method text, path text,
  status_code int, duration_ms numeric)`;

@Injectable()
export class AuditWriterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditWriterService.name);
  private pool!: Pool;
  private queue: AuditEvent[] = [];
  private timer?: NodeJS.Timeout;
  private flushing = false;

  constructor(
    @Inject(SENTINEL_OPTIONS) private readonly opts: SentinelOptions,
  ) {}

  onModuleInit() {
    this.pool = new Pool({ connectionString: this.opts.dbDsn, max: 5 });
    this.timer = setInterval(
      () => void this.flush(),
      this.opts.flushIntervalMs ?? 250,
    );
    this.timer.unref();
  }

  /** Called on the request path: must stay O(1) and never throw. */
  enqueue(event: AuditEvent): void {
    if (this.queue.length >= MAX_QUEUE) {
      this.logger.error(
        'Audit queue full, event dropped (database unreachable?)',
      );
      return;
    }
    this.queue.push(event);
    if (this.queue.length >= (this.opts.batchSize ?? 100)) void this.flush();
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;
    const batch = this.queue.splice(0, 500);
    try {
      await this.pool.query(INSERT_SQL, [JSON.stringify(batch)]);
    } catch (err) {
      this.queue.unshift(...batch); // retry next tick
      // never log the batch itself: it contains patient identifiers
      this.logger.error(`Audit flush failed: ${(err as Error).message}`);
    } finally {
      this.flushing = false;
    }
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    while (this.queue.length > 0) {
      const before = this.queue.length;
      await this.flush();
      if (this.queue.length >= before) break; // DB down, give up
    }
    await this.pool.end();
  }
}
