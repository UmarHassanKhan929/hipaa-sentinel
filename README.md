# HIPAA Sentinel

Zero-trust forensic auditing and technical safeguard middleware for healthcare APIs.

---

> CAUTION. No library makes an app "HIPAA compliant". Compliance is organizational (risk analysis, BAAs, policies, training). This project supports Security Rule technical safeguards. Use synthetic data only, never real PHI.

## Overview

Under **45 CFR Part 164 Subpart C**, handling electronic Protected Health Information (ePHI) requires technical safeguards. `hipaa-sentinel` provides drop-in HTTP middleware to enforce audit logging, access controls, and data-leak prevention on API gateways.

---

## Technical Safeguards Mapping

| 45 CFR Regulation   | Legal Requirement                                           | Implementation                                                                                                           |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **§ 164.312(a)(1)** | Access Control (Security Rule)                              | Role-based verification (`CLINICIAN`, `RESEARCHER`, `ADMIN`).                                                            |
| **§ 164.312(b)**    | Audit Controls (Security Rule)                              | Records and supports examination of activity for every ePHI access event, via tamper-resistant (append-only) audit logs. |
| **§ 164.312(c)(1)** | Integrity (Security Rule)                                   | WORM-style append-only audit log protects audit records against improper alteration or destruction.                      |
| **§ 164.502(b)**    | Minimum Necessary (Privacy Rule, not a technical safeguard) | Restricts non-clinical roles to de-identified aggregate endpoints.                                                       |

> Note. Error-response sanitization (stripping stack traces and database structures from error messages) is general secure-coding hygiene per OWASP (avoid information disclosure), not a mapped HIPAA technical safeguard.

---

## Audit Record Schema

```json
{
  "timestamp": "2026-10-07T10:15:30Z",
  "userId": "usr_dr_smith",
  "role": "CLINICIAN",
  "action": "READ_PATIENT_CHART",
  "patientId": "pat_99214",
  "resource": "Observation/MMSE",
  "clientIp": "192.168.1.45",
  "method": "GET",
  "path": "/api/patients/pat_99214/cognitive-trend",
  "statusCode": 200,
  "durationMs": 12.4
}
```

---

## Production Hardening

> a Postgres superuser can disable triggers. Real WORM needs the DB superuser locked away plus log shipping to something like S3 Object Lock.

---

> regex classification fails open if someone adds a new ePHI route that doesn't match. Stretch goal: an @Ephi() decorator on controllers as the source of truth, with the regexes as a safety net.

> stack traces and DB error messages can themselves contain ePHI. We log only method + path (no query string) + stack. In production, ship these logs only to a BAA-covered provider and add redaction.
