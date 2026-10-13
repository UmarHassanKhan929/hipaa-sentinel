-- Roles. Change passwords outside of local dev.
CREATE ROLE audit_writer LOGIN PASSWORD 'writer_pass';  -- INSERT only (the app uses this)
CREATE ROLE audit_reader LOGIN PASSWORD 'reader_pass';  -- SELECT only (compliance officers)

CREATE SCHEMA audit;

CREATE TABLE audit.events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at   TIMESTAMPTZ  NOT NULL,
  user_id       TEXT         NOT NULL,
  role          TEXT         NOT NULL,
  action        TEXT         NOT NULL CHECK (action IN ('READ','CREATE','UPDATE','DELETE')),
  patient_id    TEXT,
  resource      TEXT,
  client_ip     TEXT,
  user_agent    TEXT,
  method        TEXT         NOT NULL,
  path          TEXT         NOT NULL,
  status_code   INT          NOT NULL,
  duration_ms   NUMERIC(10,3) NOT NULL,
  recorded_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ON audit.events (patient_id, occurred_at);
CREATE INDEX ON audit.events (user_id, occurred_at);

-- Privileges: least privilege, explicit.
REVOKE ALL ON SCHEMA audit FROM PUBLIC;
GRANT USAGE ON SCHEMA audit TO audit_writer, audit_reader;
GRANT INSERT ON audit.events TO audit_writer;
GRANT SELECT ON audit.events TO audit_reader;
-- audit_writer has NO select/update/delete/truncate. Nobody is granted UPDATE/DELETE.

-- Defense in depth: even the table owner / a mistaken GRANT can't mutate rows.
CREATE FUNCTION audit.reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit.events is append-only';
END $$;

CREATE TRIGGER events_no_update_delete
  BEFORE UPDATE OR DELETE ON audit.events
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();

CREATE TRIGGER events_no_truncate
  BEFORE TRUNCATE ON audit.events
  FOR EACH STATEMENT EXECUTE FUNCTION audit.reject_mutation();