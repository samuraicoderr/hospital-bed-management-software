# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hospital Bed Management System (HBMS) built with Django. It is a real-time, secure platform for managing hospital bed allocation, patient admissions/discharges, housekeeping coordination, and reporting.

**Note**: The user mentioned the following apps are boilerplate and not yet worth checking: admission, alerts, audit, beds, dashboard, discharges, housekeeping, integrations, organizations, patients, realtime, reports. Reference the `users` and `notifications` apps to understand patterns.

## Architecture

### Directory Structure

```
backend/
├── src/                          # All Django apps live here
│   ├── users/                    # Reference for patterns (auth, MFA, onboarding)
│   ├── notifications/            # Reference for patterns (email, WebSocket)
│   ├── common/                   # Shared utilities, base models
│   ├── config/settings/          # Modular settings split by concern
│   ├── lib/                      # Custom utilities
│   │   ├── clients/              # External API clients
│   │   ├── django/               # Django extensions (mixins, routing tools)
│   │   └── utils/                # General utilities (uuid7)
│   └── <new-apps>/               # New apps go here
├── scripts/                      # Helper scripts (create apps, API extractors)
├── makefiles/                    # Modular Makefile includes
├── Makefile                      # Development commands
├── pyproject.toml               # Dependencies managed with uv
└── uv.lock                      # Locked dependency versions
```


### Core Patterns

#### 1. UUID7 Everywhere

All models must use UUID7 for primary keys:

```python
from src.lib.utils.uuid7 import uuid7

class MyModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid7, editable=False)
```

#### 2. ViewSet Pattern with ViewSetHelperMixin

Views use `ViewSetHelperMixin` from `src.lib.django.views_mixin` for clean serializer/permission management. Define `serializers` and `permissions` dicts mapping action names to classes.

#### 3. URL Routing with Super Lazy Router

URLs use `super_lazy_path` from `src.lib.django.superlazyroutertools` for automatic Swagger tagging.

#### 4. Service Layer Pattern

Business logic lives in `services.py` files, not views.

#### 5. Notification Pattern

Use `NotifyUser` class for emails, `in_app_notify` for WebSocket notifications.

#### 6. Onboarding Flow

State machine with signed tokens. Use `transaction.atomic()` + `select_for_update()`.

#### 7. OTP Pattern

PBKDF2 hashed with rate limiting via `UserService`.

## Common Commands

```bash
# Development
cd backend && make run           # Dev server (port 9000)
make uvicorn                     # Uvicorn ASGI
make daphne                      # Daphne ASGI
make redis                       # Start Redis

# Database
make migrations / make migrate   # DB operations
make drop-tables                 # Delete tables

# Testing
uv run python manage.py test     # All tests
uv run python manage.py test src.users.tests.MFAFlowTests

# Utilities
make new-app                     # Create app via script
make links                       # API endpoints
make shell+                      # shell_plus
make randomkeys                  # Generate secrets
```

## Key Reference Files

### Users (`src/users/`)
- `models.py` - User model, MFA, OnboardingMixin
- `views/views_auth.py` - ViewSet with actions
- `services.py` - UserService
- `permissions.py` - IsVerifiedUser

### Notifications (`src/notifications/`)
- `Notifier.py` - NotifyUser, in_app_notify
- `consumers.py` - WebSocket consumer with JWT auth

### Lib (`src/lib/`)
- `views_mixin.py` - ViewSetHelperMixin
- `superlazyroutertools.py` - URL routing
- `utils/uuid7.py` - UUID7

## Settings & Security

- Modular settings in `src/config/settings/`
- OTPs: PBKDF2 hashed, rate limited (3/min)
- MFA: TOTP, SMS, Email, WebAuthn, Push
- Auto-admin: `admin_*` methods → IsVerifiedAdminUser

## Dependencies

- uv (not pip), Python 3.12-3.14
- PostgreSQL, Redis
- ASGI: Daphne, Uvicorn

Use `uv sync` from `uv.lock`.
