"""Notes write proxy (D21) and its cross-site guard (D22).

Atlas forwards only a fixed list of Chalk endpoints, with bodies cut down to the allowed fields
(never `scene`, never `baseVersion`). Mutating routes require an allowed Origin and a JSON body.
"""

from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict

from app.library import ChalkUnavailable, call_chalk

DEFAULT_ORIGINS = (
    "http://localhost:8090,http://127.0.0.1:8090,http://localhost:5174,http://127.0.0.1:5174"
)


def parse_origins(raw: str) -> frozenset[str]:
    return frozenset(o.strip().rstrip("/").lower() for o in raw.split(",") if o.strip())


class _Name(BaseModel):
    model_config = ConfigDict(extra="ignore")  # unknown fields (scene, baseVersion, ...) are dropped
    name: str


class _NewBoard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str | None = None
    notebook: str | None = None
    section: str | None = None


def make_write_guard(origins: frozenset[str]):
    async def write_guard(request: Request) -> None:
        origin = (request.headers.get("origin") or "").rstrip("/").lower()
        if origin not in origins:
            raise_status(403, "Origin not allowed")
        if request.method in ("POST", "PUT"):
            ctype = request.headers.get("content-type", "").split(";")[0].strip().lower()
            if ctype != "application/json":
                raise_status(415, "Content-Type must be application/json")

    return write_guard


def raise_status(status: int, detail: str) -> None:
    raise HTTPException(status_code=status, detail=detail)


def _q(part: str) -> str:
    return quote(part, safe="")


def _strip_scene(body: Any) -> Any:
    if isinstance(body, dict):
        return {k: v for k, v in body.items() if k != "scene"}
    return body


def build_router(chalk_api_url: str, origins: frozenset[str]) -> APIRouter:
    router = APIRouter(prefix="/api/notes", dependencies=[Depends(make_write_guard(origins))])

    def forward(method: str, path: str, body: Any = None, strip: bool = False) -> Response:
        try:
            res = call_chalk(chalk_api_url, method, path, body)
        except ChalkUnavailable as exc:
            return JSONResponse({"detail": str(exc)}, status_code=502)
        if res.status == 204 or res.body is None:
            return Response(status_code=res.status)
        return JSONResponse(_strip_scene(res.body) if strip else res.body, status_code=res.status)

    @router.post("/notebooks")
    def create_notebook(body: _Name) -> Response:
        return forward("POST", "/api/notebooks", {"name": body.name})

    @router.put("/notebooks/{nb}")
    def rename_notebook(nb: str, body: _Name) -> Response:
        return forward("PUT", f"/api/notebooks/{_q(nb)}", {"name": body.name})

    @router.delete("/notebooks/{nb}")
    def delete_notebook(nb: str) -> Response:
        return forward("DELETE", f"/api/notebooks/{_q(nb)}")

    @router.post("/notebooks/{nb}/sections")
    def create_section(nb: str, body: _Name) -> Response:
        return forward("POST", f"/api/notebooks/{_q(nb)}/sections", {"name": body.name})

    @router.put("/notebooks/{nb}/sections/{sec}")
    def rename_section(nb: str, sec: str, body: _Name) -> Response:
        return forward("PUT", f"/api/notebooks/{_q(nb)}/sections/{_q(sec)}", {"name": body.name})

    @router.delete("/notebooks/{nb}/sections/{sec}")
    def delete_section(nb: str, sec: str) -> Response:
        return forward("DELETE", f"/api/notebooks/{_q(nb)}/sections/{_q(sec)}")

    @router.post("/boards")
    def create_board(body: _NewBoard) -> Response:
        return forward("POST", "/api/boards", body.model_dump(exclude_none=True), strip=True)

    @router.put("/boards/{board_id}")
    def rename_board(board_id: str, body: _Name) -> Response:
        return forward("PUT", f"/api/boards/{_q(board_id)}", {"name": body.name}, strip=True)

    @router.delete("/boards/{board_id}")
    def delete_board(board_id: str) -> Response:
        return forward("DELETE", f"/api/boards/{_q(board_id)}")

    return router
