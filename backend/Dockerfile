FROM python:3.14-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# system deps
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    git \
    && apt-get clean

# install uv
RUN pip install uv

# copy dependency files first (for caching)
COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-dev

# add venv to PATH
ENV PATH="/app/.venv/bin:$PATH"

# copy app
COPY . .

RUN python manage.py collectstatic --noinput || true

EXPOSE 6000

CMD ["gunicorn", "src.wsgi:application", "--bind", "0.0.0.0:6000"]