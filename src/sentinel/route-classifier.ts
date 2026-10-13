import { AuditAction } from './audit-event.js';

export interface RouteClassification {
  /** Should this request be written to the audit trail? */
  audited: boolean;
  /** True for individual-patient access, false for aggregate/cohort endpoints. */
  patientLevel: boolean;
  patientId?: string;
  resource?: string;
}

const PATIENTS = /^\/api\/patients(?:\/([^/]+))?(?:\/(.+))?$/i;
const COHORTS = /^\/api\/cohorts(?:\/.*)?$/i;
const FHIR = /^\/(Observation|Condition)(?:\/([^/]+))?$/i;

const NOT_AUDITED: RouteClassification = {
  audited: false,
  patientLevel: false,
};

export function stripQuery(url: string): string {
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

export function classifyRoute(originalUrl: string): RouteClassification {
  const q = originalUrl.indexOf('?');
  const params = new URLSearchParams(q === -1 ? '' : originalUrl.slice(q + 1));
  // normalise: collapse duplicate slashes, drop trailing slash
  const path = stripQuery(originalUrl)
    .replace(/\/{2,}/g, '/')
    .replace(/(.)\/$/, '$1');

  if (COHORTS.test(path)) {
    // De-identified aggregates: still audited (who looked at what), but not patient-level.
    return { audited: true, patientLevel: false, resource: path };
  }

  const p = PATIENTS.exec(path);
  if (p) {
    return {
      audited: true,
      patientLevel: true,
      patientId: p[1],
      resource: p[2] ?? undefined,
    };
  }

  const f = FHIR.exec(path);
  if (f) {
    const subject =
      params.get('patient') ?? params.get('subject')?.replace(/^Patient\//, '');
    return {
      audited: true,
      patientLevel: true,
      patientId: subject ?? undefined,
      resource: f[2] ? `${f[1]}/${f[2]}` : f[1],
    };
  }

  return NOT_AUDITED;
}

export function actionFor(method: string): AuditAction {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'READ';
  }
}
