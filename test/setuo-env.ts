process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-123';
process.env.AUDIT_DB_DSN ??=
  'postgresql://audit_writer:writer_pass@localhost:5432/audit_store';
process.env.OWNER_DSN ??=
  'postgresql://postgres:postgres@localhost:5432/audit_store';
