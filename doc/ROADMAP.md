# Roadmap

Where this is headed next. Right now the library does JWT auth with role guards, aggregate-only endpoints for non-clinical roles, an append-only audit log in Postgres, and an exception filter that keeps error responses opaque. The e2e suite covers all of it.

## Next up

### Hash chain on the audit log

The log is append-only by privilege today, which stops a sloppy `UPDATE` but not someone who drops the trigger or edits the table as superuser. The plan is to make tampering detectable: each row stores the SHA-256 of the previous row plus its own contents, and a small script walks the chain and reports the first link that does not recompute.

Sketch:

```sql
ALTER TABLE audit.events
  ADD COLUMN chain_id  UUID,
  ADD COLUMN seq       BIGINT,
  ADD COLUMN prev_hash TEXT,
  ADD COLUMN row_hash  TEXT;
```

`row_hash` is SHA-256 over the previous hash plus the row contents with a fixed column order and serialization, so verification is reproducible. The audit writer already serializes inserts through a single queue per process, so hashing at insert time needs no new locking. One honest caveat: multiple app instances mean multiple writers, hence the `chain_id` column - each instance keeps its own chain, and the verifier walks them independently. A single global chain would need one writer only; fine for a demo, not an assumption to bake in.

Verification becomes a CLI script (`scripts/verify-chain.ts`) that exits non-zero and prints the first broken `seq` when a row was mutated or removed. Worth an e2e test that mutates a row as superuser (trigger disabled) and asserts the verifier catches it.

### Break-glass access

Deny-by-default is right up until a clinician needs a chart at 3am. Emergency access gets a header (`X-Break-Glass-Reason`, required, non-empty - missing means 403, never fail-open), applies only to routes marked as eligible, and writes an audit row with `action: 'BREAK_GLASS'` plus the reason even if the handler then fails. Researchers do not get to break glass. Non-eligible routes reject the header outright so nobody gains a silent bypass.

### Benchmarks in the README

Real numbers beat adjectives. Three scenarios with autocannon - authed PHI read, de-identified aggregate, crash path - against baseline and sentinel-enabled builds, reporting req/s and p99. The audit writer batches inserts in the background, so the comparison stays honest; note the queue depth and DB size in the methodology. One command should reproduce it.

## Also worth doing

- **`@Ephi()` decorator as the classification source of truth.** Regex classification fails open if someone adds an ePHI route that does not match the patterns. Decorated routes win, the regexes become a safety net, and in strict mode an undecorated PHI-shaped route is treated as PHI. Startup can log the route-to-classification map so mistakes are visible.
- **Log redaction.** Stack traces and DB error text can carry ePHI or schema names (the demo crash endpoint currently leaks the `patients` table name into logs). pino with redact paths, plus a scrubber for DB error text, while keeping the trackingId correlation intact.
- **Small-cell suppression.** Cohort summaries with counts under a small threshold (default 5) get suppressed, including the complementary case where the remainder is small enough to invert. Supports the de-identification intent of the aggregate endpoints (Privacy Rule § 164.514 territory, not a technical safeguard).

## Later

- **Nightly export to S3 with Object Lock.** Off-database retention copy: NDJSON plus a manifest (row count, first/last hash) into a COMPLIANCE-mode locked bucket, kept verifiable by the hash chain. Local rows stay put; the export is the retention copy, and the six-year retention itself is an organizational policy (§ 164.316(b)(2)) this supports. LocalStack or MinIO keeps the test loop free.
- **Publish to npm** once the API surface settles: scoped package, peer deps on `@nestjs/common`, `files:` whitelist, and a separate demo repo that consumes the published package like a real user would.

## Order

Benchmarks first since they are half a day and make the README concrete. Then the `@Ephi()` decorator, because break-glass route marking builds on it. The hash chain after that - it is the centerpiece, and it makes the S3 export meaningful when that lands. Redaction and small-cell suppression slot in anywhere as polish. Publishing waits until the surface stops moving.
