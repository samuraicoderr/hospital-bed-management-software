# BedFlow Backend TODO (Production-Grade Gap List)

## Priority Key
- [ ] P0 = Blocker for production release
- [ ] P1 = Required for production hardening
- [ ] P2 = Important optimization / phase-after-release

## P0 - Critical Blockers

### 1) Fix runtime/API breakages
- [ ] P0 Fix missing import `Q` in `src/admissions/views.py` (`TransferViewSet.get_queryset` uses `Q`).
- [ ] P0 Fix missing import `transaction` in `src/discharges/views.py` (`approve` action uses `transaction.atomic`).
- [ ] P0 Implement `AdmissionService.suggest_beds_for_request(...)` (called by `suggest_beds` action but not implemented).
- [ ] P0 Add robust error handling around `Hospital.objects.get(...)` in dashboard endpoints (avoid 500s on invalid IDs).

### 2) Complete unimplemented backend apps exposed in requirements
- [ ] P0 Implement `src/integrations/views.py` (currently placeholder) with secured endpoints for:
	- integration endpoint CRUD + connectivity tests
	- inbound HL7/FHIR/webhook ingestion
	- message replay/retry/dead-letter handling
- [ ] P0 Implement `src/audit/views.py` (currently placeholder) with audit query/export APIs and role restrictions.
- [ ] P0 Implement `src/realtime/views.py` (currently placeholder) for presence/subscription management and event replay.
- [ ] P0 Add routers/urls for integrations/audit/realtime and mount them in `src/urls.py`.

### 3) Security defaults and tenant isolation
- [ ] P0 Change DRF default permission from `AllowAny` to authenticated/verified baseline in `src/config/settings/drf_settings.py`.
- [ ] P0 Remove hardcoded JWT signing key fallback; require secure env secret in non-dev.
- [ ] P0 Enforce hospital/org tenancy checks on all domain viewsets (not just query filtering by query param).
- [ ] P0 Add object-level authorization for role-specific actions (bed manager, nurse supervisor, housekeeping, executive).
- [ ] P0 Ensure all write endpoints validate that actor belongs to target hospital/department.

### 4) Functional placeholders that are currently non-production
- [ ] P0 Replace dashboard ALOS placeholder (`Avg(admitted_at)`) with true length-of-stay computation.
- [ ] P0 Implement report generation pipeline (PDF/CSV creation), currently stubbed in `reports` views.
- [ ] P0 Implement report file download serving with access control and signed/expiring links.
- [ ] P0 Implement scheduled report execution + email delivery pipeline (Celery beat tasks).

## P1 - Required Functional Completeness (Per requirements.md)

### 5) Bed/Admission/Transfer consistency hardening
- [ ] P1 Add DB-level protections against double-assignment (partial unique constraints/indexes for active bed occupancy).
- [ ] P1 Standardize status transitions through service layer only (avoid direct model writes bypassing transition validation).
- [ ] P1 Enforce consistent creation of `BedStatusHistory` on every status change path.
- [ ] P1 Add idempotency controls for admission/transfer/discharge actions (retry-safe APIs).
- [ ] P1 Add optimistic/pessimistic concurrency controls to all critical state transitions.

### 6) Discharge and housekeeping SLA workflow
- [ ] P1 Schedule periodic overdue-task scans (`HousekeepingService.check_overdue_tasks`) via Celery beat.
- [ ] P1 Add escalation routing policy (who is escalated, when, and via which channel).
- [ ] P1 Add quality-check workflow enforcement before bed becomes available (configurable per hospital).
- [ ] P1 Add audit coverage for all housekeeping state changes and assignment changes.

### 7) Alerts and notifications (multi-channel)
- [ ] P1 Implement actual SMS/email dispatch for alerts (currently mostly notification log entries).
- [ ] P1 Apply user alert preferences (quiet hours, channels, severity thresholds) during dispatch.
- [ ] P1 Add dedup/suppression strategy for noisy alerts.
- [ ] P1 Add retry and delivery status tracking for failed alert notifications.
- [ ] P1 Clean notification domain language (remove non-hospital legacy “loan/investment” content/categories).

### 8) Realtime update requirement (<2s)
- [ ] P1 Emit domain events (bed status, admission queue, cleaning updates, transfer/discharge updates) to channels.
- [ ] P1 Implement event fan-out strategy by hospital/department/user groups.
- [ ] P1 Add websocket authz checks for hospital scope.
- [ ] P1 Add replay/recovery for missed events using `RealtimeEvent` store.

### 9) Integrations (FHIR/HL7/ADT/webhooks)
- [ ] P1 Implement adapter/service layer (not just models) for FHIR and HL7 message parsing + mapping.
- [ ] P1 Add inbound signature verification and replay protection for webhooks.
- [ ] P1 Add outbound webhook delivery worker with retries/backoff.
- [ ] P1 Add integration observability: per-endpoint latency, success/failure rates, retry counts.

### 10) Compliance + data governance
- [ ] P1 Implement field-level PHI encryption at rest for sensitive patient/admission fields.
- [ ] P1 Ensure audit log immutability controls (append-only constraints/process controls).
- [ ] P1 Implement retention jobs (operational data, audit logs, backup retention windows).
- [ ] P1 Implement GDPR/HIPAA workflows where applicable (data export, access logs, deletion/anonymization policy).

## P1 - Testing and Quality Gates

### 11) Automated test coverage (currently mostly missing in core apps)
- [ ] P1 Build unit tests for: beds, admissions, discharges, housekeeping, organizations, patients, alerts, dashboard, reports, integrations.
- [ ] P1 Build integration tests for full patient flow:
	- admission request -> assignment -> admit -> transfer/discharge -> cleaning -> bed available
- [ ] P1 Add race-condition tests for concurrent bed assignment/transfer/discharge.
- [ ] P1 Add websocket tests for real-time notifications/events.
- [ ] P1 Add API permission tests for all role types.
- [ ] P1 Reach >=80% backend test coverage and enforce in CI.

### 12) Static and dynamic quality checks
- [ ] P1 Add lint/type/format checks in CI.
- [ ] P1 Add migration sanity checks in CI (`makemigrations --check`, migration apply test).
- [ ] P1 Add security checks (dependency audit, Django security checks, secret scanning).

## P1 - Ops, Reliability, and Performance

### 13) Performance targets and scalability
- [ ] P1 Add benchmark/load tests for 95p API latency and concurrency goals.
- [ ] P1 Add targeted query optimization and caching for dashboard/statistics endpoints.
- [ ] P1 Add pagination guards and max limits on heavy list endpoints.
- [ ] P1 Add read-replica strategy and DB connection pool tuning guidance.

### 14) Availability/DR/runbooks
- [ ] P1 Implement backup/restore automation and periodic restore verification.
- [ ] P1 Document and test RTO/RPO procedures.
- [ ] P1 Add failure-mode runbooks (Redis down, DB failover, integration outage, queue backlog).

### 15) Observability and SRE baseline
- [ ] P1 Add domain metrics: allocation time, cleaning SLA breaches, admission wait time, occupancy trends.
- [ ] P1 Add tracing/correlation IDs across API, Celery, and websocket events.
- [ ] P1 Add structured logs for state transitions and integration events.
- [ ] P1 Add alerting rules for error spikes, queue backlog, and websocket disconnect rates.

## P2 - Architecture/Refinement

### 16) Align implementation with internal architectural conventions
- [ ] P2 Migrate remaining boilerplate ViewSets to `ViewSetHelperMixin` + action-based serializer/permission maps.
- [ ] P2 Move residual business logic from views/models into explicit `services.py` use-cases.
- [ ] P2 Standardize exception taxonomy and API error contracts across apps.

### 17) Delivery and deployment maturity
- [ ] P2 Add CI/CD release workflows for blue-green/canary deployment strategy.
- [ ] P2 Add feature-flag framework for high-risk workflow rollouts.
- [ ] P2 Add Kubernetes deployment manifests/helm overlays matching production requirements.

## Definition Of Done For Backend Production Readiness
- [ ] All P0 items complete and verified in staging.
- [ ] All P1 items complete or explicitly accepted as deferred with documented risk.
- [ ] End-to-end tests for core workflows pass.
- [ ] Security/compliance review passes.
- [ ] Load/performance and DR drills pass agreed thresholds.
