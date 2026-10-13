export const SENTINEL_OPTIONS = Symbol('SENTINEL_OPTIONS');

export interface SentinelOptions {
  dbDsn: string;
  jwtSecret: string;
  flushIntervalMs?: number; // default 250
  batchSize?: number; // default 100
}
