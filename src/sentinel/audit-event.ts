export type AuditAction = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditEvent {
  occurred_at: string;
  user_id: string;
  role: string;
  action: AuditAction;
  patient_id: string | null;
  resource: string | null;
  client_ip: string | null;
  user_agent: string | null;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
}
