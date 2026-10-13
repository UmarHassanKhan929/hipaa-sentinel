import { Controller, Get, Query } from '@nestjs/common';
import { Pool } from 'pg';
import { Role, Roles } from '../sentinel/index.js';

const esc = (v: string | number | null | undefined) =>
  String(v ?? '').replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

@Controller('api/audit')
export class AuditController {
  private readonly pool = new Pool({
    connectionString: process.env.AUDIT_READER_DSN,
  });

  @Roles(Role.ADMIN)
  @Get()
  async list(@Query('limit') limit = '25', @Query('format') format?: string) {
    const n = Math.min(Math.max(Number.parseInt(limit, 10) || 25, 1), 100);
    const r = await this.pool.query(
      `SELECT occurred_at, user_id, role, action, method, path, status_code, duration_ms
       FROM audit.events ORDER BY id DESC LIMIT $1`,
      [n],
    );

    if (format === 'html') {
      if (r.rows.length === 0) {
        return '<tr><td colspan="7" class="hint">no events yet</td></tr>';
      }
      return r.rows
        .map((e) => {
          const code = Number(e.status_code);
          const cls = code < 300 ? 's-ok' : code < 500 ? 's-warn' : 's-err';
          return (
            `<tr><td>${esc(new Date(e.occurred_at).toISOString().slice(11, 19))}</td>` +
            `<td>${esc(e.user_id)}</td><td>${esc(e.role)}</td><td>${esc(e.action)}</td>` +
            `<td>${esc(e.method)} ${esc(e.path)}</td><td class="${cls}">${esc(e.status_code)}</td>` +
            `<td class="num">${esc(e.duration_ms)}</td></tr>`
          );
        })
        .join('');
    }

    return { events: r.rows };
  }
}
