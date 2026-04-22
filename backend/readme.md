# Bedflow Backend

Backend service for Bedflow, a financial planning platform that replaces Excel-based workflows with a real-time, interconnected system.

Bedflow enables organizations to create Plans where financial data such as expenses, revenue, and forecasts automatically propagate across financial statements, charts, and KPIs without manual spreadsheet configuration.

![Bedflow Login Screen](docs/screenshots/BedflowLoginScreen.png)

---

## Tech Stack

* Python 3.12-3.14
* Django
* PostgreSQL
* Redis
* Gunicorn, Uvicorn, Daphne
* Docker and Docker Compose
* uv (Python package manager)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd bedflow-backend
```

---

### 2. Configure environment variables

Create a `.env` file:

```env
DOMAIN=your-domain.com
DOCKER_EMAIL=your@email.com
COMPOSE_FILE=docker-compose.yaml
```

---

### 3. Install dependencies

```bash
make install
```

This initializes the project, pins the Python version, and installs dependencies.
This syncs dependencies from `pyproject.toml` and `uv.lock`.

---

### 4. Run the development server

```bash
make run
```

Application runs on:

```
http://127.0.0.1:9000
```

---

## Core Concepts

### Organization

Top-level container for users and financial data.

### Plan

A financial workspace where users define revenue, expenses, and projections, and view computed outputs such as financial statements and charts.

### Reactive System

Updating a single input automatically updates dependent outputs including income statement, cash flow, balance sheet, charts, and KPIs.

---

## Development Commands

### Run and Shell

```bash
make run            # run dev server
make shell          # python manage.py shell
make shell+         # python manage.py shell_plus
make uvicorn        # python -m uvicorn src.asgi:application --host 0.0.0.0 --port 9000
make daphne         # python -m daphne -b 0.0.0.0 -p 9000 src.asgi:application
make redis          # sudo service redis-server start
make check-redis    # sudo service redis-server status
make check-redis+   # python scripts/check_redis_port.py
make stop-redis     # sudo service redis-server status
```

---

### Database

```bash
make migrations         # python manage.py makemigrations
make migrate            # python manage.py migrate
make flush              # python manage.py flush
make drop-tables        # python manage.py delete_all_tables
make delete-migrations  # python manage.py delete_migration_files
```

---

### Admin

```bash
make superuser
```

---

### API Utilities

Extract all paths registered in the this django path.
```bash
make links      # python scripts/extract_swagger_links.py scripts/api.yaml -f simple
make links+     # python scripts/extract_swagger_links.py scripts/api.yaml
```

Creates api.yaml, looks something like this
```yaml
openapi: 3.0.3
info:
  title: bedflow API
  version: 1.0.0
  description: Backend API documentation for bedflow
paths:
  /api/v1/auth/join_waitlist/:
    post:
      operationId: api_v1_auth_join_waitlist_create
      description: |-
        Handles registration, onboarding, OTP flows, password management,
        2FA setup, and recovery code management.
      tags:
      - auth
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WaitList'
          application/xml:
            schema:
              $ref: '#/components/schemas/WaitList'
        required: true
      security:
      - jwtAuth: []
      - {}
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WaitList'
          description: ''
```          
---

### App Management

```bash
make add-app        # python scripts/create_django_app.py
```

---

## Async and Realtime

### Redis

```bash
make redis
make check-redis
make stop-redis
```

---

### WebSockets

```bash
make websocket
```

---

### ASGI Servers

```bash
make uvicorn
make daphne
make daphne+
```

---

## Docker and Deployment

### Start services

```bash
make up
```

---

### Enable HTTPS

```bash
make https
```

---

### Stop services

```bash
make down
```

---

### Rebuild containers

```bash
make rebuild
make rebuild-app
```

---

## Static Files

```bash
make collectstatic
make collectstatic_force
```

Docker:

```bash
make collectstatic+
```

---

## Debugging

```bash
make diff
make diff+
```

---

## Docker Inspection

```bash
make dockerness
```

---

## Notes

* Uses uv for dependency management
* Supports both WSGI and ASGI execution
* Docker-first deployment with HTTPS automation
