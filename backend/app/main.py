"""Atlas app factory: API routes, /api 404 catch-all, cache headers and the SPA mount with history fallback."""

import os

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse

from app.brain import Brain, TooLarge
from app.library import ChalkUnavailable, fetch_library


def create_app(
    brain_dir: str | None = None,
    static_dir: str | None = None,
    chalk_api_url: str | None = None,
    chalk_public_url: str | None = None,
    brain_label: str | None = None,
) -> FastAPI:
    brain_dir = brain_dir if brain_dir is not None else os.environ.get("ATLAS_BRAIN_DIR", "/aios")
    static_dir = static_dir if static_dir is not None else os.environ.get("ATLAS_STATIC_DIR", "/app/static")
    chalk_api_url = chalk_api_url or os.environ.get("CHALK_API_URL", "http://host.docker.internal:8080")
    chalk_public_url = chalk_public_url or os.environ.get("CHALK_PUBLIC_URL", "http://localhost:8080")
    brain_label = brain_label or os.environ.get("ATLAS_BRAIN_LABEL") or brain_dir

    app = FastAPI(title="Atlas", version="0.1.0")
    brain = Brain(brain_dir)

    @app.get("/api/health")
    def health() -> dict:
        return {"status": "ok"}

    @app.get("/api/config")
    def config() -> dict:
        return {"chalkPublicUrl": chalk_public_url, "brainLabel": brain_label}

    @app.get("/api/atlas/tree")
    def tree() -> dict:
        return brain.tree()

    @app.get("/api/atlas/file")
    def file(path: str = Query(...)) -> dict:
        try:
            result = brain.file(path)
        except TooLarge:
            raise HTTPException(status_code=413, detail="File too large to preview")
        if result is None:
            raise HTTPException(status_code=404, detail="Not found")
        return result

    @app.get("/api/atlas/recent")
    def recent(limit: int = Query(8, ge=1, le=100)) -> list:
        return brain.recent(limit)

    @app.get("/api/notes/library")
    def library() -> JSONResponse:
        try:
            return JSONResponse(fetch_library(chalk_api_url))
        except ChalkUnavailable as exc:
            return JSONResponse({"detail": str(exc)}, status_code=502)

    @app.api_route(
        "/api/{rest:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
        include_in_schema=False,
    )
    def api_not_found(rest: str) -> None:
        raise HTTPException(status_code=404, detail="Not found")

    @app.middleware("http")
    async def cache_headers(request: Request, call_next):
        """Never cache HTML; cache hashed assets forever."""
        response = await call_next(request)
        path = request.url.path
        if not path.startswith("/api"):
            if response.headers.get("content-type", "").startswith("text/html"):
                response.headers["Cache-Control"] = "no-cache"
            elif path.startswith("/assets/"):
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response

    if static_dir and os.path.isdir(static_dir) and os.listdir(static_dir):
        static_root = os.path.realpath(static_dir)
        index = os.path.join(static_root, "index.html")

        @app.get("/{full_path:path}", include_in_schema=False)
        def spa(full_path: str) -> FileResponse:
            """Real files (assets, favicon) are served as-is; every other path is a client route -> index.html."""
            if full_path:
                candidate = os.path.realpath(os.path.join(static_root, full_path))
                if candidate.startswith(static_root + os.sep) and os.path.isfile(candidate):
                    return FileResponse(candidate)
            return FileResponse(index)

    return app


app = create_app()
