"""Server-side proxy to Chalk's GET /api/library (the browser never calls Chalk's API via Atlas directly)."""

import json
import urllib.error
import urllib.request
from typing import Any

TIMEOUT_S = 3.0


class ChalkUnavailable(Exception):
    pass


def fetch_library(chalk_api_url: str) -> Any:
    url = chalk_api_url.rstrip("/") + "/api/library"
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_S) as resp:  # noqa: S310 - url is operator config
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, ValueError) as exc:
        raise ChalkUnavailable(f"Chalk isn't reachable at {chalk_api_url} ({type(exc).__name__})") from exc


class ChalkResponse:
    def __init__(self, status: int, body: Any):
        self.status = status
        self.body = body


def call_chalk(chalk_api_url: str, method: str, path: str, body: Any = None) -> ChalkResponse:
    """Calls one Chalk endpoint. Chalk's own HTTP errors come back as a ChalkResponse (status + JSON body),
    only an unreachable Chalk raises ChalkUnavailable. `path` must already be URL-encoded."""
    url = chalk_api_url.rstrip("/") + path
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)  # noqa: S310 - url is operator config
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:  # noqa: S310
            return ChalkResponse(resp.status, _parse(resp.read()))
    except urllib.error.HTTPError as exc:
        return ChalkResponse(exc.code, _parse(exc.read()))
    except (urllib.error.URLError, OSError, ValueError) as exc:
        raise ChalkUnavailable(f"Chalk isn't reachable at {chalk_api_url} ({type(exc).__name__})") from exc


def _parse(raw: bytes) -> Any:
    if not raw:
        return None
    try:
        return json.loads(raw.decode("utf-8"))
    except ValueError:
        return {"detail": raw.decode("utf-8", "replace")[:200]}
