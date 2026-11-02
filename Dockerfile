# syntax=docker/dockerfile:1
FROM node:24.22.1-trixie-slim AS web-deps
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM web-deps AS web-dev
COPY frontend/ ./
EXPOSE 5174
CMD ["npm", "run", "dev"]

FROM web-dev AS web-build
RUN npm run build

FROM python:3.14.9-slim-trixie AS api-base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH
RUN python -m venv /opt/venv
COPY backend/requirements.txt /tmp/requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip pip install -r /tmp/requirements.txt
RUN useradd --create-home --uid 10001 atlas
WORKDIR /app

FROM api-base AS api-dev
COPY backend/requirements-dev.txt /tmp/requirements-dev.txt
RUN --mount=type=cache,target=/root/.cache/pip pip install -r /tmp/requirements-dev.txt
COPY --chown=atlas:atlas backend/ /app/
ENV ATLAS_BRAIN_DIR=/aios ATLAS_STATIC_DIR=/app/static
USER atlas
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app/app"]

FROM api-base AS runtime
COPY --chown=atlas:atlas backend/app /app/app
COPY --from=web-build --chown=atlas:atlas /web/dist /app/static
ENV ATLAS_BRAIN_DIR=/aios ATLAS_STATIC_DIR=/app/static
USER atlas
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
